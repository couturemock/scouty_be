import { AdClusterScore } from '../integrations/ads/ad-score';
import { computeImpulseSignal, ImpulseSignal } from './impulse-filter';
import { Product } from './product.entity';
import {
  hasAnySupplier,
  hasViableSupplier,
  liveSuppliers,
} from './supplier-signals';

/**
 * Drop Sniper Score 0–100:
 * 20% Amazon momentum (7d + 30d)
 * 15% Amazon demand
 * 28% Ad Score (0 if no live ads) — ads are the primary discovery radar
 * 12% AliExpress / Alibaba market signal
 * 12% supplier + margin (sourceability itself is a hard board-inclusion gate,
 *     see hasAnySupplier — this weight is about margin quality, not presence)
 * 3% competition
 * 10% impulse-product quality read (informational signal, see impulse-filter.ts)
 * + agreement bonus 0–10 when independent sources agree
 */

export { hasAnySupplier, hasViableSupplier, liveSuppliers };

export type AeMarketSignal = {
  total: number;
  maxSold: number;
  liveCount: number;
  kind: 'estimated' | 'unavailable';
};

export type ProductTier =
  | 'early_winner'
  | 'proven_winner'
  | 'saturated'
  | 'unclassified';

export type DropSniperBreakdown = {
  total: number;
  momentum: number;
  demand: number;
  supplier: number;
  competition: number;
  ads: number;
  aliexpress: number;
  amazon: number;
  agreement: number;
  impulse: number;
  viable: boolean;
  sourceable: boolean;
  liveSupplierCount: number;
  tier: ProductTier;
  tierReasons: string[];
  badges: { amazon: boolean; ads: boolean; aliexpress: boolean };
  impulseSignal: ImpulseSignal;
  /** @deprecated use ads; kept for older snapshots */
  crossBonus: number;
};

const AD_STRONG = 40;
const AE_STRONG = 35;
const AMAZON_STRONG_DEMAND = 35;
const AMAZON_STRONG_MOMENTUM = 30;

/**
 * Tier-classification thresholds — calibrated against a real draft ingest
 * (2026-W39, ES). One data-availability finding from that run: PipiAds
 * essentially never returns an advertiser/brand name for TikTok ads here,
 * so `computeAdClusterScore`'s `advertiserCount` floors to 1 for nearly
 * every real cluster — gating early_winner on `advertiserCount >= 2` alone
 * made the tier unreachable for any Ad-Winners-sourced product. `hasBreadth()`
 * below falls back to creative-count (distinct ad clips found) as a weaker
 * substitute signal when advertiser identity isn't available.
 */
const EARLY_WINNER_ADS_MIN = AD_STRONG;
const EARLY_WINNER_ADVERTISERS_MIN = 2;
const EARLY_WINNER_CREATIVE_FALLBACK_MIN = 3;
const PROVEN_WINNER_ADVERTISERS_MIN = 3;
const PROVEN_WINNER_CREATIVE_FALLBACK_MIN = 5;
const SATURATED_ADVERTISERS_MIN = 6;
const SATURATED_DURATION_MIN = 70;
const SATURATED_REVIEWS_MIN = 5000;

function hasBreadth(cluster: AdClusterScore | undefined, advertiserMin: number, creativeFallbackMin: number) {
  const advertiserCount = cluster?.advertiserCount ?? 0;
  if (advertiserCount >= advertiserMin) return true;
  // No real advertiser-name data (advertiserCount stuck at the ≤1 fallback) —
  // use creative-count as a weaker "breadth" proxy instead of blocking the
  // tier outright.
  if (advertiserCount <= 1) {
    return (cluster?.creativeCount ?? 0) >= creativeFallbackMin;
  }
  return false;
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function keepaRaw(p: Product): Record<string, unknown> {
  return (p.meta?.keepa as Record<string, unknown> | undefined) ?? {};
}

function numMeta(p: Product, key: string): number {
  const n = Number(keepaRaw(p)[key]);
  return Number.isFinite(n) ? n : 0;
}

function adClusterMeta(p: Product): AdClusterScore | undefined {
  return p.meta?.adScore as AdClusterScore | undefined;
}

function growth7(p: Product): number {
  return Number(keepaRaw(p).growthPct7 ?? 0) || 0;
}

function growth30(p: Product): number {
  const fromMeta = Number(keepaRaw(p).growthPct30 ?? 0);
  if (fromMeta) return fromMeta;
  return Number(p.growthPct ?? 0) || 0;
}

function scoreMomentum(p: Product): number {
  const g7 = Math.max(0, growth7(p));
  const g30 = Math.max(0, growth30(p));
  const drops30 = numMeta(p, 'salesRankDrops30');
  const growthPart = clamp(g7 * 0.55 + g30 * 0.35);
  const dropsPart = clamp(Math.log10(drops30 + 1) * 35);
  return clamp(growthPart * 0.7 + dropsPart * 0.3);
}

function scoreDemand(p: Product): number {
  const sales = Number(p.estimatedSales ?? 0);
  const bsr = p.currentRank ?? 999999;
  const salesPart = clamp(Math.log10(sales + 1) * 28);
  const bsrPart = clamp(100 - Math.log10(bsr + 1) * 14);
  return clamp(salesPart * 0.55 + bsrPart * 0.45);
}

function scoreSupplier(p: Product): number {
  const live = liveSuppliers(p);
  if (!live.length) return 0;
  const margin = Number(p.estimatedMarginPct ?? 0);
  const marginPart = clamp(margin * 1.4);
  const countPart = clamp(live.length * 18);
  const moqPenalty = live.some((s) => s.moq != null && s.moq > 100) ? 8 : 0;
  return clamp(marginPart * 0.7 + countPart * 0.3 - moqPenalty);
}

function scoreCompetition(p: Product): number {
  const rating = Number(p.rating ?? 0);
  const reviews = Number(p.reviewCount ?? 0);
  const ratingPart = clamp(rating * 18);
  let reviewPart = 50;
  if (reviews < 50) reviewPart = 75;
  else if (reviews < 500) reviewPart = 85;
  else if (reviews < 5000) reviewPart = 55;
  else reviewPart = 25;
  return clamp(ratingPart * 0.4 + reviewPart * 0.6);
}

export function computeAliExpressMarketSignal(p: Product): AeMarketSignal {
  const offers = liveSuppliers(p);
  if (!offers.length) {
    return { total: 0, maxSold: 0, liveCount: 0, kind: 'unavailable' };
  }
  let maxSold = 0;
  let withSold = 0;
  for (const o of offers) {
    const sold = Number(o.soldCount ?? o.popularity ?? 0);
    if (sold > 0) {
      withSold += 1;
      if (sold > maxSold) maxSold = sold;
    }
  }
  const soldPart = clamp(Math.log10(maxSold + 1) * 28);
  const countPart = clamp(offers.length * 16);
  const total = clamp(soldPart * 0.7 + countPart * 0.3);
  return {
    total: Number(total.toFixed(2)),
    maxSold,
    liveCount: offers.length,
    kind: withSold > 0 ? 'estimated' : 'unavailable',
  };
}

function productAdScore(p: Product): number {
  const ci = p.meta?.creativeIntelligence as
    | { provider?: string; ads?: unknown[] }
    | undefined;
  if (ci?.provider === 'fixture') return 0;
  const stored = p.meta?.adScore as AdClusterScore | undefined;
  const n = Number(stored?.total ?? 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function agreementBonus(
  amazonStrong: boolean,
  ads: number,
  ae: number,
): number {
  const adsStrong = ads >= AD_STRONG;
  const aeStrong = ae >= AE_STRONG;
  if (amazonStrong && adsStrong && aeStrong) return 10;
  if (amazonStrong && adsStrong) return 5;
  if (amazonStrong && aeStrong) return 4;
  return 0;
}

/**
 * TRENDING: 7d and/or 30d growth — not necessarily top demand. Pure Amazon
 * momentum signal; no live supplier required (that's an opportunity-board
 * concern, not a "is this trending" one — gating on it here starved
 * categories whenever AliExpress/Alibaba quota ran out mid-ingest).
 */
export function isTrendingCandidate(p: Product, sniper: DropSniperBreakdown) {
  const g7 = growth7(p);
  const g30 = growth30(p);
  return sniper.momentum >= 25 || g7 >= 10 || g30 >= 8;
}

/** WINNERS: high demand sustained (90d drops / monthly sold), not a 7d spike. */
export function isWinnerCandidate(p: Product, sniper: DropSniperBreakdown) {
  const sales = Number(p.estimatedSales ?? 0);
  const drops90 = numMeta(p, 'salesRankDrops90');
  const sustained = sales >= 50 || drops90 >= 20 || sniper.demand >= 55;
  return sniper.demand >= 40 && sustained;
}

export function sourceBadges(sniper: DropSniperBreakdown): {
  amazon: boolean;
  ads: boolean;
  aliexpress: boolean;
} {
  return {
    amazon: sniper.amazon >= 30 || sniper.demand >= 25,
    ads: sniper.ads >= 28,
    aliexpress: sniper.aliexpress >= 25 && sniper.aliexpress > 0,
  };
}

/**
 * Product lifecycle tier — Early Winner (ads-strong, Amazon can be absent),
 * Proven Winner (ads + confirmed Amazon demand), Saturated (huge ad/Amazon
 * presence — deprioritized in sort order + labeled, never hard-excluded).
 * Thresholds are a first pass; need calibration against a real draft ingest.
 */
export function computeProductTier(
  p: Product,
  sniper: Pick<DropSniperBreakdown, 'ads' | 'demand'>,
): { tier: ProductTier; reasons: string[] } {
  const cluster = adClusterMeta(p);
  const advertiserCount = cluster?.advertiserCount ?? 0;
  const duration = cluster?.duration ?? 0;
  const reviews = Number(p.reviewCount ?? 0);
  const sourceable = hasAnySupplier(p);

  const saturated =
    advertiserCount >= SATURATED_ADVERTISERS_MIN &&
    duration >= SATURATED_DURATION_MIN &&
    reviews >= SATURATED_REVIEWS_MIN;
  if (saturated) {
    return {
      tier: 'saturated',
      reasons: [
        `${advertiserCount} anunciantes independientes, anuncios de larga duración y ${reviews} reseñas en Amazon: mercado ya consolidado.`,
      ],
    };
  }

  const adsStrong = sniper.ads >= EARLY_WINNER_ADS_MIN;
  const multiAdvertiser = hasBreadth(
    cluster,
    EARLY_WINNER_ADVERTISERS_MIN,
    EARLY_WINNER_CREATIVE_FALLBACK_MIN,
  );
  if (adsStrong && multiAdvertiser && sourceable) {
    const fullSniper = sniper as DropSniperBreakdown;
    const proven =
      hasBreadth(cluster, PROVEN_WINNER_ADVERTISERS_MIN, PROVEN_WINNER_CREATIVE_FALLBACK_MIN) &&
      isWinnerCandidate(p, fullSniper);
    if (proven) {
      return {
        tier: 'proven_winner',
        reasons: [
          `${advertiserCount} anunciantes independientes en anuncios + demanda sostenida confirmada en Amazon.`,
        ],
      };
    }
    return {
      tier: 'early_winner',
      reasons: [
        `Aparece en ${advertiserCount} anunciantes independientes de TikTok/Meta con proveedor disponible${
          p.currentRank ? '' : ' y todavía sin presencia en Amazon'
        }.`,
      ],
    };
  }

  return { tier: 'unclassified', reasons: [] };
}

export function computeDropSniperScore(p: Product): DropSniperBreakdown {
  const liveSupplierCount = liveSuppliers(p).length;
  const viable = hasViableSupplier(p);
  const sourceable = hasAnySupplier(p);
  const momentum = scoreMomentum(p);
  const demand = scoreDemand(p);
  const supplier = scoreSupplier(p);
  const competition = scoreCompetition(p);
  const ads = productAdScore(p);
  const aeSignal = computeAliExpressMarketSignal(p);
  const aliexpress = aeSignal.total;
  const impulseSignal = computeImpulseSignal(p);
  const impulse = impulseSignal.score;
  const amazon = clamp(momentum * 0.56 + demand * 0.44);
  const amazonStrong =
    demand >= AMAZON_STRONG_DEMAND || momentum >= AMAZON_STRONG_MOMENTUM;
  const agreement = agreementBonus(amazonStrong, ads, aliexpress);

  // `viable` (real proveedor live + margin) solo importa para margen/beneficio.
  // `sourceable` (cualquier proveedor live) es un requisito duro para TODOS los
  // tableros a nivel de products.service.ts — acá solo se reporta, no se gatea.
  const weighted =
    momentum * 0.2 +
    demand * 0.15 +
    ads * 0.28 +
    aliexpress * 0.12 +
    supplier * 0.12 +
    competition * 0.03 +
    impulse * 0.1 +
    agreement;

  const breakdown: DropSniperBreakdown = {
    total: Number(clamp(weighted).toFixed(2)),
    momentum: Number(momentum.toFixed(2)),
    demand: Number(demand.toFixed(2)),
    supplier: Number(supplier.toFixed(2)),
    competition: Number(competition.toFixed(2)),
    ads: Number(ads.toFixed(2)),
    aliexpress: Number(aliexpress.toFixed(2)),
    amazon: Number(amazon.toFixed(2)),
    agreement,
    impulse: Number(impulse.toFixed(2)),
    viable,
    sourceable,
    liveSupplierCount,
    tier: 'unclassified',
    tierReasons: [],
    badges: { amazon: false, ads: false, aliexpress: false },
    impulseSignal,
    crossBonus: Number(ads.toFixed(2)),
  };

  breakdown.badges = sourceBadges(breakdown);
  const tierResult = computeProductTier(p, breakdown);
  breakdown.tier = tierResult.tier;
  breakdown.tierReasons = tierResult.reasons;

  return breakdown;
}

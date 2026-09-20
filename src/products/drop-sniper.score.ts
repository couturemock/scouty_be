import { AdClusterScore } from '../integrations/ads/ad-score';
import { SupplierOffer } from '../integrations/types';
import { Product } from './product.entity';

/**
 * Drop Sniper Score 0–100:
 * 25% Amazon momentum (7d + 30d)
 * 20% Amazon demand
 * 20% Ad Score (0 if no live ads)
 * 10% AliExpress / Alibaba market signal
 * 20% supplier + margin
 * 5% competition
 * + agreement bonus 0–10 when independent sources agree
 */

export type AeMarketSignal = {
  total: number;
  maxSold: number;
  liveCount: number;
  kind: 'estimated' | 'unavailable';
};

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
  viable: boolean;
  liveSupplierCount: number;
  /** @deprecated use ads; kept for older snapshots */
  crossBonus: number;
};

const AD_STRONG = 40;
const AE_STRONG = 35;
const AMAZON_STRONG_DEMAND = 35;
const AMAZON_STRONG_MOMENTUM = 30;

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function liveSuppliers(p: Product): SupplierOffer[] {
  const list = (p.meta?.suppliers as SupplierOffer[] | undefined) ?? [];
  return list.filter((s) => s.kind === 'live' && s.unitPriceEur != null);
}

function keepaRaw(p: Product): Record<string, unknown> {
  return (p.meta?.keepa as Record<string, unknown> | undefined) ?? {};
}

function numMeta(p: Product, key: string): number {
  const n = Number(keepaRaw(p)[key]);
  return Number.isFinite(n) ? n : 0;
}

/** Min margin % and at least one live offer to enter opportunity boards. */
export function hasViableSupplier(
  p: Product,
  minMarginPct = 8,
): boolean {
  const live = liveSuppliers(p);
  if (!live.length) return false;
  const salePrice = Number(p.currentPrice ?? 0);
  if (!(salePrice > 0)) return true;
  const margin = Number(p.estimatedMarginPct ?? 0);
  return Number.isFinite(margin) && margin >= minMarginPct;
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

export function computeDropSniperScore(p: Product): DropSniperBreakdown {
  const liveSupplierCount = liveSuppliers(p).length;
  const viable = hasViableSupplier(p);
  const momentum = scoreMomentum(p);
  const demand = scoreDemand(p);
  const supplier = scoreSupplier(p);
  const competition = scoreCompetition(p);
  const ads = productAdScore(p);
  const aeSignal = computeAliExpressMarketSignal(p);
  const aliexpress = aeSignal.total;
  const amazon = clamp(momentum * 0.56 + demand * 0.44);
  const amazonStrong =
    demand >= AMAZON_STRONG_DEMAND || momentum >= AMAZON_STRONG_MOMENTUM;
  const agreement = agreementBonus(amazonStrong, ads, aliexpress);

  // `viable` (real proveedor live) solo importa para margen/beneficio — un
  // producto sin proveedor confirmado todavía puede ser trending/winner por
  // señal Amazon pura. supplier/aliexpress ya salen en 0 sin oferta live.
  const weighted =
    momentum * 0.25 +
    demand * 0.2 +
    ads * 0.2 +
    aliexpress * 0.1 +
    supplier * 0.2 +
    competition * 0.05 +
    agreement;

  return {
    total: Number(clamp(weighted).toFixed(2)),
    momentum: Number(momentum.toFixed(2)),
    demand: Number(demand.toFixed(2)),
    supplier: Number(supplier.toFixed(2)),
    competition: Number(competition.toFixed(2)),
    ads: Number(ads.toFixed(2)),
    aliexpress: Number(aliexpress.toFixed(2)),
    amazon: Number(amazon.toFixed(2)),
    agreement,
    viable,
    liveSupplierCount,
    crossBonus: Number(ads.toFixed(2)),
  };
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

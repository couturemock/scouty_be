import { SupplierOffer } from '../integrations/types';
import { liveSuppliers } from '../products/supplier-signals';
import { Product } from '../products/product.entity';

/**
 * Ads-first product signals persisted on `product.meta.discovery` — enough to
 * recompute the Trend Score at ranking time without calling PipiAds again.
 */
export type DiscoveryMeta = {
  version: 1;
  adCount: number;
  stores: string[];
  advertisers: string[];
  platforms: string[];
  firstSeenAt: number | null;
  lastSeenAt: number | null;
  maxPutDays: number;
  plays: number;
  likes: number;
  comments: number;
  shares: number;
  aiTags: string[];
  seeds: string[];
  passes: string[];
  categoryKey: string;
  landingUrl: string | null;
  storeDomain: string | null;
  handle: string | null;
  priceEur: number | null;
  compareAtEur: number | null;
  priceSource: 'store' | 'pipiads' | null;
  scoreBreakdown?: TrendScoreBreakdown;
};

export type TrendTier = 'trending' | 'winner' | 'saturated' | 'testing';

export type TrendScoreBreakdown = {
  total: number;
  velocity: number;
  stores: number;
  engagement: number;
  duration: number;
  margin: number;
  supplier: number;
  saturation: number;
  saturationPenalty: number;
  crossPlatformBonus: number;
  storeCount: number;
  activeDays: number;
  /** Days since PipiAds first saw any ad of this product. */
  ageDays: number | null;
  daysSinceLastSeen: number | null;
  playsPerDay: number;
  marginPct: number | null;
  tier: TrendTier;
  reasons: string[];
};

export const TREND_WEIGHTS = {
  velocity: 0.25,
  stores: 0.2,
  engagement: 0.15,
  duration: 0.15,
  margin: 0.2,
  supplier: 0.05,
} as const;

/** Minea's rule of thumb: > 85 is crowded, > 90 with ads > 30 days is too late. */
export const SATURATION_PENALTY_FROM = 85;
export const SATURATED_FROM = 90;
export const TRENDING_MAX_AGE_DAYS = 14;
export const TRENDING_MIN_VELOCITY = 45;
export const WINNER_MIN_DAYS = 30;
export const WINNER_MIN_STORES = 3;
const ACTIVE_WITHIN_DAYS = 7;
const FEE_RATE = 0.15;

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

const round = (n: number) => Number(n.toFixed(2));

export function discoveryMeta(p: Product): DiscoveryMeta | null {
  const d = p.meta?.discovery as DiscoveryMeta | undefined;
  return d && typeof d === 'object' && Array.isArray(d.stores) ? d : null;
}

export function bestLandedOffer(offers: SupplierOffer[]): SupplierOffer | null {
  return (
    [...offers]
      .filter((o) => o.kind === 'live' && o.unitPriceEur != null)
      .sort(
        (a, b) =>
          (a.unitPriceEur ?? 0) + (a.shippingEstimateEur ?? 0) -
          ((b.unitPriceEur ?? 0) + (b.shippingEstimateEur ?? 0)),
      )[0] ?? null
  );
}

export function marginFor(
  salePriceEur: number | null,
  offer: SupplierOffer | null,
): { marginPct: number; profit: number } | null {
  if (!salePriceEur || salePriceEur <= 0 || !offer?.unitPriceEur) return null;
  const profit =
    salePriceEur - offer.unitPriceEur - (offer.shippingEstimateEur ?? 0) - salePriceEur * FEE_RATE;
  return {
    marginPct: round((profit / salePriceEur) * 100),
    profit: round(profit),
  };
}

/**
 * 0–100, store count weighs most: 3 stores / 45 days ≈ 49, 10 / 90 ≈ 71,
 * 25 / 60 ≈ 83, 40 / 120 → 95+.
 */
export function saturationScore(storeCount: number, activeDays: number, listedCount = 0) {
  return round(
    clamp(
      Math.log2(storeCount + 1) * 12 +
        Math.log10(activeDays + 1) * 15 +
        (listedCount > 0 ? Math.log10(listedCount + 1) * 4 : 0),
    ),
  );
}

/**
 * Trend Score 0–100 for an ads-discovered product (replaces the Keepa demand
 * and momentum parts of Drop Sniper). Signals are PipiAds public ad data
 * (plays, likes, shares, delivery days, distinct stores) plus real margin
 * from the store price vs the cheapest CJ/AliExpress landed cost.
 */
export function computeTrendScore(
  d: DiscoveryMeta,
  offers: SupplierOffer[],
  nowSec = Math.floor(Date.now() / 1000),
): TrendScoreBreakdown {
  const storeCount = Math.max(d.stores.length, 1);
  const activeDays = Math.max(d.maxPutDays, 1);
  const ageDays =
    d.firstSeenAt != null ? Math.max(0, Math.floor((nowSec - d.firstSeenAt) / 86_400)) : null;
  const daysSinceLastSeen =
    d.lastSeenAt != null ? Math.max(0, Math.floor((nowSec - d.lastSeenAt) / 86_400)) : null;
  const active = daysSinceLastSeen == null || daysSinceLastSeen <= ACTIVE_WITHIN_DAYS;

  const playsPerDay = d.plays / activeDays;
  const velocity = clamp(Math.log10(playsPerDay + 1) * 18);

  const stores = clamp(20 + Math.log2(storeCount) * 25);

  const weighted = d.likes + d.comments * 2 + d.shares * 3;
  const rate = d.plays > 0 ? weighted / d.plays : 0;
  const engagement = clamp(clamp(rate * 1500) * 0.5 + clamp(Math.log10(d.likes + 1) * 18) * 0.5);

  let duration = clamp(Math.log10(activeDays + 1) * 55);
  if (activeDays > 150) duration = Math.max(60, duration - (activeDays - 150) * 0.1);
  if (!active) duration *= 0.6;

  const best = bestLandedOffer(offers);
  const m = marginFor(d.priceEur, best);
  const margin = m ? clamp(m.marginPct * 1.6) : 0;

  const live = offers.filter((o) => o.kind === 'live');
  const listed = Math.max(0, ...live.map((o) => Number(o.listedCount ?? o.soldCount ?? o.popularity ?? 0)));
  const supplier = live.length
    ? clamp(Math.log10(listed + 1) * 25 + (live.some((o) => o.fastShipping) ? 15 : 0) + 10)
    : 0;

  const saturation = saturationScore(storeCount, activeDays, Number(best?.listedCount ?? 0));
  const saturationPenalty =
    saturation > SATURATION_PENALTY_FROM ? round(saturation - SATURATION_PENALTY_FROM) : 0;
  const crossPlatformBonus =
    d.platforms.includes('tiktok') && d.platforms.some((p) => p === 'facebook' || p === 'instagram')
      ? 4
      : 0;

  const total = clamp(
    velocity * TREND_WEIGHTS.velocity +
      stores * TREND_WEIGHTS.stores +
      engagement * TREND_WEIGHTS.engagement +
      duration * TREND_WEIGHTS.duration +
      margin * TREND_WEIGHTS.margin +
      supplier * TREND_WEIGHTS.supplier +
      crossPlatformBonus -
      saturationPenalty,
  );

  const reasons: string[] = [];
  let tier: TrendTier = 'testing';
  if (saturation > SATURATED_FROM && activeDays > WINNER_MIN_DAYS) {
    tier = 'saturated';
    reasons.push(
      `Saturación ${Math.round(saturation)}/100: ${storeCount} tiendas y anuncios de ${activeDays} días.`,
    );
  } else if (activeDays >= WINNER_MIN_DAYS && active && storeCount >= WINNER_MIN_STORES) {
    tier = 'winner';
    reasons.push(`${storeCount} tiendas lo anuncian y sigue activo tras ${activeDays} días.`);
  } else if (
    ageDays != null &&
    ageDays <= TRENDING_MAX_AGE_DAYS &&
    velocity >= TRENDING_MIN_VELOCITY
  ) {
    tier = 'trending';
    reasons.push(
      `Detectado hace ${ageDays} días con ~${Math.round(playsPerDay).toLocaleString('es-ES')} reproducciones/día.`,
    );
  } else if (activeDays < 7) {
    reasons.push(`Anuncio en fase de test (${activeDays} días).`);
  }
  if (m) reasons.push(`Margen estimado ${m.marginPct}% sobre PVP de tienda.`);
  if (crossPlatformBonus) reasons.push('Anunciado en TikTok y Meta a la vez.');

  return {
    total: round(total),
    velocity: round(velocity),
    stores: round(stores),
    engagement: round(engagement),
    duration: round(duration),
    margin: round(margin),
    supplier: round(supplier),
    saturation,
    saturationPenalty,
    crossPlatformBonus,
    storeCount,
    activeDays,
    ageDays,
    daysSinceLastSeen,
    playsPerDay: Math.round(playsPerDay),
    marginPct: m?.marginPct ?? null,
    tier,
    reasons,
  };
}

export function computeTrendScoreForProduct(p: Product): TrendScoreBreakdown | null {
  const d = discoveryMeta(p);
  if (!d) return null;
  const offers = (p.meta?.suppliers as SupplierOffer[] | undefined) ?? liveSuppliers(p);
  return computeTrendScore(d, offers);
}

/** TRENDING: new (≤ 14 days), fast, not saturated. */
export function isTrendingDiscovery(t: TrendScoreBreakdown) {
  return (
    t.tier === 'trending' ||
    (t.ageDays != null &&
      t.ageDays <= TRENDING_MAX_AGE_DAYS &&
      t.velocity >= TRENDING_MIN_VELOCITY &&
      t.tier !== 'saturated')
  );
}

/** WINNERS: sustained (≥ 30 days), still active, ≥ 3 stores. */
export function isWinnerDiscovery(t: TrendScoreBreakdown) {
  return t.tier === 'winner';
}

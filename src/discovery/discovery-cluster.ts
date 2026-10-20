import { normalizeAdProductKey } from '../integrations/ads/ad-score';
import { toEur } from '../integrations/shared/fx';
import { DiscoveredAd, ProductCluster } from './discovery.types';

/** Store-specific noise in Shopify handles (`posture-corrector-pro-2024-sale`). */
const HANDLE_NOISE = new Set([
  'new', 'sale', 'hot', 'best', 'pro', 'plus', 'max', 'mini', 'original',
  'premium', 'official', 'free', 'shipping', 'offer', 'deal', 'buy', 'get',
  'copy', 'v2', 'v3', 'the', 'and', 'for', 'with',
]);

/** `https://shop.com/products/posture-corrector?utm=…` → `posture-corrector` */
export function shopifyHandleFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const m = u.pathname.match(/\/products\/([^/?#]+)/i);
    return m ? decodeURIComponent(m[1]).toLowerCase() : null;
  } catch {
    return null;
  }
}

export function normalizeHandle(handle: string): string {
  return handle
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !HANDLE_NOISE.has(t) && !/^\d+$/.test(t))
    .slice(0, 6)
    .join(' ');
}

function tokens(s: string): Set<string> {
  return new Set(normalizeAdProductKey(s).split(' ').filter(Boolean));
}

export function tokenOverlap(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  // A single shared word ("lamp") is not enough to call two products the same.
  if (Math.min(ta.size, tb.size) < 2) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit += 1;
  return hit / Math.min(ta.size, tb.size);
}

export function adProductTitle(ad: DiscoveredAd): string {
  return (ad.detail?.productTitle || ad.copy || ad.seed || '').trim();
}

/**
 * Cluster key priority: normalized Shopify handle → normalized product title.
 * Ads without a PipiAds detail have no product identity and return null.
 */
export function clusterKeyFor(ad: DiscoveredAd): string | null {
  if (!ad.detail) return null;
  const handle = shopifyHandleFromUrl(ad.detail.landingUrl);
  const fromHandle = handle ? normalizeHandle(handle) : '';
  if (fromHandle.split(' ').length >= 2) return `h:${fromHandle}`;
  const fromTitle = normalizeAdProductKey(ad.detail.productTitle ?? '');
  if (fromTitle) return `t:${fromTitle}`;
  return fromHandle ? `h:${fromHandle}` : null;
}

function storeOf(ad: DiscoveredAd): string | null {
  return ad.detail?.storeDomain ?? ad.storeId ?? null;
}

function emptyCluster(key: string, ad: DiscoveredAd): ProductCluster {
  const handle = shopifyHandleFromUrl(ad.detail?.landingUrl);
  const priceEur = toEur(ad.detail?.productPrice, ad.detail?.productCurrency);
  return {
    key,
    title: adProductTitle(ad).slice(0, 120),
    handle,
    ads: [],
    stores: [],
    advertisers: [],
    platforms: [],
    firstSeenAt: null,
    lastSeenAt: null,
    maxPutDays: 0,
    plays: 0,
    likes: 0,
    comments: 0,
    shares: 0,
    aiTags: [],
    seeds: [],
    landingUrl: ad.detail?.landingUrl ?? null,
    storeDomain: ad.detail?.storeDomain ?? null,
    imageUrl: ad.detail?.productImage ?? ad.creative.thumbnailUrl ?? null,
    priceEur,
    priceSource: priceEur != null ? 'pipiads' : null,
  };
}

function addAd(c: ProductCluster, ad: DiscoveredAd) {
  if (c.ads.some((a) => a.videoId === ad.videoId)) return;
  c.ads.push(ad);
  const store = storeOf(ad);
  if (store && !c.stores.includes(store)) c.stores.push(store);
  const adv = (ad.advertiserId || ad.advertiser || '').toLowerCase();
  if (adv && !c.advertisers.includes(adv)) c.advertisers.push(adv);
  if (!c.platforms.includes(ad.platform)) c.platforms.push(ad.platform);
  if (ad.firstSeenAt != null) {
    c.firstSeenAt = c.firstSeenAt == null ? ad.firstSeenAt : Math.min(c.firstSeenAt, ad.firstSeenAt);
  }
  if (ad.lastSeenAt != null) {
    c.lastSeenAt = c.lastSeenAt == null ? ad.lastSeenAt : Math.max(c.lastSeenAt, ad.lastSeenAt);
  }
  c.maxPutDays = Math.max(c.maxPutDays, ad.putDays);
  c.plays += ad.plays;
  c.likes += ad.likes;
  c.comments += ad.comments;
  c.shares += ad.shares;
  for (const t of ad.aiTags) if (!c.aiTags.includes(t)) c.aiTags.push(t);
  if (ad.seed && !c.seeds.includes(ad.seed)) c.seeds.push(ad.seed);
  if (!c.landingUrl && ad.detail?.landingUrl) {
    c.landingUrl = ad.detail.landingUrl;
    c.storeDomain = ad.detail.storeDomain;
    c.handle = shopifyHandleFromUrl(ad.detail.landingUrl);
  }
  if (!c.imageUrl) c.imageUrl = ad.detail?.productImage ?? ad.creative.thumbnailUrl ?? null;
  if (c.priceEur == null) {
    const p = toEur(ad.detail?.productPrice, ad.detail?.productCurrency);
    if (p != null) {
      c.priceEur = p;
      c.priceSource = 'pipiads';
    }
  }
}

/**
 * Groups detailed ads into products: exact key first, then a token-overlap
 * merge (≥ `minOverlap`) so `posture-corrector` and "Posture Corrector Brace"
 * from two different stores land in one cluster.
 */
export function buildClusters(ads: DiscoveredAd[], minOverlap = 0.6): ProductCluster[] {
  const byKey = new Map<string, ProductCluster>();
  for (const ad of ads) {
    const key = clusterKeyFor(ad);
    if (!key) continue;
    const c = byKey.get(key) ?? emptyCluster(key, ad);
    addAd(c, ad);
    byKey.set(key, c);
  }

  const merged: ProductCluster[] = [];
  const sorted = [...byKey.values()].sort((a, b) => b.ads.length - a.ads.length);
  for (const c of sorted) {
    const label = c.key.slice(2);
    const target = merged.find(
      (m) =>
        tokenOverlap(m.key.slice(2), label) >= minOverlap ||
        tokenOverlap(m.title, c.title) >= minOverlap,
    );
    if (!target) {
      merged.push(c);
      continue;
    }
    for (const ad of c.ads) addAd(target, ad);
    if (c.title.length > target.title.length && c.title.length <= 120) {
      target.title = c.title;
    }
  }
  return merged;
}

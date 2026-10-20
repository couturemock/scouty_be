/**
 * Ad Score 0–100 from PipiAds public signals (not "more ads = more sales").
 * Mirrors the client's 3-signal model (budget / duration / engagement),
 * cross-referenced across multiple independent sellers:
 * - duration: how long the ad has kept running (put_days)
 * - advertisers: how many distinct sellers are pushing the same product
 *   (real signal since 2026-10 — see pipiads.provider.ts, `app_name`/
 *   `unique_id` are the actual seller identity fields PipiAds returns;
 *   `advertiser_name`/`brand_name` never appear in the live payload)
 * - engagement: plays + likes + comments + shares — PipiAds' public API has
 *   no real click/CTR field, so this is the closest honest proxy for
 *   "people are clicking/engaging with this"
 * - momentum: plays accumulated per day the ad has been running — the
 *   closest honest proxy for "budget is being actively invested right now"
 *   without real spend-in-USD data (ad_cost/cost never appear either;
 *   PipiAds' min_cpa/min_cpm exist but their scale doesn't hold up as real
 *   USD — see pipiads.provider.ts — so they're stored for reference only,
 *   never scored)
 */

export type AdSignalLike = {
  publicSignals?: Record<string, unknown>;
  title?: string;
  platform?: string;
};

export type AdClusterScore = {
  total: number;
  duration: number;
  advertisers: number;
  engagement: number;
  /** Plays accumulated per day running — proxy for active budget momentum, not real spend-in-USD (see file header). */
  momentum: number;
  creativeCount: number;
  advertiserCount: number;
  /** Distinct platforms seen for this cluster (e.g. ['tiktok', 'facebook']). */
  platforms: string[];
  /** True when the same product is running on TikTok AND Meta (FB/IG) at once. */
  crossPlatform: boolean;
};

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeAdProductKey(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 2)
    .slice(0, 8)
    .join(' ');
}

export function computeAdClusterScore(
  ads: AdSignalLike[],
  advertiserNames: string[],
): AdClusterScore {
  const creativeCount = ads.length;
  const uniqueAdvertisers = new Set(
    advertiserNames.map((a) => a.trim().toLowerCase()).filter(Boolean),
  );
  const advertiserCount = Math.max(uniqueAdvertisers.size, 1);

  let maxDays = 0;
  let totalPlays = 0;
  let totalLikes = 0;
  let totalComments = 0;
  let totalShares = 0;

  for (const ad of ads) {
    const s = ad.publicSignals ?? {};
    maxDays = Math.max(maxDays, num(s.deliveryDays));
    totalPlays += num(s.playCount);
    totalLikes += num(s.likeCount);
    totalComments += num(s.commentCount);
    totalShares += num(s.shareCount);
  }

  // Duration: long-running ads are a stronger signal than one-day spikes
  const duration = clamp(Math.log10(maxDays + 1) * 40 + Math.min(maxDays, 45));
  // Several sellers pushing similar offer
  const advertisers = clamp(Math.log10(advertiserCount + 1) * 55 + creativeCount * 4);
  // No real click/CTR field in PipiAds' public payload — plays + likes +
  // comments + shares is the closest honest stand-in for "people engaging
  // with/clicking on this ad".
  const engagement = clamp(
    Math.log10(totalPlays + 1) * 18 +
      Math.log10(totalLikes + 1) * 9 +
      Math.log10(totalComments + 1) * 7 +
      Math.log10(totalShares + 1) * 7,
  );
  // Reach per day running — a stale ad with huge lifetime plays but no
  // recent traction scores lower here than one actively racking up views
  // right now, which is the honest proxy for "budget being actively
  // invested" without a real spend-in-USD field (see file header).
  const momentum = clamp(Math.log10(totalPlays / Math.max(maxDays, 1) + 1) * 16);

  // Same product advertised on TikTok AND Meta at once is a stronger signal
  // than either alone (client-requested cross-check) — small flat bonus.
  const platforms = [
    ...new Set(ads.map((ad) => ad.platform).filter((p): p is string => Boolean(p))),
  ];
  const hasTikTok = platforms.includes('tiktok');
  const hasMeta = platforms.some((p) => p === 'facebook' || p === 'instagram');
  const crossPlatform = hasTikTok && hasMeta;

  const total = clamp(
    duration * 0.3 +
      advertisers * 0.3 +
      engagement * 0.25 +
      momentum * 0.15 +
      (crossPlatform ? 8 : 0),
  );

  return {
    total: Number(total.toFixed(2)),
    duration: Number(duration.toFixed(2)),
    advertisers: Number(advertisers.toFixed(2)),
    engagement: Number(engagement.toFixed(2)),
    momentum: Number(momentum.toFixed(2)),
    creativeCount,
    advertiserCount,
    platforms,
    crossPlatform,
  };
}

/**
 * Ad Score 0–100 from PipiAds public signals (not "more ads = more sales").
 * Weights: duration, multi-advertiser, engagement, spend (low confidence).
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
  spend: number;
  creativeCount: number;
  advertiserCount: number;
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
  let totalSpend = 0;

  for (const ad of ads) {
    const s = ad.publicSignals ?? {};
    maxDays = Math.max(maxDays, num(s.deliveryDays));
    totalPlays += num(s.playCount);
    totalLikes += num(s.likeCount);
    totalSpend += num(s.adSpendUsd);
  }

  // Duration: long-running ads are a stronger signal than one-day spikes
  const duration = clamp(Math.log10(maxDays + 1) * 40 + Math.min(maxDays, 45));
  // Several sellers pushing similar offer
  const advertisers = clamp(Math.log10(advertiserCount + 1) * 55 + creativeCount * 4);
  const engagement = clamp(
    Math.log10(totalPlays + 1) * 22 + Math.log10(totalLikes + 1) * 12,
  );
  // Spend is noisy — low weight
  const spend = clamp(Math.log10(totalSpend + 1) * 15);

  const total = clamp(
    duration * 0.35 + advertisers * 0.3 + engagement * 0.25 + spend * 0.1,
  );

  return {
    total: Number(total.toFixed(2)),
    duration: Number(duration.toFixed(2)),
    advertisers: Number(advertisers.toFixed(2)),
    engagement: Number(engagement.toFixed(2)),
    spend: Number(spend.toFixed(2)),
    creativeCount,
    advertiserCount,
  };
}

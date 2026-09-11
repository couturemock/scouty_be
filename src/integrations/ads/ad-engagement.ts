import { CreativeAd } from '../types';

export function adPlayCount(ad: CreativeAd): number {
  const n = Number(ad.publicSignals?.playCount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function adLikeCount(ad: CreativeAd): number {
  const n = Number(ad.publicSignals?.likeCount ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Prefer views; likes break ties (weighted lightly). */
export function adEngagementScore(ad: CreativeAd): number {
  return adPlayCount(ad) + adLikeCount(ad) * 20;
}

export function sortAdsByEngagement(ads: CreativeAd[]): CreativeAd[] {
  return [...ads].sort((a, b) => {
    const score = adEngagementScore(b) - adEngagementScore(a);
    if (score !== 0) return score;
    return adPlayCount(b) - adPlayCount(a);
  });
}

export type WinningFormatStat = {
  format: string;
  adCount: number;
  totalPlays: number;
  totalLikes: number;
};

export function summarizeWinningFormats(ads: CreativeAd[]): WinningFormatStat[] {
  const map = new Map<string, WinningFormatStat>();
  for (const ad of ads) {
    const format = ad.aiAnalysis?.format?.trim() || 'Otro';
    const prev = map.get(format) ?? {
      format,
      adCount: 0,
      totalPlays: 0,
      totalLikes: 0,
    };
    prev.adCount += 1;
    prev.totalPlays += adPlayCount(ad);
    prev.totalLikes += adLikeCount(ad);
    map.set(format, prev);
  }
  return [...map.values()].sort(
    (a, b) =>
      b.totalPlays - a.totalPlays ||
      b.totalLikes - a.totalLikes ||
      b.adCount - a.adCount,
  );
}

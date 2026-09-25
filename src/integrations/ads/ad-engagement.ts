import { CreativeAd } from '../types';

/** Noise words that should not count as product match signals. */
const RELEVANCE_STOP = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'this',
  'that',
  'new',
  'pack',
  'set',
  'kit',
  'de',
  'la',
  'el',
  'los',
  'las',
  'del',
  'una',
  'uno',
  'para',
  'con',
  'por',
  'que',
]);

/** Significant tokens from a product query (lowercased). */
export function productQueryTokens(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !RELEVANCE_STOP.has(w));
}

/**
 * How well an ad's public text matches the product query (0–1).
 * Used to drop viral PipiAds noise when the keyword filter is ignored.
 *
 * Deliberately does NOT read `ad.sourceUrl`: when no real per-ad link is
 * available, `resolveCreativeSourceUrl` builds a library-search fallback URL
 * that embeds the query itself (e.g. `...&adv_name=portable+blender`).
 * Scoring against that URL made relevance a tautology — a completely
 * unrelated ad with no real link still "matched" because the generated
 * fallback link echoed the search term back. Real bug, found live: a
 * Fortnite promo and a beauty ASMR clip both scored as relevant to
 * "portable blender" this way. Only the ad's own title/copy counts.
 *
 * Token matching is word-boundary-aware, not a raw substring check — a
 * plain `hay.includes(t)` let the token "massager" match inside an
 * unrelated ad's "#kneemassager" hashtag, scoring a knee-massager clip as
 * relevant to a "neck massager" search. `\b` alone isn't enough (it treats
 * accented letters as non-word chars, so it'd miss "café" the same way the
 * denylist regexes did), so this builds the boundary from Unicode letter/
 * number categories.
 */
export function adRelevanceScore(
  ad: CreativeAd,
  query: string,
  extraHaystack = '',
): number {
  const tokens = productQueryTokens(query);
  if (!tokens.length) return 1;
  const hay = `${ad.title} ${extraHaystack}`.toLowerCase();
  let hits = 0;
  for (const t of tokens) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}_])${t}(?![\\p{L}\\p{N}_])`, 'u');
    if (re.test(hay)) hits += 1;
  }
  return hits / tokens.length;
}

export function filterAdsByRelevance(
  ads: CreativeAd[],
  query: string,
  minScore = 0.34,
): CreativeAd[] {
  return ads.filter((ad) => adRelevanceScore(ad, query) >= minScore);
}

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

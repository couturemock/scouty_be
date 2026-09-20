/** Keepa minutes since 2011-01-01 UTC. */
export const KEEPA_EPOCH_MS = Date.UTC(2011, 0, 1);
export const KEEPA_MINUTES_7D = 7 * 24 * 60;

export function nowKeepaMinutes(nowMs = Date.now()): number {
  return Math.floor((nowMs - KEEPA_EPOCH_MS) / 60_000);
}

/**
 * Keepa csv series: even indices = keepa minutes, odd = value.
 * -1 / null = missing. Also accepts [[t,v], ...] if a proxy reshapes it.
 */
export function parseKeepaCsvSeries(raw: unknown): Array<{ t: number; v: number }> {
  if (!Array.isArray(raw) || raw.length < 2) return [];
  const points: Array<{ t: number; v: number }> = [];

  if (Array.isArray(raw[0])) {
    for (const pair of raw) {
      if (!Array.isArray(pair) || pair.length < 2) continue;
      const t = Number(pair[0]);
      const v = Number(pair[1]);
      if (!Number.isFinite(t) || !Number.isFinite(v) || v < 0) continue;
      points.push({ t, v });
    }
    return points;
  }

  for (let i = 0; i + 1 < raw.length; i += 2) {
    const t = Number(raw[i]);
    const v = Number(raw[i + 1]);
    if (!Number.isFinite(t) || !Number.isFinite(v) || v < 0) continue;
    points.push({ t, v });
  }
  return points;
}

export function valueAtOrBefore(
  points: Array<{ t: number; v: number }>,
  keepaMinute: number,
): number | undefined {
  let last: number | undefined;
  for (const p of points) {
    if (p.t > keepaMinute) break;
    last = p.v;
  }
  return last;
}

export function latestValue(points: Array<{ t: number; v: number }>): number | undefined {
  if (!points.length) return undefined;
  return points[points.length - 1]?.v;
}

/** % improvement: lower BSR is better. Positive = rising. */
export function bsrImprovementPct(then: number, now: number): number | undefined {
  if (!(then > 0) || !(now > 0)) return undefined;
  return Number((((then - now) / then) * 100).toFixed(1));
}

export function growthFromSalesCsv(
  csvSales: unknown,
  nowKeepa = nowKeepaMinutes(),
): { growthPct7?: number; bsrNow?: number; bsr7dAgo?: number } {
  const points = parseKeepaCsvSeries(csvSales);
  if (!points.length) return {};
  const bsrNow = latestValue(points);
  const bsr7dAgo = valueAtOrBefore(points, nowKeepa - KEEPA_MINUTES_7D);
  const growthPct7 =
    bsrNow != null && bsr7dAgo != null
      ? bsrImprovementPct(bsr7dAgo, bsrNow)
      : undefined;
  return { growthPct7, bsrNow, bsr7dAgo };
}

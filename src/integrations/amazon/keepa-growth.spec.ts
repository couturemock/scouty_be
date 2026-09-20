import {
  bsrImprovementPct,
  growthFromSalesCsv,
  KEEPA_EPOCH_MS,
  parseKeepaCsvSeries,
  valueAtOrBefore,
} from './keepa-growth';

describe('keepa-growth', () => {
  it('parses flat csv pairs and skips missing ranks', () => {
    const points = parseKeepaCsvSeries([100, 5000, 200, -1, 300, 2000]);
    expect(points).toEqual([
      { t: 100, v: 5000 },
      { t: 300, v: 2000 },
    ]);
  });

  it('reads BSR 7d ago from csv', () => {
    const nowKeepa = Math.floor((Date.now() - KEEPA_EPOCH_MS) / 60_000);
    const t7 = nowKeepa - 7 * 24 * 60;
    const csv = [t7 - 10, 4000, t7, 2000, nowKeepa, 1000];
    const g = growthFromSalesCsv(csv, nowKeepa);
    expect(g.bsrNow).toBe(1000);
    expect(g.bsr7dAgo).toBe(2000);
    expect(g.growthPct7).toBe(50);
  });

  it('treats lower BSR as improvement', () => {
    expect(bsrImprovementPct(2000, 1000)).toBe(50);
    expect(valueAtOrBefore([{ t: 1, v: 9 }], 0)).toBeUndefined();
  });
});

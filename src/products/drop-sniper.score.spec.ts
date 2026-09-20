import { computeDropSniperScore, isTrendingCandidate, isWinnerCandidate } from './drop-sniper.score';
import { Product } from './product.entity';

function product(partial: Partial<Product> & { meta?: Record<string, unknown> }): Product {
  return {
    currentPrice: '40',
    estimatedMarginPct: '25',
    estimatedSales: '120',
    currentRank: 8000,
    growthPct: '12',
    rating: '4.4',
    reviewCount: 180,
    sources: ['amazon'],
    meta: {
      keepa: { growthPct7: 18, growthPct30: 12, salesRankDrops30: 40, salesRankDrops90: 80 },
      suppliers: [
        { source: 'aliexpress', name: 'x', listingUrl: 'https://ae', unitPriceEur: 8, kind: 'live', soldCount: 2000 },
      ],
      adScore: { total: 55 },
      creativeIntelligence: { provider: 'pipiads', ads: [{}] },
      ...(partial.meta ?? {}),
    },
    ...partial,
  } as Product;
}

describe('drop-sniper cross signals', () => {
  it('adds agreement bonus when Amazon + ads + AE align', () => {
    const sniper = computeDropSniperScore(product({}));
    expect(sniper.viable).toBe(true);
    expect(sniper.ads).toBeGreaterThanOrEqual(40);
    expect(sniper.aliexpress).toBeGreaterThan(0);
    expect(sniper.agreement).toBe(10);
    expect(sniper.total).toBeGreaterThan(0);
  });

  it('does not invent ads when CI is fixture', () => {
    const sniper = computeDropSniperScore(
      product({
        meta: {
          adScore: { total: 90 },
          creativeIntelligence: { provider: 'fixture', ads: [{}] },
        },
      }),
    );
    expect(sniper.ads).toBe(0);
    expect(sniper.agreement).toBeLessThan(10);
  });

  it('marks TRENDING from 7d growth and WINNERS from sustained demand', () => {
    const p = product({});
    const sniper = computeDropSniperScore(p);
    expect(isTrendingCandidate(p, sniper)).toBe(true);
    expect(isWinnerCandidate(p, sniper)).toBe(true);
  });

  it('flags non-viable without a live supplier but keeps the Amazon score (margin/profit boards gate on viable, trending/winners don\'t)', () => {
    const p = product({
      estimatedMarginPct: '2',
      meta: { suppliers: [] },
    });
    const sniper = computeDropSniperScore(p);
    expect(sniper.viable).toBe(false);
    expect(sniper.supplier).toBe(0);
    expect(sniper.total).toBeGreaterThan(0);
    expect(isTrendingCandidate(p, sniper)).toBe(true);
  });
});

import {
  computeDropSniperScore,
  computeProductTier,
  hasAnySupplier,
  isTrendingCandidate,
  isWinnerCandidate,
} from './drop-sniper.score';
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
    expect(sniper.sourceable).toBe(false);
    expect(hasAnySupplier(p)).toBe(false);
    expect(sniper.supplier).toBe(0);
    expect(sniper.total).toBeGreaterThan(0);
    expect(isTrendingCandidate(p, sniper)).toBe(true);
  });

  it('sourceable is true with any live offer even below the margin floor', () => {
    const p = product({
      estimatedMarginPct: '1',
      meta: {
        suppliers: [
          { source: 'aliexpress', name: 'x', listingUrl: 'https://ae', unitPriceEur: 8, kind: 'live' },
        ],
      },
    });
    const sniper = computeDropSniperScore(p);
    expect(sniper.sourceable).toBe(true);
    expect(sniper.viable).toBe(false); // margin too low for viable
  });
});

describe('rebalanced weights (ads-first discovery)', () => {
  it('an ads-strong/Amazon-thin product now outranks a demand-strong/ads-absent one', () => {
    const adsStrongThinAmazon = product({
      currentRank: null,
      estimatedSales: '0',
      growthPct: '0',
      meta: {
        keepa: {},
        adScore: { total: 70, advertiserCount: 3, duration: 60 },
        creativeIntelligence: { provider: 'pipiads', ads: [{}] },
      },
    });
    const demandStrongNoAds = product({
      currentRank: 500,
      estimatedSales: '400',
      growthPct: '5',
      meta: {
        keepa: {},
        adScore: undefined,
        creativeIntelligence: undefined,
      },
    });

    const adsScore = computeDropSniperScore(adsStrongThinAmazon);
    const demandScore = computeDropSniperScore(demandStrongNoAds);
    expect(adsScore.total).toBeGreaterThan(demandScore.total);
  });
});

describe('computeProductTier', () => {
  function strongAdsProduct(overrides: Partial<Product> & { meta?: Record<string, unknown> } = {}) {
    const { meta: overrideMeta, ...rest } = overrides;
    return product({
      currentRank: null,
      estimatedSales: '0',
      ...rest,
      meta: {
        keepa: {},
        adScore: { total: 70, advertiserCount: 2, duration: 40 },
        creativeIntelligence: { provider: 'pipiads', ads: [{}] },
        suppliers: [
          { source: 'aliexpress', name: 'x', listingUrl: 'https://ae', unitPriceEur: 8, kind: 'live' },
        ],
        ...(overrideMeta ?? {}),
      },
    });
  }

  it('classifies an ads-strong, Amazon-absent, sourceable product as early_winner', () => {
    const p = strongAdsProduct();
    const sniper = computeDropSniperScore(p);
    const { tier, reasons } = computeProductTier(p, sniper);
    expect(tier).toBe('early_winner');
    expect(reasons[0]).toBeTruthy();
  });

  it('classifies as early_winner via creative-count fallback when PipiAds gives no advertiser names (real ingest finding: advertiserCount floors to 1)', () => {
    const p = strongAdsProduct({
      meta: { adScore: { total: 70, advertiserCount: 1, creativeCount: 3, duration: 40 } },
    });
    const sniper = computeDropSniperScore(p);
    const { tier } = computeProductTier(p, sniper);
    expect(tier).toBe('early_winner');
  });

  it('does not classify as early_winner with a single advertiser AND too few creatives', () => {
    const p = strongAdsProduct({
      meta: { adScore: { total: 70, advertiserCount: 1, creativeCount: 1, duration: 40 } },
    });
    const sniper = computeDropSniperScore(p);
    const { tier } = computeProductTier(p, sniper);
    expect(tier).toBe('unclassified');
  });

  it('classifies strong ads + sustained Amazon demand as proven_winner', () => {
    const p = strongAdsProduct({
      currentRank: 3000,
      estimatedSales: '200',
      meta: { adScore: { total: 75, advertiserCount: 4, duration: 50 } },
    });
    const sniper = computeDropSniperScore(p);
    const { tier } = computeProductTier(p, sniper);
    expect(tier).toBe('proven_winner');
  });

  it('classifies a huge, long-running, highly-reviewed cluster as saturated (not hard-excluded)', () => {
    const p = strongAdsProduct({
      reviewCount: 8000,
      meta: { adScore: { total: 80, advertiserCount: 10, duration: 90 } },
    });
    const sniper = computeDropSniperScore(p);
    const { tier } = computeProductTier(p, sniper);
    expect(tier).toBe('saturated');
    // Saturated is a label/sort concern, never excludes the product from scoring.
    expect(sniper.total).toBeGreaterThan(0);
  });

  it('falls back to unclassified without a strong ads/advertiser signal', () => {
    const p = product({ meta: { suppliers: [] } });
    const sniper = computeDropSniperScore(p);
    const { tier } = computeProductTier(p, sniper);
    expect(tier).toBe('unclassified');
  });

  it('computeDropSniperScore already attaches tier + badges on the breakdown', () => {
    const p = strongAdsProduct();
    const sniper = computeDropSniperScore(p);
    expect(sniper.tier).toBe('early_winner');
    expect(sniper.badges).toEqual(
      expect.objectContaining({ ads: expect.any(Boolean) }),
    );
  });
});

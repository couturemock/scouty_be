import { keepaCategoriesForMarket } from './keepa-categories';

describe('keepa-categories', () => {
  it('exposes ~20 dropshipping nodes per core market, never empty', () => {
    for (const code of ['ES', 'US', 'UK', 'MX', 'DE', 'FR', 'IT']) {
      const cats = keepaCategoriesForMarket(code);
      expect(cats.length).toBeGreaterThanOrEqual(16);
      expect(new Set(cats.map((c) => c.id)).size).toBe(cats.length);
    }
  });
});

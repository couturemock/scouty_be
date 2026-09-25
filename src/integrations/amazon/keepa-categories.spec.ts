import { keepaCategoriesForMarket, PRIORITY_CATEGORY_KEYS } from './keepa-categories';

const FORBIDDEN_KEYS = [
  'electronics',
  'computers',
  'clothing',
  'shoes',
  'jewelry',
  'watches',
  'accessories',
  'health',
];

describe('keepa-categories', () => {
  it('exposes only dropshipping-priority nodes per core market, never empty', () => {
    for (const code of ['ES', 'US', 'UK', 'MX', 'DE', 'FR', 'IT']) {
      const cats = keepaCategoriesForMarket(code);
      expect(cats.length).toBeGreaterThanOrEqual(9);
      expect(cats.length).toBeLessThanOrEqual(PRIORITY_CATEGORY_KEYS.length);
      expect(new Set(cats.map((c) => c.id)).size).toBe(cats.length);
      for (const c of cats) {
        expect(FORBIDDEN_KEYS).not.toContain(c.key);
      }
    }
  });

  it('never sweeps big-brand-electronics/clothing/jewelry categories', () => {
    for (const key of FORBIDDEN_KEYS) {
      expect(PRIORITY_CATEGORY_KEYS as readonly string[]).not.toContain(key);
    }
  });
});

import { hasAnySupplier, hasViableSupplier, liveSuppliers } from './supplier-signals';
import { Product } from './product.entity';

function product(partial: Partial<Product> & { meta?: Record<string, unknown> }): Product {
  return {
    currentPrice: '40',
    estimatedMarginPct: '25',
    meta: {},
    ...partial,
  } as Product;
}

describe('supplier-signals', () => {
  it('hasAnySupplier is true with any live offer, regardless of margin', () => {
    const p = product({
      estimatedMarginPct: '1',
      meta: { suppliers: [{ source: 'aliexpress', name: 'x', listingUrl: 'https://ae', unitPriceEur: 8, kind: 'live' }] },
    });
    expect(hasAnySupplier(p)).toBe(true);
    expect(hasViableSupplier(p)).toBe(false); // margin too low
  });

  it('hasAnySupplier is false with no live offers', () => {
    const p = product({ meta: { suppliers: [] } });
    expect(hasAnySupplier(p)).toBe(false);
    expect(hasViableSupplier(p)).toBe(false);
  });

  it('ignores non-live (estimated) offers for both checks', () => {
    const p = product({
      meta: {
        suppliers: [
          { source: 'alibaba', name: 'link-only', listingUrl: 'https://alibaba.com/search', kind: 'estimated' },
        ],
      },
    });
    expect(liveSuppliers(p)).toHaveLength(0);
    expect(hasAnySupplier(p)).toBe(false);
  });
});

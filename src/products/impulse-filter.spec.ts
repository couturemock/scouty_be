import { computeImpulseSignal } from './impulse-filter';
import { Product } from './product.entity';

function product(partial: Partial<Product> & { meta?: Record<string, unknown> }): Product {
  return {
    title: 'Organizador plegable de cocina',
    currentPrice: '20',
    estimatedMarginPct: '25',
    meta: {
      suppliers: [
        { source: 'aliexpress', name: 'x', listingUrl: 'https://ae', unitPriceEur: 4, kind: 'live' },
      ],
      ...(partial.meta ?? {}),
    },
    ...partial,
  } as Product;
}

describe('computeImpulseSignal', () => {
  it('always reports low confidence — keyword heuristics only', () => {
    const signal = computeImpulseSignal(product({}));
    expect(signal.confidence).toBe('low');
  });

  it('picks up real signals: margin + multiple suppliers', () => {
    const signal = computeImpulseSignal(
      product({
        meta: {
          suppliers: [
            { source: 'aliexpress', name: 'a', listingUrl: 'https://ae/1', unitPriceEur: 4, kind: 'live' },
            { source: 'alibaba', name: 'b', listingUrl: 'https://al/2', unitPriceEur: 5, kind: 'live' },
          ],
        },
      }),
    );
    expect(signal.hasMargin).toBe(true);
    expect(signal.hasMultipleSuppliers).toBe(true);
    expect(signal.score).toBeGreaterThan(0);
  });

  it('does not zero out score just because weak keyword heuristics miss (avoids false negatives)', () => {
    const signal = computeImpulseSignal(
      product({ title: 'Producto sin ninguna palabra clave llamativa' }),
    );
    // Real signals (margin/suppliers) still contribute even if no keyword hit.
    expect(signal.hasMargin).toBe(true);
    expect(signal.score).toBeGreaterThan(0);
  });

  it('flags generic junk as not differentiated', () => {
    const signal = computeImpulseSignal(product({ title: 'Cable USB-C 2 metros' }));
    expect(signal.differentiated).toBe(false);
  });

  it('flags heavy/fragile items via the shared keyword list', () => {
    const signal = computeImpulseSignal(product({ title: 'Sofá cama 3 plazas' }));
    expect(signal.heavyOrFragile).toBe(true);
  });

  it('reflects zero suppliers as no margin / no multiple suppliers', () => {
    const signal = computeImpulseSignal(product({ meta: { suppliers: [] } }));
    expect(signal.hasMargin).toBe(false);
    expect(signal.hasMultipleSuppliers).toBe(false);
  });
});

import { supplierSearchKeywords } from './search-keywords';

describe('supplierSearchKeywords', () => {
  it('strips promo/marketing filler ("+ FREE Gift Box") that dilutes supplier search', () => {
    // Real bug found live: this title searched CJ as "Eternal Hug Necklace
    // FREE Gift" and matched generic "Gift"-themed necklaces (Valentine's
    // Day, Mother's Day, faith pendants — nothing like the real product).
    // The same search without the promo words surfaced real "Love/Hug
    // Necklace" listings that are a genuine match for this product.
    expect(supplierSearchKeywords('Eternal Hug Necklace + FREE Gift Box')).toBe(
      'Eternal Hug Necklace',
    );
  });

  it('still strips brand-ish CamelCase prefixes as before', () => {
    expect(supplierSearchKeywords('TrendPlain Posture Corrector Brace')).toBe(
      'Posture Corrector Brace',
    );
  });

  it('keeps a plain product title unchanged (within the word cap)', () => {
    expect(supplierSearchKeywords('Posture Corrector Brace')).toBe('Posture Corrector Brace');
  });

  it('drops parenthetical and size/unit noise as before', () => {
    expect(supplierSearchKeywords('Posture Corrector Brace (30cm) 2 pcs')).toBe(
      'Posture Corrector Brace',
    );
  });
});

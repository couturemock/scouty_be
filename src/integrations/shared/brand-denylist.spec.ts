import { isLikelyBranded } from './brand-denylist';

describe('isLikelyBranded', () => {
  it('flags known big brands (EN + partial ES)', () => {
    expect(isLikelyBranded('Apple iPhone 15 Pro case')).toBe(true);
    expect(isLikelyBranded('Samsung Galaxy Buds')).toBe(true);
    expect(isLikelyBranded('Nike running shoes')).toBe(true);
    expect(isLikelyBranded('Dyson V15 vacuum')).toBe(true);
  });

  it('does not flag generic/white-label titles', () => {
    expect(isLikelyBranded('Aspirador portátil para sofá')).toBe(false);
    expect(isLikelyBranded('Organizador de cocina plegable')).toBe(false);
    expect(isLikelyBranded('')).toBe(false);
  });
});

import { amazonIngestRejectReason, passesAmazonIngestFilters } from './product-filters';

describe('amazonIngestRejectReason', () => {
  it('rejects big brands', () => {
    expect(amazonIngestRejectReason({ title: 'Apple AirTag 4-pack' })).toBe('brand');
    expect(amazonIngestRejectReason({ title: 'Generic tag', brand: 'Samsung' })).toBe('brand');
  });

  it('accepts a generic, unbranded home gadget', () => {
    expect(amazonIngestRejectReason({ title: 'Quitapelusas eléctrico recargable' })).toBeNull();
  });

  it('rejects consumables', () => {
    expect(amazonIngestRejectReason({ title: 'Pilas AA pack de 20' })).toBe('consumable_title');
    expect(amazonIngestRejectReason({ title: 'Vitaminas multivitamínico diario' })).toBe('consumable_title');
    expect(amazonIngestRejectReason({ title: 'Comida para perros 5kg' })).toBe('consumable_title');
  });

  it('rejects consumable categories', () => {
    expect(amazonIngestRejectReason({ title: 'Producto', category: 'Grocery' })).toBe('consumable_category');
  });

  it('rejects generic junk', () => {
    expect(amazonIngestRejectReason({ title: 'Cable USB-C 2m' })).toBe('generic');
    expect(amazonIngestRejectReason({ title: 'Funda para iPhone' })).toBe('brand');
  });

  it('rejects weapons and regulated/dangerous items', () => {
    expect(amazonIngestRejectReason({ title: 'Cuchillo de caza plegable' })).toBe('regulated_dangerous');
    expect(amazonIngestRejectReason({ title: 'Tactical pepper spray keychain' })).toBe('regulated_dangerous');
    expect(amazonIngestRejectReason({ title: 'Fuegos artificiales caja 50 unidades' })).toBe('regulated_dangerous');
  });

  it('does not reject unrelated titles containing loose substrings', () => {
    expect(amazonIngestRejectReason({ title: 'Organizador de armario plegable' })).toBeNull();
  });

  it('rejects medical devices', () => {
    expect(amazonIngestRejectReason({ title: 'Tensiómetro digital de brazo blood pressure monitor' })).toBe('medical');
    expect(amazonIngestRejectReason({ title: 'Medidor de glucosa glucose monitor' })).toBe('medical');
  });

  it('rejects likely counterfeits (weak heuristic)', () => {
    expect(amazonIngestRejectReason({ title: 'Réplica de reloj 1:1 quality' })).toBe('counterfeit');
  });

  it('rejects heavy/fragile items by keyword', () => {
    expect(amazonIngestRejectReason({ title: 'Sofá cama 3 plazas' })).toBe('heavy_fragile');
    expect(amazonIngestRejectReason({ title: 'Lavadora carga frontal 8kg' })).toBe('heavy_fragile');
  });

  it('requires a title', () => {
    expect(amazonIngestRejectReason({})).toBe('no_title');
  });

  it('passesAmazonIngestFilters mirrors the reject reason', () => {
    expect(passesAmazonIngestFilters({ title: 'Organizador de cocina' })).toBe(true);
    expect(passesAmazonIngestFilters({ title: 'Apple Watch' })).toBe(false);
  });

  // Regression: found live via a real Keepa ingest (2026-W39, ES market) —
  // these titles sailed through the old filters and reached the catalog.
  describe('regression: live ingest leaks', () => {
    it('rejects coffee capsules even when the title ends right on an accented "café"', () => {
      // The old `\bcaf[eé]\b` pattern silently failed here: JS `\b` only
      // treats ASCII [A-Za-z0-9_] as "word" chars, so the boundary right
      // after an accented "é" never fires.
      expect(
        amazonIngestRejectReason({
          title: 'by Amazon - Cápsulas de café Intenso, tueste oscuro, compatible',
        }),
      ).toBe('consumable_title');
    });

    it('rejects beer/alcohol packs (bebidas)', () => {
      expect(
        amazonIngestRejectReason({
          title: 'Mahou Clásica, Cerveza Lager Dorada, Pack 24 Latas x 33cl',
        }),
      ).toBe('beverage');
    });

    it('rejects Xiaomi (explicitly named in the product spec as a big brand to exclude)', () => {
      expect(
        amazonIngestRejectReason({
          title: 'XIAOMI Smart Band 10, Pulsera Inteligente, 21 días, Negro',
        }),
      ).toBe('brand');
    });

    it('rejects Playmobil (toy brand)', () => {
      expect(
        amazonIngestRejectReason({ title: 'PLAYMOBIL Junior Mi Primer Belén' }),
      ).toBe('brand');
    });
  });
});

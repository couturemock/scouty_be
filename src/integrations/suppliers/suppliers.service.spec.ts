import { SuppliersService } from './suppliers.service';
import { AliExpressSupplierProvider } from './aliexpress.provider';
import { CjSupplierProvider } from './cj.provider';
import { AiSupplierSearchProvider } from '../openai/ai-supplier-search.provider';
import { SupplierMatchValidatorProvider } from '../openai/supplier-match-validator.provider';
import { SupplierOffer } from '../types';

function aliexpress(offers: SupplierOffer[]): AliExpressSupplierProvider {
  return {
    findRelated: jest.fn().mockResolvedValue(offers),
    searchByImageOnly: jest.fn().mockResolvedValue([]),
  } as unknown as AliExpressSupplierProvider;
}

function cj(offers: SupplierOffer[]): CjSupplierProvider {
  return {
    findRelated: jest.fn().mockResolvedValue(offers),
    withFreight: jest.fn(),
  } as unknown as CjSupplierProvider;
}

function aiSupplier(offer: SupplierOffer | null): AiSupplierSearchProvider {
  return { findPrice: jest.fn().mockResolvedValue(offer) } as unknown as AiSupplierSearchProvider;
}

/** Default: confirms every live offer is the same product (pass-through). */
function matchValidator(
  reject: (o: SupplierOffer) => boolean = () => false,
): SupplierMatchValidatorProvider {
  return {
    filterSameProduct: jest.fn((_title: string, offers: SupplierOffer[]) =>
      Promise.resolve(offers.filter((o) => !reject(o))),
    ),
  } as unknown as SupplierMatchValidatorProvider;
}

const liveCjOffer: SupplierOffer = {
  source: 'cj',
  name: 'Posture Corrector Brace',
  listingUrl: 'https://cjdropshipping.com/product/-p-1.html',
  unitPriceEur: 7.99,
  kind: 'live',
};

describe('SuppliersService.findRelated', () => {
  it('does not pad with generic search links once there is a real offer', async () => {
    const service = new SuppliersService(
      aliexpress([]),
      cj([liveCjOffer]),
      aiSupplier(null),
      matchValidator(),
    );
    const offers = await service.findRelated('Posture Corrector Brace', 6, 29, 'ES');
    expect(offers).toEqual([liveCjOffer]);
    expect(offers.some((o) => o.kind === 'estimated')).toBe(false);
  });

  it('falls back to search links only when nothing real was found anywhere', async () => {
    const service = new SuppliersService(aliexpress([]), cj([]), aiSupplier(null), matchValidator());
    const offers = await service.findRelated('Posture Corrector Brace', 6, 29, 'ES');
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.every((o) => o.kind === 'estimated')).toBe(true);
  });

  it('keeps a live offer even when the product title has marketing text the listing never repeats', async () => {
    // Real bug found live: "Krazy Klean Pro (10-year warranty)" searched CJ
    // fine as "Krazy Klean Pro" (4 live offers came back), but the old
    // relevance check compared against the full raw title — "warranty" (its
    // last token) never appears in a generic supplier listing, so every
    // offer got discarded.
    const cjOffer: SupplierOffer = {
      source: 'cj',
      name: 'Pro Multi-Purpose Cleaning Spray Gadget 500ml',
      listingUrl: 'https://cjdropshipping.com/product/-p-krazy.html',
      unitPriceEur: 4.5,
      kind: 'live',
    };
    const service = new SuppliersService(
      aliexpress([]),
      cj([cjOffer]),
      aiSupplier(null),
      matchValidator(),
    );
    const offers = await service.findRelated('Krazy Klean Pro (10-year warranty)', 6, 29, 'ES');
    expect(offers).toEqual([cjOffer]);
  });

  it('uses the AI offer instead of search links when CJ/AliExpress found nothing', async () => {
    const aiOffer: SupplierOffer = {
      source: 'alibaba',
      name: 'Posture Corrector Brace',
      listingUrl: 'https://alibaba.com/product-detail/x.html',
      unitPriceEur: 3.2,
      kind: 'live',
    };
    const service = new SuppliersService(
      aliexpress([]),
      cj([]),
      aiSupplier(aiOffer),
      matchValidator(),
    );
    const offers = await service.findRelated('Posture Corrector Brace', 6, 29, 'ES');
    expect(offers).toEqual([aiOffer]);
  });

  it('still asks the AI for a second opinion even when CJ alone already found something', async () => {
    const ai = aiSupplier(null);
    const service = new SuppliersService(aliexpress([]), cj([liveCjOffer]), ai, matchValidator());
    await service.findRelated('Posture Corrector Brace', 6, 29, 'ES');
    expect(ai.findPrice).toHaveBeenCalled();
  });

  it('keeps both the CJ price and the AI second opinion when the AI finds one too', async () => {
    const aiOffer: SupplierOffer = {
      source: 'alibaba',
      name: 'Posture Corrector Brace',
      listingUrl: 'https://alibaba.com/product-detail/x.html',
      unitPriceEur: 3.2,
      kind: 'live',
    };
    const service = new SuppliersService(
      aliexpress([]),
      cj([liveCjOffer]),
      aiSupplier(aiOffer),
      matchValidator(),
    );
    const offers = await service.findRelated('Posture Corrector Brace', 6, 29, 'ES');
    expect(offers).toEqual(expect.arrayContaining([liveCjOffer, aiOffer]));
    expect(offers).toHaveLength(2);
  });

  it('skips the AI call when the caller asks to batch it separately (skipAiFallback)', async () => {
    const ai = aiSupplier(null);
    const service = new SuppliersService(aliexpress([]), cj([liveCjOffer]), ai, matchValidator());
    const offers = await service.findRelated('Posture Corrector Brace', 6, 29, 'ES', null, {
      skipAiFallback: true,
    });
    expect(ai.findPrice).not.toHaveBeenCalled();
    expect(offers).toEqual([liveCjOffer]);
  });

  it('drops a CJ offer the AI match validator says is a different product', async () => {
    // The validator is a second, semantic opinion on top of the free
    // keyword-overlap filter — this is the case that filter alone can't
    // catch (two different products sharing enough generic words).
    const wrongCjOffer: SupplierOffer = {
      source: 'cj',
      name: 'Outdoor Anti-slip And Anti-cutting Barefoot Rafting Swimming Shoes',
      listingUrl: 'https://cjdropshipping.com/product/-p-wrong.html',
      unitPriceEur: 7.99,
      kind: 'live',
    };
    const validator = matchValidator((o) => o.listingUrl === wrongCjOffer.listingUrl);
    const service = new SuppliersService(
      aliexpress([]),
      cj([wrongCjOffer]),
      aiSupplier(null),
      validator,
    );
    const offers = await service.findRelated(
      'Outdoor Tree-Climbing Anti-Slip Cat Claw Shoes Set',
      6,
      29,
      'ES',
    );
    expect(offers.some((o) => o.listingUrl === wrongCjOffer.listingUrl)).toBe(false);
  });

  it('keeps the search-link fallback (kind: estimated) even if the match validator would reject it', async () => {
    const validator = matchValidator(() => true);
    const service = new SuppliersService(aliexpress([]), cj([]), aiSupplier(null), validator);
    const offers = await service.findRelated('Posture Corrector Brace', 6, 29, 'ES');
    expect(validator.filterSameProduct).not.toHaveBeenCalled();
    expect(offers.every((o) => o.kind === 'estimated')).toBe(true);
  });

  it('passes opts.aiTags through to the match validator as extra context', async () => {
    // Real bug found live: a bare, vague title (e.g. "THE DAILY", a dog
    // supplement per its PipiAds tags) gave the match validator nothing to
    // tell a real product apart from an unrelated one sharing a generic
    // word — the tags carry the context the title alone doesn't.
    const validator = matchValidator();
    const service = new SuppliersService(aliexpress([]), cj([liveCjOffer]), aiSupplier(null), validator);
    await service.findRelated('Posture Corrector Brace', 6, 29, 'ES', null, {
      skipAiFallback: true,
      aiTags: ['#dogsupplement', '#petmultivitamin'],
    });
    expect(validator.filterSameProduct).toHaveBeenCalledWith(
      'Posture Corrector Brace',
      expect.any(Array),
      ['#dogsupplement', '#petmultivitamin'],
    );
  });
});

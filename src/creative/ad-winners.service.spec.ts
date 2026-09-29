import { AdWinnersService } from './ad-winners.service';

/**
 * Discovery mode clusters ads by title with no product-category curation
 * upfront (that's the point — it finds things nobody seeded). Without a
 * dropshippability gate, a viral ad for a big-brand item or a consumable
 * would cluster into a "product" and burn AliExpress/Keepa credits on
 * something Scout-ly should never recommend for dropshipping.
 */
describe('AdWinnersService.runForWeek — dropshippability gate', () => {
  function makeService(ads: Record<string, unknown>[]) {
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'AD_WINNERS_ENABLED') return '1';
        if (key === 'AD_DISCOVERY_ENABLED') return '1';
        return undefined;
      }),
    };
    const pipiads = {
      enabled: () => true,
      discoverTopAds: jest
        .fn()
        .mockResolvedValue({ ads, creditsUsed: ads.length }),
      searchAdsForProduct: jest
        .fn()
        .mockResolvedValue({ ads: [], creditsUsed: 0 }),
    };
    const suppliers = {
      beginIngestRun: jest.fn(),
      findRelated: jest.fn().mockResolvedValue([
        {
          source: 'aliexpress',
          name: 'live offer',
          listingUrl: 'https://ae.example/1',
          unitPriceEur: 5,
          kind: 'live',
          soldCount: 100,
        },
      ]),
    };
    const amazon = {
      searchByKeyword: jest.fn().mockResolvedValue([]),
    };
    const savedProducts: Record<string, unknown>[] = [];
    const products = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest
        .fn()
        .mockImplementation((v: Record<string, unknown>) => ({ ...v })),
      save: jest.fn().mockImplementation((p: Record<string, unknown>) => {
        savedProducts.push(p);
        return Promise.resolve({ id: `id-${savedProducts.length}`, ...p });
      }),
    };
    const rankings = {
      delete: jest.fn().mockResolvedValue(undefined),
      save: jest.fn().mockResolvedValue(undefined),
      create: jest.fn().mockImplementation((v: unknown) => v),
    };
    const service = new AdWinnersService(
      config as never,
      pipiads as never,
      suppliers as never,
      amazon as never,
      products as never,
      rankings as never,
    );
    return { service, savedProducts, suppliers };
  }

  function makeAd(title: string, id: string) {
    return {
      platform: 'tiktok' as const,
      title,
      thumbnailUrl: undefined,
      sourceUrl: undefined,
      publicSignals: {
        playCount: 500_000,
        likeCount: 20_000,
        deliveryDays: 45,
        advertiserName: `advertiser-${id}`,
        videoId: id,
      },
    };
  }

  it('rejects a big-brand product cluster before spending supplier credits on it', async () => {
    const { service, savedProducts, suppliers } = makeService([
      makeAd('The new Dyson vacuum is unbeatable, get yours today', 'a1'),
      makeAd('Dyson airwrap styling at home, everyone is obsessed', 'a2'),
    ]);

    const result = await service.runForWeek('2026-W40', 'ES');

    expect(savedProducts).toHaveLength(0);
    expect(result.ranked).toBe(0);
    expect(suppliers.findRelated).not.toHaveBeenCalled();
  });

  it('rejects a consumable/beverage cluster', async () => {
    const { service, savedProducts } = makeService([
      makeAd('Try this amazing craft beer six-pack, perfect for summer', 'b1'),
      makeAd('This beer pack sells out every week, get it now', 'b2'),
    ]);

    await service.runForWeek('2026-W40', 'ES');
    expect(savedProducts).toHaveLength(0);
  });

  it('keeps a real dropshippable product cluster and reaches suppliers', async () => {
    const { service, savedProducts, suppliers } = makeService([
      makeAd('This posture corrector fixed my desk-job back pain', 'c1'),
      makeAd('Everyone at the office is wearing this posture corrector', 'c2'),
    ]);

    const result = await service.runForWeek('2026-W40', 'ES');

    expect(suppliers.findRelated).toHaveBeenCalled();
    expect(savedProducts.length).toBeGreaterThan(0);
    expect(result.ranked).toBeGreaterThan(0);
  });
});

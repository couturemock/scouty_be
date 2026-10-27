import { ConfigService } from '@nestjs/config';
import { TrendDiscoveryService } from './trend-discovery.service';
import { AdProductDetail, DiscoveredAd } from './discovery.types';
import { SupplierOffer } from '../integrations/types';

const NOW = Math.floor(Date.now() / 1000);
const DAY = 86_400;

function config(values: Record<string, string> = {}): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

/** Same shape as discovery.spec.ts's `ad()` helper — known to clear the free gates. */
function ad(over: Partial<DiscoveredAd> = {}): DiscoveredAd {
  return {
    videoId: 'v1',
    platform: 'tiktok',
    copy: 'This posture corrector fixed my back in a week',
    script: null,
    advertiser: 'Backfix',
    advertiserId: 'a1',
    storeId: 's1',
    shopType: 'shopify',
    dataTypes: [1],
    buttonText: 'Shop now',
    putDays: 10,
    plays: 100_000,
    likes: 3_000,
    comments: 100,
    shares: 50,
    firstSeenAt: NOW - 10 * DAY,
    lastSeenAt: NOW - DAY,
    aiTags: [],
    pass: 'new',
    creative: { platform: 'tiktok', title: 'Posture corrector' },
    ...over,
  } as DiscoveredAd;
}

function detail(domain: string, handle: string, title: string): AdProductDetail {
  return {
    productId: 'p1',
    productTitle: title,
    productPrice: 29.99,
    productCurrency: 'USD',
    productImage: null,
    storeName: domain.split('.')[0]!,
    storeDomain: domain,
    landingUrl: `https://${domain}/products/${handle}?utm_source=tiktok`,
  } as AdProductDetail;
}

const liveOffer: SupplierOffer = {
  source: 'cj',
  name: 'Posture corrector',
  listingUrl: 'https://cjdropshipping.com/product/-p-1.html',
  unitPriceEur: 4,
  kind: 'live',
};

/** In-memory stand-in for the TypeORM repos `saveProduct`/snapshot persistence uses. */
function fakeRepo() {
  const rows = new Map<string, Record<string, unknown>>();
  let n = 0;
  return {
    findOne: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
      const key = JSON.stringify(where);
      return rows.get(key) ?? null;
    }),
    create: jest.fn((data: Record<string, unknown>) => ({ id: `row-${++n}`, ...data })),
    save: jest.fn(async (row: Record<string, unknown>) => {
      rows.set(JSON.stringify({ slug: row.slug }), row);
      rows.set(JSON.stringify({ productId: row.productId, weekKey: row.weekKey }), row);
      return row;
    }),
  };
}

function buildService(opts: {
  pagesByKeyword: Record<number, { ads: DiscoveredAd[]; hasNext: boolean }>;
  details: Record<string, AdProductDetail>;
  liveTitles: Set<string>;
}) {
  const pipiads = {
    enabled: () => true,
    searchDiscovery: jest.fn(async (params: Record<string, unknown>) => {
      const page = Number(params.current_page ?? 1);
      const hit = opts.pagesByKeyword[page] ?? { ads: [], hasNext: false };
      return { ads: hit.ads, creditsUsed: Math.max(hit.ads.length, 1), hasNext: hit.hasNext };
    }),
    adProductDetail: jest.fn(async (videoId: string) => ({
      detail: opts.details[videoId] ?? null,
      creditsUsed: 1,
    })),
    getStatus: jest.fn(),
  };
  const pipiadsClient = {
    getCredits: jest.fn().mockResolvedValue({ remaining: null, used: null, total: null, source: null }),
  };
  const pipiadsCache = { resetStats: jest.fn(), stats: () => ({ hits: 0, misses: 0 }) };
  const aiPrefilter = { enabled: () => false, filter: jest.fn() };
  const aiSupplier = {
    findPricesBatch: jest.fn().mockResolvedValue([]),
    findPrice: jest.fn().mockResolvedValue(null),
  };
  const suppliers = {
    // `name` must match the product title — the real pipeline runs every
    // live offer through `offerIsSameProduct(offer, cluster.title)` before
    // trusting it, so a mismatched fixture name would get filtered out here
    // exactly like a real wrong-product match would.
    findRelated: jest.fn(async (title: string) =>
      opts.liveTitles.has(title) ? [{ ...liveOffer, name: title }] : [],
    ),
    withShipping: jest.fn(async (offers: SupplierOffer[]) => offers),
  };
  const store = {
    concurrency: () => 4,
    fetchProduct: jest.fn().mockResolvedValue(null),
  };
  const products = fakeRepo();
  const snapshots = fakeRepo();

  const service = new TrendDiscoveryService(
    config(),
    pipiads as never,
    pipiadsClient as never,
    pipiadsCache as never,
    aiPrefilter as never,
    aiSupplier as never,
    suppliers as never,
    store as never,
    products as never,
    snapshots as never,
  );
  return { service, pipiads, suppliers };
}

describe('TrendDiscoveryService.runWeek — multi-round discovery', () => {
  it('runs a second round (new page, not a repeat) when the first round falls short of the target', async () => {
    // Page 1 ("round 1") only has one viable product; page 2 ("round 2")
    // has another. The old code evaluated at most `productsTarget * 2`
    // already-fetched clusters and stopped — this proves it now goes back
    // for more instead of reporting 1/2 forever.
    const adOne = ad({ videoId: 'v1', storeId: 's1' });
    const adTwo = ad({ videoId: 'v2', storeId: 's2' });
    const { service, pipiads, suppliers } = buildService({
      pagesByKeyword: {
        1: { ads: [adOne], hasNext: false },
        2: { ads: [adTwo], hasNext: false },
      },
      details: {
        v1: detail('shop-one.com', 'product-one', 'Product One'),
        v2: detail('shop-two.com', 'product-two', 'Product Two'),
      },
      liveTitles: new Set(['Product One', 'Product Two']),
    });

    const result = await service.runWeek('2026-W44', { productsTarget: 2, creditBudget: 500 });

    expect(result.result.saved).toBe(2);
    expect(result.result.withSupplier).toBe(2);
    expect(result.result.rounds).toBe(2);
    expect(result.result.stoppedOnBudget).toBe(false);
    expect(result.result.stoppedOnEmptyPool).toBe(false);

    // Round 2 must ask for page 2, not re-request page 1.
    const pagesRequested = pipiads.searchDiscovery.mock.calls.map(
      (c) => (c[0] as Record<string, unknown>).current_page,
    );
    expect(pagesRequested).toEqual(expect.arrayContaining([1, 2]));
    expect(suppliers.findRelated.mock.calls.map((c) => c[0])).toEqual(
      expect.arrayContaining(['Product One', 'Product Two']),
    );
  });

  it('stops and reports stoppedOnEmptyPool when there are no more candidate ads to try', async () => {
    const adOne = ad({ videoId: 'v1', storeId: 's1' });
    const { service } = buildService({
      pagesByKeyword: {
        1: { ads: [adOne], hasNext: false },
        // page 2 onward: nothing — pool exhausted
      },
      details: { v1: detail('shop-one.com', 'product-one', 'Product One') },
      liveTitles: new Set(['Product One']),
    });

    const result = await service.runWeek('2026-W44', { productsTarget: 5, creditBudget: 500 });

    expect(result.result.saved).toBe(1);
    expect(result.result.rounds).toBe(2); // round 1 found one; round 2 found nothing new
    expect(result.result.stoppedOnEmptyPool).toBe(true);
    expect(result.result.stoppedOnBudget).toBe(false);
  });

  it('does not start a new round once the target is already met in round 1', async () => {
    const adOne = ad({ videoId: 'v1', storeId: 's1' });
    const { service, pipiads } = buildService({
      pagesByKeyword: { 1: { ads: [adOne], hasNext: false } },
      details: { v1: detail('shop-one.com', 'product-one', 'Product One') },
      liveTitles: new Set(['Product One']),
    });

    const result = await service.runWeek('2026-W44', { productsTarget: 1, creditBudget: 500 });

    expect(result.result.saved).toBe(1);
    expect(result.result.rounds).toBe(1);
    expect(pipiads.searchDiscovery).toHaveBeenCalledTimes(
      pipiads.searchDiscovery.mock.calls.length,
    );
    // Only round 1's plans were queried — no page-2 (or later) request at all.
    const pages = pipiads.searchDiscovery.mock.calls.map((c) => (c[0] as Record<string, unknown>).current_page);
    expect(pages.every((p) => p === 1)).toBe(true);
  });

  it('asks PipiAds for product-only ads and excludes known big-brand/entertainment keywords', async () => {
    // Confirmed live against the real PipiAds API: `exclude_word` genuinely
    // filters results, and `is_product` is accepted — both cut cost at the
    // request itself instead of paying 1 credit/ad to see, then reject for
    // free, the same app/game and big-brand/entertainment ads every run.
    const adOne = ad({ videoId: 'v1', storeId: 's1' });
    const { service, pipiads } = buildService({
      pagesByKeyword: { 1: { ads: [adOne], hasNext: false } },
      details: { v1: detail('shop-one.com', 'product-one', 'Product One') },
      liveTitles: new Set(['Product One']),
    });

    await service.runWeek('2026-W44', { productsTarget: 1, creditBudget: 500 });

    const params = pipiads.searchDiscovery.mock.calls[0]![0] as Record<string, unknown>;
    expect(params.is_product).toBe(true);
    const excludeWords = (params.exclude_word as Array<{ type: number; keyword: string }>).map(
      (w) => w.keyword,
    );
    expect(excludeWords).toEqual(expect.arrayContaining(['nike', 'apple', 'concert', 'album']));
  });
});

import { parseAdProductDetail } from '../integrations/pipiads/pipiads.provider';
import { parseShopifyProduct } from '../integrations/stores/shopify-store.client';
import { extractCjProducts, mapCjProduct } from '../integrations/suppliers/cj.provider';
import { SupplierOffer } from '../integrations/types';
import { categorize } from './discovery-categories';
import { buildClusters, clusterKeyFor, shopifyHandleFromUrl } from './discovery-cluster';
import { CreditBudget } from './credit-budget';
import { DiscoveredAd } from './discovery.types';
import { offerIsSameProduct } from '../integrations/suppliers/offer-relevance';
import {
  adRejectReason,
  dropshipFitReason,
  dropshipRejectReason,
  isMarketplaceDomain,
} from './dropship-filter';
import { computeTrendScore, DiscoveryMeta, saturationScore } from './trend-score';

const NOW = 1_800_000_000;
const DAY = 86_400;

function ad(over: Partial<DiscoveredAd> = {}): DiscoveredAd {
  return {
    videoId: 'v1',
    platform: 'tiktok',
    copy: 'This posture corrector fixed my back in a week',
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
  };
}

function detail(domain: string, handle: string, title = 'Posture Corrector Brace') {
  return {
    productId: 'p1',
    productTitle: title,
    productPrice: 29.99,
    productCurrency: 'USD',
    productImage: null,
    storeName: domain.split('.')[0],
    storeDomain: domain,
    landingUrl: `https://${domain}/products/${handle}?utm_source=tiktok`,
  };
}

function meta(over: Partial<DiscoveryMeta> = {}): DiscoveryMeta {
  return {
    version: 1,
    adCount: 3,
    stores: ['a.com', 'b.com', 'c.com'],
    advertisers: ['a', 'b', 'c'],
    platforms: ['tiktok'],
    firstSeenAt: NOW - 60 * DAY,
    lastSeenAt: NOW - DAY,
    maxPutDays: 45,
    plays: 900_000,
    likes: 20_000,
    comments: 800,
    shares: 400,
    aiTags: [],
    seeds: [],
    passes: ['sustained'],
    categoryKey: 'health_fitness',
    landingUrl: null,
    storeDomain: 'a.com',
    handle: null,
    priceEur: 34.9,
    compareAtEur: null,
    priceSource: 'store',
    ...over,
  };
}

const cjOffer: SupplierOffer = {
  source: 'cj',
  name: 'Posture corrector',
  listingUrl: 'https://cjdropshipping.com/product/-p-1.html',
  unitPriceEur: 4,
  shippingEstimateEur: 3,
  kind: 'live',
  listedCount: 120,
  fastShipping: true,
};

describe('dropship filter', () => {
  it('rejects big-brand products such as iPhone accessories', () => {
    expect(
      dropshipRejectReason({ title: 'Apple iPhone 15 Pro case', storeDomain: 'caseshop.com' }),
    ).toBe('brand');
  });

  it('rejects ads that land on a marketplace', () => {
    expect(isMarketplaceDomain('www.amazon.es')).toBe(true);
    expect(
      dropshipRejectReason({ title: 'Posture corrector', storeDomain: 'amazon.com' }),
    ).toBe('marketplace_store');
  });

  it('rejects products without a store or outside the price band', () => {
    expect(dropshipRejectReason({ title: 'Posture corrector', storeDomain: null })).toBe('no_store');
    expect(
      dropshipRejectReason({ title: 'Posture corrector', storeDomain: 'backfix.com', priceEur: 4 }),
    ).toBe('price_out_of_band');
  });

  it('accepts an independent-store gadget in the band', () => {
    expect(
      dropshipRejectReason({ title: 'Posture corrector brace', storeDomain: 'backfix.com', priceEur: 29 }),
    ).toBeNull();
  });

  it('rejects what a dropshipper cannot stock and ship (titles from the 2026-W42 run)', () => {
    const reason = (title: string, extra: Parameters<typeof dropshipFitReason>[0] = { title }) =>
      dropshipFitReason({ ...extra, title });
    expect(reason('Noble Impulse V4 Pro TradingView Version')).toBe('digital_or_service');
    expect(reason('Create Your Song')).toBe('digital_or_service');
    expect(reason('Best NAD+ Gummies')).toBe('ingestible');
    expect(reason('Puainta® Advanced Calming Chews for Dogs')).toBe('ingestible');
    expect(reason("Mama Sweatshirt with Children's Names on")).toBe('personalized');
    expect(reason('Personalized Graduation Class Birthstone Ring')).toBe('personalized');
    expect(reason('Gold Open Back Bezels – 172 Pcs Metal Resin Frames')).toBe('bulk_supplies');
    expect(reason('14K Solid Gold Tennis Bracelet')).toBe('fine_jewelry');
    expect(reason('Anything', { title: 'Anything', requiresShipping: false })).toBe('digital_or_service');
  });

  it('keeps common dropshipping products', () => {
    for (const title of [
      'InstaSeal Vacuum Sealer, LED Touch Control',
      'Mini Loop Stud Earrings',
      'APOLLO NECKLACE - GOLD',
      '18K Gold Plated Hoop Earrings',
      'Diamond Painting Kit for Adults',
      'App Controlled LED Strip Lights',
      'Electric Coffee Grinder',
      'Dog Chew Toy for Aggressive Chewers',
      'Drawing Tablet Stand',
      'Car License Plate Frame',
      'Posture Corrector Brace',
    ]) {
      expect([title, dropshipFitReason({ title })]).toEqual([title, null]);
    }
  });

  it('rejects apps, games and creator posts before spending a detail credit', () => {
    expect(adRejectReason(ad({ dataTypes: [6] }))).toBe('app_or_game');
    expect(adRejectReason(ad({ dataTypes: [4], storeId: null, shopType: null }))).toBe('creator_content');
    expect(adRejectReason(ad({ dataTypes: [1, 4] }))).toBeNull();
    expect(adRejectReason(ad({ dataTypes: [4], copy: '#ad use code SAVE10 posture corrector' }))).toBeNull();
    expect(adRejectReason(ad({ copy: 'Our new album world tour tickets are live' }))).toBe('entertainment');
    expect(adRejectReason(ad())).toBeNull();
  });
});

describe('supplier match', () => {
  it('needs half of the distinctive words for a keyword offer', () => {
    const title = 'InstaSeal Vacuum Sealer, LED Touch Control';
    expect(offerIsSameProduct({ name: 'Vacuum Sealer Machine LED Touch Food Saver' }, title)).toBe(true);
    expect(offerIsSameProduct({ name: 'LED Touch Lamp Control Switch' }, title)).toBe(false);
  });

  it('ignores generic and feature words like Pro, Gold, Mini or LED', () => {
    expect(
      offerIsSameProduct({ name: 'Pro V4 Gold Wireless Earbuds' }, 'Noble Impulse V4 Pro Gold'),
    ).toBe(false);
    expect(offerIsSameProduct({ name: 'Mini Hoop Loop Stud Earrings Set' }, 'Mini Loop Stud Earrings')).toBe(true);
  });

  it('accepts an image match with one shared distinctive word', () => {
    expect(
      offerIsSameProduct({ name: 'Women Pendant Necklace Chain', matchedBy: 'image' }, 'APOLLO NECKLACE - GOLD'),
    ).toBe(true);
    expect(offerIsSameProduct({ name: 'Necklace Chain' }, 'APOLLO NECKLACE - GOLD')).toBe(false);
  });
});

describe('clustering', () => {
  it('derives the cluster key from the Shopify handle', () => {
    expect(shopifyHandleFromUrl('https://x.com/products/posture-corrector-pro?v=1')).toBe(
      'posture-corrector-pro',
    );
    const key = clusterKeyFor(ad({ detail: detail('a.com', 'posture-corrector-pro-2024') }));
    expect(key).toBe('h:posture corrector');
  });

  it('returns no key for ads without a PipiAds detail', () => {
    expect(clusterKeyFor(ad())).toBeNull();
  });

  it('merges the same product sold by different stores', () => {
    const clusters = buildClusters([
      ad({ videoId: 'v1', detail: detail('a.com', 'posture-corrector') }),
      ad({
        videoId: 'v2',
        platform: 'facebook',
        storeId: 's2',
        detail: detail('b.com', 'posture-corrector-brace'),
      }),
      ad({ videoId: 'v3', detail: detail('c.com', 'led-galaxy-projector', 'LED Galaxy Projector') }),
    ]);
    expect(clusters).toHaveLength(2);
    const posture = clusters.find((c) => c.key.includes('posture'))!;
    expect(posture.stores.sort()).toEqual(['a.com', 'b.com']);
    expect(posture.platforms.sort()).toEqual(['facebook', 'tiktok']);
    expect(posture.priceEur).toBeCloseTo(27.59, 1);
    expect(posture.priceSource).toBe('pipiads');
  });
});

describe('PipiAds ad detail', () => {
  it('reads product, price and store landing, skipping social URLs', () => {
    const d = parseAdProductDetail({
      product_title: 'Posture Corrector',
      product_price: '29.99',
      product_currency: 'USD',
      ad_store: { name: 'Backfix', link: 'https://www.backfix.com' },
      app_url: 'https://backfix.com/products/posture-corrector',
      ad_url: 'https://www.tiktok.com/@backfix/video/1',
    });
    expect(d).toMatchObject({
      productTitle: 'Posture Corrector',
      productPrice: 29.99,
      storeDomain: 'backfix.com',
      landingUrl: 'https://backfix.com/products/posture-corrector',
    });
  });

  it('returns null when the ad carries no product info', () => {
    expect(parseAdProductDetail({ ad_url: 'https://www.tiktok.com/@x/video/1' })).toBeNull();
  });
});

describe('Shopify product parser', () => {
  it('takes the cheapest variant and the highest compare-at, in EUR', () => {
    const info = parseShopifyProduct(
      {
        product: {
          title: ' Posture Corrector ',
          product_type: 'Health',
          tags: 'posture, back',
          variants: [
            { price: '39.99', compare_at_price: '79.99' },
            { price: '29.99', compare_at_price: null },
          ],
          image: { src: 'https://cdn/x.jpg' },
        },
      },
      'EUR',
    );
    expect(info).toEqual({
      title: 'Posture Corrector',
      priceEur: 29.99,
      compareAtEur: 79.99,
      imageUrl: 'https://cdn/x.jpg',
      productType: 'Health',
      vendor: null,
      tags: ['posture', 'back'],
      requiresShipping: null,
    });
  });

  it('flags products where no variant ships', () => {
    const info = parseShopifyProduct(
      { product: { title: 'Song', variants: [{ price: '19', requires_shipping: false }] } },
      'USD',
    );
    expect(info?.requiresShipping).toBe(false);
  });

  it('returns null for non-product payloads', () => {
    expect(parseShopifyProduct({ errors: 'Not Found' }, 'USD')).toBeNull();
  });
});

describe('CJ mapper', () => {
  const payload = {
    code: 200,
    data: {
      content: [
        {
          productList: [
            {
              id: '123',
              nameEn: 'Posture Corrector Brace',
              sellPrice: '3.20-5.10',
              bigImage: 'https://cj/x.jpg',
              listedNum: 240,
              addMarkStatus: 1,
              inventoryInfo: '[{"countryCode":"US","totalInventory":50}]',
            },
            { id: '456', sellPrice: '2' },
          ],
        },
      ],
    },
  };

  it('flattens listV2 content', () => {
    expect(extractCjProducts(payload)).toHaveLength(2);
  });

  it('maps price (low end, USD → EUR), listing, stock and popularity', () => {
    const [first, nameless] = extractCjProducts(payload);
    const offer = mapCjProduct(first, 30);
    expect(offer).toMatchObject({
      source: 'cj',
      kind: 'live',
      externalId: '123',
      listingUrl: 'https://cjdropshipping.com/product/-p-123.html',
      unitPriceEur: 2.94,
      listedCount: 240,
      fastShipping: true,
    });
    expect(mapCjProduct(nameless)).toBeNull();
  });
});

describe('trend score', () => {
  it('saturation grows with stores and days', () => {
    expect(saturationScore(1, 3)).toBeLessThan(saturationScore(20, 120));
    expect(saturationScore(200, 400, 5000)).toBe(100);
  });

  it('classifies a sustained multi-store product as a winner with real margin', () => {
    const t = computeTrendScore(meta(), [cjOffer], NOW);
    expect(t.tier).toBe('winner');
    expect(t.marginPct).toBeGreaterThan(50);
    expect(t.total).toBeGreaterThan(40);
  });

  it('classifies a new fast-growing product as trending', () => {
    const t = computeTrendScore(
      meta({
        stores: ['a.com'],
        firstSeenAt: NOW - 5 * DAY,
        maxPutDays: 5,
        plays: 2_000_000,
      }),
      [cjOffer],
      NOW,
    );
    expect(t.tier).toBe('trending');
  });

  it('marks crowded long-running products as saturated and penalizes them', () => {
    const t = computeTrendScore(
      meta({
        stores: Array.from({ length: 40 }, (_, i) => `s${i}.com`),
        maxPutDays: 120,
      }),
      [cjOffer],
      NOW,
    );
    expect(t.tier).toBe('saturated');
    expect(t.saturationPenalty).toBeGreaterThan(0);
  });

  it('gives the cross-platform bonus for TikTok + Meta', () => {
    const t = computeTrendScore(meta({ platforms: ['tiktok', 'facebook'] }), [], NOW);
    expect(t.crossPlatformBonus).toBe(4);
    expect(t.margin).toBe(0);
  });
});

describe('credit budget', () => {
  it('splits 55/35/10 and lets buckets borrow only from reserve', () => {
    const b = new CreditBudget(100);
    expect(b.report().buckets).toEqual({
      discovery: { allocated: 55, spent: 0 },
      detail: { allocated: 35, spent: 0 },
      reserve: { allocated: 10, spent: 0 },
    });
    expect(b.take('detail', 50)).toBe(45);
    b.spend('detail', 40);
    expect(b.report().buckets.reserve.spent).toBe(5);
    expect(b.available('discovery')).toBe(60);
  });

  it('never hands out more than the total', () => {
    const b = new CreditBudget(50);
    b.spend('discovery', 50);
    expect(b.take('discovery', 10)).toBe(0);
    expect(b.take('detail', 10)).toBe(0);
    expect(b.report().exhausted).toBe(true);
  });
});

describe('categories', () => {
  it('maps a product title to its discovery category', () => {
    expect(categorize({ title: 'Self-cleaning slicker brush for dogs and cats' })).toBe('pets');
  });
});

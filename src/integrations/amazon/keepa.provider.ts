import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { amazonMarket, AmazonMarket, parseKeepaMarketCodes } from '../../common/amazon-markets';
import { AmazonProvider, CommercialSignal } from '../types';
import { FIXTURE_AMAZON_SIGNALS } from '../fixtures/seed-signals';

/** Keepa stats.current indices */
const IDX = {
  AMAZON: 0,
  NEW: 1,
  SALES: 3,
  RATING: 16,
  COUNT_REVIEWS: 17,
} as const;

/** High-signal browse nodes for bestsellers (not leaf-only). */
const BESTSELLER_CATEGORIES: Record<string, Array<{ id: number; label: string }>> = {
  US: [
    { id: 172282, label: 'Electronics' },
    { id: 1055398, label: 'Home & Kitchen' },
    { id: 3760911, label: 'Beauty & Personal Care' },
  ],
  ES: [
    { id: 599370031, label: 'Electrónica' },
    { id: 667049031, label: 'Informática' },
    { id: 599391031, label: 'Hogar y cocina' },
    { id: 6198054031, label: 'Belleza' },
  ],
  DE: [
    { id: 562066, label: 'Elektronik & Foto' },
    { id: 3167641, label: 'Küche, Haushalt & Wohnen' },
  ],
  FR: [
    { id: 13921051, label: 'High-Tech' },
    { id: 57004031, label: 'Cuisine & Maison' },
  ],
  IT: [
    { id: 412609031, label: 'Elettronica' },
    { id: 524015031, label: 'Casa e cucina' },
  ],
  UK: [
    { id: 560798, label: 'Electronics & Photo' },
    { id: 11052591, label: 'Home & Kitchen' },
  ],
  MX: [
    { id: 9482650011, label: 'Electrónicos' },
    { id: 9482610011, label: 'Hogar y Cocina' },
    { id: 11260452011, label: 'Belleza' },
  ],
};

type KeepaProduct = {
  asin: string;
  title?: string;
  brand?: string;
  manufacturer?: string;
  description?: string;
  monthlySold?: number;
  images?: Array<{ l?: string; m?: string }>;
  categoryTree?: Array<{ catId: number; name: string }>;
  stats?: { current?: number[] };
  rootCategory?: number;
};

type KeepaResponse = {
  products?: KeepaProduct[];
  bestSellersList?: { asinList?: string[]; categoryId?: number };
  tokensLeft?: number;
  tokensConsumed?: number;
  error?: string | { message?: string };
  refillRate?: number;
  refillIn?: number;
};

/**
 * Keepa Product API — Amazon data for Scout-ly V1.
 * Docs: https://keepa.com/#!api
 */
@Injectable()
export class KeepaAmazonProvider implements AmazonProvider {
  readonly name = 'keepa';
  private readonly logger = new Logger(KeepaAmazonProvider.name);
  private tokensLeft = 0;

  constructor(private readonly config: ConfigService) {}

  private get apiKey() {
    return this.config.get<string>('KEEPA_API_KEY')?.trim();
  }

  enabled() {
    return Boolean(this.apiKey) && this.config.get('AMAZON_PROVIDER') === 'keepa';
  }

  private marketFromCode(code?: string): AmazonMarket {
    return amazonMarket(code);
  }

  private marketsToIngest(countries?: string[]): string[] {
    if (countries?.length) return countries;
    return parseKeepaMarketCodes(this.config.get<string>('KEEPA_MARKETS'));
  }

  private perCategoryLimit(override?: number) {
    if (override != null && Number.isFinite(override) && override > 0) {
      return Math.min(Math.floor(override), 100);
    }
    return Number(this.config.get('KEEPA_PRODUCTS_PER_CATEGORY') ?? 15);
  }

  private async waitForTokensIfNeeded(need = 25) {
    for (let attempt = 0; attempt < 12; attempt++) {
      try {
        const res = await fetch(
          `https://api.keepa.com/token?key=${this.apiKey}`,
          { headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip' } },
        );
        const data = (await res.json()) as KeepaResponse;
        this.tokensLeft = data.tokensLeft ?? 0;
        if (this.tokensLeft >= need) return;

        const rate = data.refillRate || 5;
        const deficit = need - this.tokensLeft;
        const waitMs = Math.min(
          Math.ceil(deficit / rate) * 60_000 + 2_000,
          120_000,
        );
        this.logger.warn(
          `Keepa tokens=${this.tokensLeft} (need ${need}). Esperando ${Math.round(waitMs / 1000)}s…`,
        );
        await new Promise((r) => setTimeout(r, waitMs));
      } catch {
        await new Promise((r) => setTimeout(r, 15_000));
      }
    }
  }

  private async keepaGet(pathAndQuery: string): Promise<KeepaResponse> {
    const url = `https://api.keepa.com${pathAndQuery}${
      pathAndQuery.includes('?') ? '&' : '?'
    }key=${this.apiKey}`;

    for (let attempt = 0; attempt < 5; attempt++) {
      await this.waitForTokensIfNeeded(attempt === 0 ? 25 : 55);

      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip' },
      });

      if (res.status === 429) {
        this.logger.warn('Keepa 429 — esperando refill…');
        this.tokensLeft = 0;
        await new Promise((r) => setTimeout(r, 65_000));
        continue;
      }

      if (!res.ok) {
        throw new Error(`Keepa HTTP ${res.status}`);
      }

      const data = (await res.json()) as KeepaResponse;
      this.tokensLeft = data.tokensLeft ?? this.tokensLeft;

      if (data.error) {
        const msg =
          typeof data.error === 'string'
            ? data.error
            : data.error.message ?? JSON.stringify(data.error);
        // Token exhaustion sometimes comes as error payload
        if (/token/i.test(msg)) {
          this.tokensLeft = 0;
          await new Promise((r) => setTimeout(r, 65_000));
          continue;
        }
        throw new Error(`Keepa error: ${msg}`);
      }

      this.logger.debug(
        `Keepa ok tokensLeft=${data.tokensLeft} consumed=${data.tokensConsumed}`,
      );
      return data;
    }

    throw new Error('Keepa: sin tokens tras varios reintentos');
  }

  async collectWeeklyCandidates(
    countries?: string[],
    options?: { productsPerCategory?: number },
  ): Promise<CommercialSignal[]> {
    const marketCodes = this.marketsToIngest(countries);
    const perCategory = this.perCategoryLimit(options?.productsPerCategory);

    if (!this.enabled()) {
      return FIXTURE_AMAZON_SIGNALS.filter((s) => marketCodes.includes(s.country))
        .length
        ? FIXTURE_AMAZON_SIGNALS.filter((s) => marketCodes.includes(s.country))
        : FIXTURE_AMAZON_SIGNALS;
    }

    const all: CommercialSignal[] = [];
    for (const code of marketCodes) {
      const market = this.marketFromCode(code);
      const batch = await this.collectForMarket(market, perCategory);
      this.logger.log(
        `Keepa ${market.code}: ${batch.length} productos (≤${perCategory}/categoría)`,
      );
      all.push(...batch);
    }
    return all;
  }

  private async collectForMarket(
    market: AmazonMarket,
    perCategory: number,
  ): Promise<CommercialSignal[]> {
    const cats =
      BESTSELLER_CATEGORIES[market.code] ??
      BESTSELLER_CATEGORIES.ES ??
      [];
    const limit = perCategory;
    const asinSet = new Set<string>();
    const asinMeta = new Map<string, { rank: number; categoryLabel: string }>();

    for (const cat of cats) {
      try {
        const data = await this.keepaGet(
          `/bestsellers?domain=${market.keepaDomain}&category=${cat.id}`,
        );
        const asins = (data.bestSellersList?.asinList ?? []).slice(0, limit);
        asins.forEach((asin, index) => {
          if (!asinSet.has(asin)) {
            asinSet.add(asin);
            asinMeta.set(asin, {
              rank: index + 1,
              categoryLabel: cat.label,
            });
          }
        });
      } catch (error) {
        this.logger.warn(
          `Keepa bestsellers ${market.code}/${cat.label}: ${String(error)}`,
        );
      }
    }

    const asinList = [...asinSet];
    if (!asinList.length) return [];

    const products: CommercialSignal[] = [];
    const chunkSize = 10;
    for (let i = 0; i < asinList.length; i += chunkSize) {
      const chunk = asinList.slice(i, i + chunkSize);
      try {
        const mapped = await this.fetchProducts(chunk, market);
        for (const signal of mapped) {
          const meta = asinMeta.get(signal.externalId);
          if (meta && signal.rank == null) signal.rank = meta.rank;
          if (meta && signal.category === 'General') {
            signal.category = meta.categoryLabel;
          }
          products.push(signal);
        }
      } catch (error) {
        this.logger.warn(
          `Keepa product batch ${market.code}: ${String(error)}`,
        );
      }
    }
    return products;
  }

  private async fetchProducts(
    asins: string[],
    market: AmazonMarket,
  ): Promise<CommercialSignal[]> {
    const data = await this.keepaGet(
      `/product?domain=${market.keepaDomain}&asin=${asins.join(',')}&stats=30&rating=1&history=0`,
    );
    return (data.products ?? [])
      .map((p) => this.mapProduct(p, market))
      .filter((p): p is CommercialSignal => p != null);
  }

  private mapProduct(
    product: KeepaProduct,
    market: AmazonMarket,
  ): CommercialSignal | null {
    if (!product?.asin) return null;
    const current = product.stats?.current ?? [];
    const priceCents = this.positive(current[IDX.AMAZON]) ??
      this.positive(current[IDX.NEW]);
    const bsr = this.positive(current[IDX.SALES]);
    const ratingRaw = this.positive(current[IDX.RATING]);
    const reviewCount = this.positive(current[IDX.COUNT_REVIEWS]);
    const rating = ratingRaw != null ? ratingRaw / 10 : undefined;
    const monthlySold = this.positive(product.monthlySold);
    const tree = product.categoryTree ?? [];
    const category =
      tree.map((c) => c.name).filter(Boolean).slice(-2).join(' · ') ||
      tree[0]?.name ||
      'General';

    const imageId = product.images?.[0]?.l || product.images?.[0]?.m;
    const imageUrl = imageId
      ? `https://m.media-amazon.com/images/I/${imageId}`
      : undefined;

    return {
      source: 'amazon',
      externalId: product.asin,
      title: product.title ?? product.asin,
      imageUrl,
      category,
      country: market.code,
      price: priceCents != null ? priceCents / 100 : undefined,
      rank: bsr,
      demand: monthlySold,
      demandKind: monthlySold != null ? 'estimated' : 'unavailable',
      estimatedSales: monthlySold,
      estimatedSalesKind: monthlySold != null ? 'estimated' : 'unavailable',
      gmvKind: 'unavailable',
      growthPct: undefined,
      brand: product.brand ?? product.manufacturer ?? undefined,
      rating,
      reviewCount,
      description: product.description ?? undefined,
      amazonUrl: `https://www.${market.amazonHost}/dp/${product.asin}`,
      raw: {
        provider: 'keepa',
        keepaDomain: market.keepaDomain,
        amazonHost: market.amazonHost,
        rootCategory: product.rootCategory,
        labels: {
          estimatedSales: 'Ventas mensuales estimadas (Keepa)',
          demand: 'Demanda estimada (Keepa)',
          rating: 'Valoración Amazon',
          rank: 'Best Sellers Rank (BSR)',
        },
      },
    };
  }

  private positive(value: number | undefined | null): number | undefined {
    if (value == null || value < 0) return undefined;
    return value;
  }

  async lookupByAsinOrUrl(
    query: string,
    marketCode = 'ES',
  ): Promise<CommercialSignal | null> {
    const market = this.marketFromCode(marketCode);

    if (!this.enabled()) {
      const q = query.toLowerCase();
      return (
        FIXTURE_AMAZON_SIGNALS.find(
          (s) =>
            s.externalId.toLowerCase() === q ||
            s.title.toLowerCase().includes(q) ||
            query.includes(s.externalId),
        ) ?? null
      );
    }

    const asinMatch = query.match(/([A-Z0-9]{10})/i);
    const asin = asinMatch?.[1]?.toUpperCase();
    if (!asin) return null;

    let domainMarket = market;
    const hostMatch = query.match(/amazon\.([a-z.]+)/i);
    if (hostMatch) {
      const host = hostMatch[1].toLowerCase();
      const inferred = ['US', 'ES', 'DE', 'FR', 'IT', 'UK', 'CA', 'MX']
        .map((c) => amazonMarket(c))
        .find((m) => m.amazonHost.replace('amazon.', '').includes(host) || host.includes(m.amazonHost.replace('amazon.', '')));
      if (inferred) domainMarket = inferred;
    }

    const products = await this.fetchProducts([asin], domainMarket);
    return products[0] ?? null;
  }

  async getStatus() {
    const defaultPerCategory = this.perCategoryLimit();
    const configuredMarkets = this.marketsToIngest();
    const categoriesPerMarket = configuredMarkets.map((code) => ({
      market: code,
      categories: (
        BESTSELLER_CATEGORIES[code] ??
        BESTSELLER_CATEGORIES.ES ??
        []
      ).length,
    }));

    if (!this.enabled()) {
      return {
        enabled: false,
        tokensLeft: null,
        provider: 'fixture',
        defaultProductsPerCategory: defaultPerCategory,
        markets: configuredMarkets,
        categoriesPerMarket,
      };
    }
    const data = await this.keepaGet('/token');
    return {
      enabled: true,
      provider: 'keepa',
      tokensLeft: data.tokensLeft ?? null,
      refillRate: data.refillRate ?? null,
      refillIn: data.refillIn ?? null,
      defaultProductsPerCategory: defaultPerCategory,
      markets: configuredMarkets,
      categoriesPerMarket,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { amazonMarket, AmazonMarket, parseKeepaMarketCodes } from '../../common/amazon-markets';
import { AmazonProvider, CommercialSignal } from '../types';
import { FIXTURE_AMAZON_SIGNALS } from '../fixtures/seed-signals';
import {
  amazonIngestRejectReason,
  passesAmazonIngestFilters,
} from './product-filters';
import {
  keepaCategoriesForMarket,
  keepaCategoryLabels,
} from './keepa-categories';
import { bsrImprovementPct, growthFromSalesCsv } from './keepa-growth';

/** Keepa stats.current / csv indices */
const IDX = {
  AMAZON: 0,
  NEW: 1,
  SALES: 3,
  RATING: 16,
  COUNT_REVIEWS: 17,
} as const;

type KeepaProduct = {
  asin: string;
  title?: string;
  brand?: string;
  manufacturer?: string;
  description?: string;
  monthlySold?: number;
  images?: Array<{ l?: string; m?: string }>;
  categoryTree?: Array<{ catId: number; name: string }>;
  stats?: {
    current?: number[];
    avg?: number[];
    avg30?: number[];
    avg90?: number[];
  };
  salesRankDrops30?: number;
  salesRankDrops90?: number;
  rootCategory?: number;
  /** history=1 — csv[3] is sales rank series */
  csv?: unknown[];
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

export type KeepaIngestProgress = {
  market: string;
  step: string;
  categoriesDone: number;
  categoriesTotal: number;
  callsDone: number;
  elapsedMs: number;
  /** null until there's enough data (first category done) to estimate. */
  etaSeconds: number | null;
};

type ProgressTracker = {
  startedAt: number;
  categoriesDone: number;
  categoriesTotal: number;
  callsDone: number;
  onProgress?: (progress: KeepaIngestProgress) => void;
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
    options?: {
      productsPerCategory?: number;
      onProgress?: (progress: KeepaIngestProgress) => void;
    },
  ): Promise<CommercialSignal[]> {
    const marketCodes = this.marketsToIngest(countries);
    const perCategory = this.perCategoryLimit(options?.productsPerCategory);

    if (!this.enabled()) {
      return FIXTURE_AMAZON_SIGNALS.filter((s) => marketCodes.includes(s.country))
        .length
        ? FIXTURE_AMAZON_SIGNALS.filter((s) => marketCodes.includes(s.country))
        : FIXTURE_AMAZON_SIGNALS;
    }

    const categoriesTotal = marketCodes.reduce(
      (sum, code) => sum + keepaCategoriesForMarket(code).length,
      0,
    );
    const tracker: ProgressTracker = {
      startedAt: Date.now(),
      categoriesDone: 0,
      categoriesTotal,
      callsDone: 0,
      onProgress: options?.onProgress,
    };

    const all: CommercialSignal[] = [];
    for (const code of marketCodes) {
      const market = this.marketFromCode(code);
      const batch = await this.collectForMarket(market, perCategory, tracker);
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
    tracker: ProgressTracker,
  ): Promise<CommercialSignal[]> {
    const cats = keepaCategoriesForMarket(market.code);
    if (!cats.length) {
      this.logger.warn(`Keepa ${market.code}: sin categorías allowlist`);
    }
    const limit = perCategory;
    const asinSet = new Set<string>();
    const asinMeta = new Map<
      string,
      { rank: number; categoryLabels: string[] }
    >();

    for (const cat of cats) {
      try {
        const data = await this.keepaGet(
          `/bestsellers?domain=${market.keepaDomain}&category=${cat.id}`,
        );
        const asins = (data.bestSellersList?.asinList ?? []).slice(0, limit);
        asins.forEach((asin, index) => {
          const prev = asinMeta.get(asin);
          if (!prev) {
            asinSet.add(asin);
            asinMeta.set(asin, {
              rank: index + 1,
              categoryLabels: [cat.label],
            });
          } else if (!prev.categoryLabels.includes(cat.label)) {
            // Same ASIN in several browse nodes → tops por categoría separados
            prev.categoryLabels.push(cat.label);
          }
        });
      } catch (error) {
        this.logger.warn(
          `Keepa bestsellers ${market.code}/${cat.label}: ${String(error)}`,
        );
      }
      tracker.categoriesDone += 1;
      tracker.callsDone += 1;
      this.reportProgress(tracker, market.code, cat.label);
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
          if (meta) {
            if (signal.rank == null) signal.rank = meta.rank;
            signal.ingestCategories = meta.categoryLabels;
            // Primary display category = first browse allowlist hit
            if (meta.categoryLabels[0]) {
              signal.category = meta.categoryLabels[0];
            }
          }
          products.push(signal);
        }
      } catch (error) {
        this.logger.warn(
          `Keepa product batch ${market.code}: ${String(error)}`,
        );
      }
      tracker.callsDone += 1;
      this.reportProgress(tracker, market.code, 'productos');
    }
    return products;
  }

  private async fetchProducts(
    asins: string[],
    market: AmazonMarket,
  ): Promise<CommercialSignal[]> {
    // history=1 + stats=30 → avg30/avg90 + sales rank series for momentum
    const data = await this.keepaGet(
      `/product?domain=${market.keepaDomain}&asin=${asins.join(',')}&stats=30&rating=1&history=1`,
    );
    return (data.products ?? [])
      .map((p) => this.mapProduct(p, market))
      .filter((p): p is CommercialSignal => p != null)
      .filter((signal) => {
        const reason = amazonIngestRejectReason({
          title: signal.title,
          brand: signal.brand,
          category: signal.category,
        });
        if (reason) {
          this.logger.debug(
            `Keepa filter skip ${signal.externalId}: ${reason}`,
          );
          return false;
        }
        return true;
      });
  }

  /** % BSR improvement vs 30d average (positive = rising / better rank). */
  private computeGrowthPct30(product: KeepaProduct): number | undefined {
    const current = product.stats?.current ?? [];
    const avg30 = product.stats?.avg30 ?? product.stats?.avg ?? [];
    const bsrNow = this.positive(current[IDX.SALES]);
    const bsrAvg30 = this.positive(avg30[IDX.SALES]);
    if (bsrNow != null && bsrAvg30 != null) {
      return bsrImprovementPct(bsrAvg30, bsrNow);
    }
    const drops = this.positive(product.salesRankDrops30);
    if (drops != null && drops > 0) {
      return Number(Math.min(80, Math.log10(drops + 1) * 35).toFixed(1));
    }
    return undefined;
  }

  private computeGrowthPct7(product: KeepaProduct): number | undefined {
    const salesCsv = product.csv?.[IDX.SALES];
    return growthFromSalesCsv(salesCsv).growthPct7;
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

    const brand = product.brand ?? product.manufacturer ?? undefined;
    if (
      !passesAmazonIngestFilters({
        title: product.title ?? product.asin,
        brand,
        category,
      })
    ) {
      return null;
    }

    const growthPct30 = this.computeGrowthPct30(product);
    const growthPct7 = this.computeGrowthPct7(product);
    const growthPct = growthPct7 ?? growthPct30;
    const avg30 = product.stats?.avg30 ?? [];

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
      growthPct,
      growthPct7,
      growthPct30,
      brand,
      rating,
      reviewCount,
      description: product.description ?? undefined,
      amazonUrl: `https://www.${market.amazonHost}/dp/${product.asin}`,
      raw: {
        provider: 'keepa',
        keepaDomain: market.keepaDomain,
        amazonHost: market.amazonHost,
        rootCategory: product.rootCategory,
        salesRankDrops30: product.salesRankDrops30 ?? null,
        salesRankDrops90: product.salesRankDrops90 ?? null,
        bsrAvg30: this.positive(avg30[IDX.SALES]) ?? null,
        growthPct7: growthPct7 ?? null,
        growthPct30: growthPct30 ?? null,
        historyEnabled: true,
        labels: {
          estimatedSales: 'Ventas mensuales estimadas (Keepa)',
          demand: 'Demanda estimada (Keepa)',
          rating: 'Valoración Amazon',
          rank: 'Best Sellers Rank (BSR)',
          growthPct: 'Mejora BSR 7d (csv) o vs media 30d (Keepa)',
          growthPct7: 'Mejora BSR vs ~7 días (Keepa csv)',
          growthPct30: 'Mejora BSR vs media 30d (Keepa)',
        },
      },
    };
  }

  private positive(value: number | undefined | null): number | undefined {
    if (value == null || value < 0) return undefined;
    return value;
  }

  /**
   * ETA from two signals: real ms/call observed so far, and avg calls/category
   * observed so far (which implicitly folds in each category's share of the
   * product-fetch chunk calls). Self-corrects as the run progresses instead
   * of trying to predict Keepa's rate-limit behavior upfront.
   */
  private reportProgress(tracker: ProgressTracker, market: string, step: string) {
    if (!tracker.onProgress) return;
    const elapsedMs = Date.now() - tracker.startedAt;
    let etaSeconds: number | null = null;
    if (tracker.categoriesDone > 0 && tracker.callsDone > 0) {
      const msPerCall = elapsedMs / tracker.callsDone;
      const callsPerCategory = tracker.callsDone / tracker.categoriesDone;
      const remainingCategories = Math.max(
        tracker.categoriesTotal - tracker.categoriesDone,
        0,
      );
      const estimatedRemainingCalls = callsPerCategory * remainingCategories;
      etaSeconds = Math.round((estimatedRemainingCalls * msPerCall) / 1000);
    }
    tracker.onProgress({
      market,
      step,
      categoriesDone: tracker.categoriesDone,
      categoriesTotal: tracker.categoriesTotal,
      callsDone: tracker.callsDone,
      elapsedMs,
      etaSeconds,
    });
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

  /**
   * Free-text search (Keepa's own Amazon-search-backed `/search` endpoint).
   * Used to resolve a candidate title (e.g. from an image search on a
   * supplier) into real Amazon products — unlike lookupByAsinOrUrl, no ASIN
   * needs to be present in the input.
   */
  async searchByKeyword(
    term: string,
    marketCode = 'ES',
    limit = 5,
  ): Promise<CommercialSignal[]> {
    const market = this.marketFromCode(marketCode);
    const query = term.trim().slice(0, 100);
    if (!query) return [];

    if (!this.enabled()) {
      const q = query.toLowerCase();
      return FIXTURE_AMAZON_SIGNALS.filter(
        (s) => s.country === market.code && s.title.toLowerCase().includes(q),
      ).slice(0, limit);
    }

    const data = await this.keepaGet(
      `/search?domain=${market.keepaDomain}&type=product&term=${encodeURIComponent(query)}`,
    );
    const asins = (data.products ?? [])
      .map((p) => p.asin)
      .filter((a): a is string => Boolean(a))
      .slice(0, Math.max(limit, 5));
    if (!asins.length) return [];

    return (await this.fetchProducts(asins, market)).slice(0, limit);
  }

  async getStatus() {
    const defaultPerCategory = this.perCategoryLimit();
    const configuredMarkets = this.marketsToIngest();
    const categoriesPerMarket = configuredMarkets.map((code) => {
      const labels = this.ingestCategoryLabels(code);
      return {
        market: code,
        categories: labels.length,
        labels,
      };
    });

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

  /** Browse-node allowlist labels used at ingest (tops por categoría). */
  ingestCategoryLabels(marketCode?: string): string[] {
    return keepaCategoryLabels(marketCode);
  }
}

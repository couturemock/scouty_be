import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { jsonSafe } from '../common/json-safe';
import { shipToCountry } from '../common/ship-to';
import { computeAdClusterScore } from '../integrations/ads/ad-score';
import { DropshipPrefilterProvider } from '../integrations/openai/dropship-prefilter.provider';
import { PipiAdsCacheService } from '../integrations/pipiads/pipiads-cache.service';
import { PipiAdsClient } from '../integrations/pipiads/pipiads.client';
import { PipiAdsProvider } from '../integrations/pipiads/pipiads.provider';
import { ShopifyStoreClient } from '../integrations/stores/shopify-store.client';
import { offerIsSameProduct } from '../integrations/suppliers/offer-relevance';
import { SuppliersService } from '../integrations/suppliers/suppliers.service';
import { SupplierOffer } from '../integrations/types';
import { Product } from '../products/product.entity';
import { ProductSnapshot } from '../snapshots/product-snapshot.entity';
import { CreditBudget, CreditBudgetReport, DEFAULT_WEEKLY_CREDITS } from './credit-budget';
import { buildClusters } from './discovery-cluster';
import {
  categorize,
  categoryLabel,
  DISCOVERY_CATEGORIES,
} from './discovery-categories';
import { DiscoveredAd, DiscoveryPass, ProductCluster } from './discovery.types';
import {
  adRejectReason,
  DEFAULT_PRICE_BAND,
  dropshipRejectReason,
  PriceBand,
} from './dropship-filter';
import {
  bestLandedOffer,
  computeTrendScore,
  DiscoveryMeta,
  marginFor,
  TrendScoreBreakdown,
} from './trend-score';

const DAY = 86_400;
const DEFAULT_SHOP_TYPES = ['shopify', 'woocommerce', 'shoplazza', 'shopline', 'shopyy'];
/**
 * Share of the discovery bucket spent on the four broad passes (new/sustained
 * × TikTok/Meta); the rest goes to category seed passes. Raised from 0.65:
 * categories for rankings now come from reclassifying the broad pool with
 * `categorize()` (`discoveryMetaFor` below), not from paying a dedicated
 * list pass per category — seed passes are now just a small fallback to fill
 * a near-empty category, not the primary way categories get populated.
 */
const BROAD_PASS_SHARE = 0.9;
const LIST_PAGE_SIZE = 50;

export type DiscoveryProgress = {
  step: string;
  done: number;
  total: number;
  creditsSpent: number;
};

export type DiscoveryResult = {
  adsSeen: number;
  adsRejected: Record<string, number>;
  adsDetailed: number;
  clusters: number;
  productsRejected: Record<string, number>;
  saved: number;
  withSupplier: number;
  credits: number;
};

type ListPlan = {
  pass: DiscoveryPass;
  seed?: string;
  params: Record<string, unknown>;
  quota: number;
  pageSize: number;
};

export const MAX_PRODUCTS_TARGET = 200;
export const DEFAULT_PRODUCTS_TARGET = 100;
/** PipiAds regions scanned for the global catalogue (English + main EU dropshipping markets). */
const DEFAULT_REGIONS = ['US', 'GB', 'CA', 'AU', 'ES', 'DE', 'FR', 'IT'];
function emptyResult(): DiscoveryResult {
  return {
    adsSeen: 0,
    adsRejected: {},
    adsDetailed: 0,
    clusters: 0,
    productsRejected: {},
    saved: 0,
    withSupplier: 0,
    credits: 0,
  };
}

function inc(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!, i);
    }
  });
  await Promise.all(workers);
  return out;
}

function cleanTitle(title: string): string {
  return title
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

/**
 * Weekly ads-first snapshot (Minea-style): filtered PipiAds scans of store
 * product ads on TikTok + Meta → dropshipping filter → product clusters →
 * live store price → CJ/AliExpress cost → Trend Score. Keepa is not used.
 */
@Injectable()
export class TrendDiscoveryService {
  private readonly logger = new Logger(TrendDiscoveryService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly pipiads: PipiAdsProvider,
    private readonly pipiadsClient: PipiAdsClient,
    private readonly pipiadsCache: PipiAdsCacheService,
    private readonly aiPrefilter: DropshipPrefilterProvider,
    private readonly suppliers: SuppliersService,
    private readonly store: ShopifyStoreClient,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductSnapshot)
    private readonly snapshots: Repository<ProductSnapshot>,
  ) {}

  enabled() {
    return this.pipiads.enabled();
  }

  regions(): string[] {
    const raw = this.config.get<string>('DISCOVERY_REGIONS')?.trim();
    const list = raw ? raw.split(',').map((m) => m.trim().toUpperCase()).filter(Boolean) : [];
    return list.length ? list : DEFAULT_REGIONS;
  }

  /** Destination for CJ/AliExpress shipping quotes; also stored as `product.country`. */
  shipTo(): string {
    return shipToCountry({ SHIP_TO_COUNTRY: this.config.get<string>('SHIP_TO_COUNTRY') });
  }

  productsTarget(requested?: number): number {
    const n = Number(requested ?? this.config.get('DISCOVERY_PRODUCTS_TARGET') ?? DEFAULT_PRODUCTS_TARGET);
    return Number.isFinite(n) && n > 0
      ? Math.min(Math.floor(n), MAX_PRODUCTS_TARGET)
      : DEFAULT_PRODUCTS_TARGET;
  }

  creditBudget(requested?: number): number {
    const n = Number(requested ?? this.config.get('PIPIADS_WEEKLY_CREDITS') ?? DEFAULT_WEEKLY_CREDITS);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_WEEKLY_CREDITS;
  }

  /** Whole weekly run, one global catalogue; the budget is capped by the account's real remaining credits. */
  async runWeek(
    weekKey: string,
    opts: {
      productsTarget: number;
      creditBudget: number;
      onProgress?: (p: DiscoveryProgress) => void;
    },
  ) {
    this.pipiadsCache.resetStats();
    let total = opts.creditBudget;
    let pipiadsRemaining: number | null = null;
    if (this.enabled()) {
      const credits = await this.pipiadsClient.getCredits().catch(() => null);
      pipiadsRemaining = credits?.remaining ?? null;
      if (pipiadsRemaining != null && pipiadsRemaining < total) {
        this.logger.warn(
          `PipiAds: presupuesto ${total} > créditos restantes ${pipiadsRemaining}; se usa ${pipiadsRemaining}`,
        );
        total = pipiadsRemaining;
      }
    } else {
      this.logger.warn('PipiAds deshabilitado (sin PIPIADS_API_KEY): snapshot vacío');
      total = 0;
    }

    const budget = new CreditBudget(total);
    let result: DiscoveryResult = emptyResult();
    if (total > 0) {
      try {
        result = await this.run(weekKey, {
          productsTarget: opts.productsTarget,
          budget,
          onProgress: opts.onProgress,
        });
      } catch (err) {
        this.logger.warn(`Discovery falló: ${err}`);
        result = { ...emptyResult(), credits: budget.spent };
      }
    }
    const spent = budget.spent;
    const cache = this.pipiadsCache.stats();
    this.logger.log(
      `PipiAds cache week=${weekKey}: hits=${cache.hits} misses=${cache.misses} (créditos reales ahorrados por hit)`,
    );
    return {
      budget: { total, requested: opts.creditBudget, spent, remaining: Math.max(0, total - spent) },
      result: { ...result, budget: budget.report() as CreditBudgetReport },
      pipiadsRemaining: pipiadsRemaining != null ? Math.max(0, pipiadsRemaining - spent) : null,
      cache,
    };
  }

  private shopTypes(): string[] {
    const raw = this.config.get<string>('DISCOVERY_SHOP_TYPES')?.trim();
    return raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : DEFAULT_SHOP_TYPES;
  }

  priceBand(): PriceBand {
    const min = Number(this.config.get('DISCOVERY_MIN_PRICE_EUR') ?? DEFAULT_PRICE_BAND.minEur);
    const max = Number(this.config.get('DISCOVERY_MAX_PRICE_EUR') ?? DEFAULT_PRICE_BAND.maxEur);
    return {
      minEur: Number.isFinite(min) ? min : DEFAULT_PRICE_BAND.minEur,
      maxEur: Number.isFinite(max) ? max : DEFAULT_PRICE_BAND.maxEur,
    };
  }

  /**
   * Query plan, calibrated against the live API (2026-10-12):
   * - `is_app:false` combined with other filters returns 0 results → not used.
   * - Meta + data_type [1] returns 0 → Meta uses [3] only.
   * - Unbounded `put_day_min:30` surfaces brand stores running for years → capped at 120.
   * - `button` is ignored by the API (same totals with/without) → not used.
   */
  private listPlans(discoveryCredits: number, nowSec: number): ListPlan[] {
    const base = {
      region: this.regions(),
      shop_type: this.shopTypes(),
      ad_state: 1,
    };
    const dataType = (plat: 1 | 2) => (plat === 1 ? [1, 3] : [3]);
    const broadQuota = Math.floor((discoveryCredits * BROAD_PASS_SHARE) / 4);
    const plans: ListPlan[] = [];
    for (const plat of [1, 2] as const) {
      plans.push({
        pass: 'new',
        quota: broadQuota,
        pageSize: LIST_PAGE_SIZE,
        params: {
          ...base,
          plat_type: plat,
          data_type: dataType(plat),
          first_time_start: nowSec - 14 * DAY,
          first_time_end: nowSec,
          sort: 6,
        },
      });
      plans.push({
        pass: 'sustained',
        quota: broadQuota,
        pageSize: LIST_PAGE_SIZE,
        params: {
          ...base,
          plat_type: plat,
          data_type: dataType(plat),
          put_day_min: 30,
          put_day_max: 120,
          sort: 4,
        },
      });
    }

    const seeds = DISCOVERY_CATEGORIES.flatMap((c) => c.seeds);
    const seedCredits = Math.max(0, discoveryCredits - broadQuota * 4);
    const perSeed = Math.floor(seedCredits / Math.max(seeds.length * 2, 1));
    const seedPage = Math.min(20, perSeed);
    if (seedPage >= 5) {
      for (const seed of seeds) {
        for (const plat of [1, 2] as const) {
          plans.push({
            pass: 'seed',
            seed,
            quota: seedPage,
            pageSize: seedPage,
            params: {
              ...base,
              plat_type: plat,
              data_type: dataType(plat),
              extend_keywords: [{ type: 1, keyword: seed }],
              is_participle: false,
              last_time_start: nowSec - 30 * DAY,
              last_time_end: nowSec,
              sort: 4,
            },
          });
        }
      }
    }
    return plans;
  }

  private async collectAds(
    budget: CreditBudget,
    nowSec: number,
    progress: (step: string, done: number, total: number) => void,
  ): Promise<DiscoveredAd[]> {
    const market = this.shipTo();
    const plans = this.listPlans(budget.available('discovery'), nowSec);
    const byId = new Map<string, DiscoveredAd>();
    for (const [i, plan] of plans.entries()) {
      progress('discovery', i, plans.length);
      let spentOnPlan = 0;
      for (let page = 1; spentOnPlan < plan.quota; page += 1) {
        const size = budget.take('discovery', Math.min(plan.pageSize, plan.quota - spentOnPlan));
        if (size <= 0) break;
        try {
          const { ads, creditsUsed, hasNext } = await this.pipiads.searchDiscovery(
            { ...plan.params, current_page: page, page_size: size },
            { country: market, pass: plan.pass, seed: plan.seed },
          );
          budget.spend('discovery', creditsUsed);
          spentOnPlan += Math.max(creditsUsed, 1);
          for (const ad of ads) {
            if (!byId.has(ad.videoId)) byId.set(ad.videoId, ad);
          }
          if (!hasNext || ads.length < size) break;
        } catch (err) {
          this.logger.warn(`Discovery ${plan.pass}${plan.seed ? `:${plan.seed}` : ''} p${page}: ${err}`);
          break;
        }
      }
      if (budget.available('discovery') <= 0) break;
    }
    return [...byId.values()];
  }

  /** Engagement per day running — which ads deserve a detail credit first. */
  private detailPriority(ad: DiscoveredAd) {
    const days = Math.max(ad.putDays, 1);
    return Math.log10(ad.plays / days + 1) * 2 + Math.log10(ad.likes + 1) + (ad.pass === 'seed' ? 0.5 : 0);
  }

  private async detailAds(
    ads: DiscoveredAd[],
    budget: CreditBudget,
    progress: (step: string, done: number, total: number) => void,
  ): Promise<number> {
    const perStore = new Map<string, number>();
    let queue = [...ads]
      .sort((a, b) => this.detailPriority(b) - this.detailPriority(a))
      .filter((ad) => {
        // Single-product stores dominate dropshipping: two details per store
        // is enough to learn what it sells; the rest inherit below.
        const key = ad.storeId ?? ad.videoId;
        const n = perStore.get(key) ?? 0;
        perStore.set(key, n + 1);
        return n < 2;
      });

    // OpenAI pre-filter: cheap classification BEFORE paying a detail credit.
    // Used instead of more PipiAds spend to be sure, never alongside it — a
    // missing/failed verdict means "let it through" (the detail credit gate
    // right below still caps how many actually get spent).
    if (this.aiPrefilter.enabled() && queue.length) {
      const verdicts = await this.aiPrefilter.filter(queue);
      const before = queue.length;
      queue = queue.filter((ad) => verdicts.get(ad.videoId)?.apto !== false);
      if (verdicts.size) {
        this.logger.log(
          `OpenAI prefilter: ${before - queue.length}/${before} descartados antes de adspy/detail`,
        );
      }
    }

    const toDetail = queue.slice(0, budget.take('detail', queue.length));
    let done = 0;
    await mapLimit(toDetail, 3, async (ad) => {
      if (budget.take('detail', 1) <= 0) return;
      try {
        const { detail, creditsUsed } = await this.pipiads.adProductDetail(ad.videoId);
        budget.spend('detail', creditsUsed);
        if (detail) ad.detail = detail;
      } catch (err) {
        this.logger.debug(`Detail ${ad.videoId}: ${err}`);
      }
      done += 1;
      if (done % 20 === 0) progress('detail', done, toDetail.length);
    });

    // Undetailed ads of a store that sells exactly one detailed product
    // inherit that product (same store, same landing).
    const productsByStore = new Map<string, Set<string>>();
    const detailByStore = new Map<string, DiscoveredAd>();
    for (const ad of ads) {
      if (!ad.detail || !ad.storeId) continue;
      const id = ad.detail.productId ?? ad.detail.landingUrl ?? ad.detail.productTitle ?? '';
      productsByStore.set(ad.storeId, (productsByStore.get(ad.storeId) ?? new Set()).add(id));
      detailByStore.set(ad.storeId, ad);
    }
    for (const ad of ads) {
      if (ad.detail || !ad.storeId) continue;
      if (productsByStore.get(ad.storeId)?.size !== 1) continue;
      ad.detail = detailByStore.get(ad.storeId)!.detail;
    }
    return toDetail.length;
  }

  private discoveryMetaFor(cluster: ProductCluster, categoryKey: string): DiscoveryMeta {
    return {
      version: 1,
      adCount: cluster.ads.length,
      stores: cluster.stores,
      advertisers: cluster.advertisers,
      platforms: cluster.platforms,
      firstSeenAt: cluster.firstSeenAt,
      lastSeenAt: cluster.lastSeenAt,
      maxPutDays: cluster.maxPutDays,
      plays: cluster.plays,
      likes: cluster.likes,
      comments: cluster.comments,
      shares: cluster.shares,
      aiTags: cluster.aiTags.slice(0, 20),
      seeds: cluster.seeds,
      passes: [...new Set(cluster.ads.map((a) => a.pass))],
      categoryKey,
      landingUrl: cluster.landingUrl,
      storeDomain: cluster.storeDomain,
      handle: cluster.handle,
      priceEur: cluster.priceEur,
      compareAtEur: cluster.store?.compareAtEur ?? null,
      priceSource: cluster.priceSource,
    };
  }

  private async enrichFromStore(clusters: ProductCluster[]) {
    await mapLimit(clusters, this.store.concurrency(), async (c) => {
      if (!c.storeDomain || !c.handle) return;
      const currency = c.ads.find((a) => a.detail?.productCurrency)?.detail?.productCurrency ?? null;
      const info = await this.store.fetchProduct(c.storeDomain, c.handle, currency);
      c.store = info;
      if (!info) return;
      if (info.priceEur != null) {
        c.priceEur = info.priceEur;
        c.priceSource = 'store';
      }
      if (info.title) c.title = cleanTitle(info.title);
      if (info.imageUrl) c.imageUrl = info.imageUrl;
    });
  }

  private async run(
    weekKey: string,
    opts: {
      productsTarget: number;
      budget: CreditBudget;
      onProgress?: (p: DiscoveryProgress) => void;
    },
  ): Promise<DiscoveryResult> {
    const market = this.shipTo();
    const { budget, productsTarget } = opts;
    const nowSec = Math.floor(Date.now() / 1000);
    const band = this.priceBand();
    const progress = (step: string, done: number, total: number) =>
      opts.onProgress?.({ step, done, total, creditsSpent: budget.spent });
    const startSpent = budget.spent;

    const result = emptyResult();

    // 1. Filtered ad scans (TikTok + Meta, new + sustained + category seeds).
    const ads = await this.collectAds(budget, nowSec, progress);
    result.adsSeen = ads.length;

    // 2. Ad-level dropshipping gate (free: list fields only).
    const candidates = ads.filter((ad) => {
      const reason = adRejectReason(ad);
      if (reason) inc(result.adsRejected, reason);
      return !reason;
    });

    // 3. Product identity: detail (1 credit) for the strongest ads.
    progress('detail', 0, candidates.length);
    result.adsDetailed = await this.detailAds(candidates, budget, progress);

    // 4. Cluster into products + product-level gate.
    progress('cluster', 0, 1);
    const productLevel = (c: ProductCluster) => {
      const rep = c.ads.find((a) => a.detail?.storeName) ?? c.ads[0];
      return dropshipRejectReason(
        {
          title: c.title,
          storeDomain: c.storeDomain,
          storeName: rep?.detail?.storeName ?? null,
          advertiser: rep?.advertiser ?? null,
          priceEur: c.priceEur,
          productType: c.store?.productType,
          tags: c.store?.tags,
          requiresShipping: c.store?.requiresShipping,
        },
        band,
      );
    };
    let clusters = buildClusters(candidates).filter((c) => {
      const reason = productLevel(c);
      if (reason) inc(result.productsRejected, reason);
      return !reason;
    });
    result.clusters = clusters.length;

    // 5. Rank by ad signals alone, then spend the free/cheap enrichment on the best.
    const preScore = (c: ProductCluster) =>
      computeTrendScore(this.discoveryMetaFor(c, 'other'), [], nowSec).total;
    clusters.sort((a, b) => preScore(b) - preScore(a));
    clusters = clusters.slice(0, Math.min(productsTarget * 2, 400));

    progress('store', 0, clusters.length);
    await this.enrichFromStore(clusters);
    clusters = clusters.filter((c) => {
      const reason = productLevel(c);
      if (reason) inc(result.productsRejected, reason);
      return !reason;
    });

    // 6. Suppliers (CJ + AliExpress) for the shortlist; CJ freight for the final picks.
    // Products without a verified supplier are dropped, so look up a wider list.
    const shortlist = clusters.slice(0, productsTarget * 2);
    let supplierDone = 0;
    await mapLimit(shortlist, 2, async (c) => {
      try {
        const offers = await this.suppliers.findRelated(
          c.title,
          6,
          c.priceEur ?? undefined,
          market,
          c.imageUrl,
        );
        c.suppliers = offers.filter((o) => o.kind !== 'live' || offerIsSameProduct(o, c.title));
      } catch (err) {
        this.logger.warn(`Suppliers "${c.title.slice(0, 40)}": ${err}`);
        c.suppliers = [];
      }
      supplierDone += 1;
      if (supplierDone % 5 === 0) progress('suppliers', supplierDone, shortlist.length);
    });

    type Scored = { cluster: ProductCluster; meta: DiscoveryMeta; trend: TrendScoreBreakdown; live: boolean };
    const scored: Scored[] = shortlist.map((cluster) => {
      const categoryKey = categorize({
        title: cluster.title,
        tags: cluster.aiTags,
        productType: cluster.store?.productType,
        seeds: cluster.seeds,
      });
      const meta = this.discoveryMetaFor(cluster, categoryKey);
      const offers = cluster.suppliers ?? [];
      return {
        cluster,
        meta,
        trend: computeTrendScore(meta, offers, nowSec),
        live: offers.some((o) => o.kind === 'live'),
      };
    });
    for (const s of scored) if (!s.live) inc(result.productsRejected, 'no_supplier_match');
    const picks = scored
      .filter((s) => s.live)
      .sort((a, b) => b.trend.total - a.trend.total)
      .slice(0, productsTarget);

    progress('shipping', 0, picks.length);
    for (const pick of picks) {
      if (!pick.live) continue;
      pick.cluster.suppliers = await this.suppliers.withShipping(pick.cluster.suppliers ?? [], market);
      pick.trend = computeTrendScore(pick.meta, pick.cluster.suppliers, nowSec);
    }

    // 7. Persist.
    progress('save', 0, picks.length);
    for (const [i, pick] of picks.entries()) {
      try {
        await this.saveProduct(weekKey, market, pick.cluster, pick.meta, pick.trend);
        result.saved += 1;
        if (pick.live) result.withSupplier += 1;
      } catch (err) {
        this.logger.warn(`Save "${pick.cluster.title.slice(0, 40)}": ${err}`);
      }
      if (i % 10 === 0) progress('save', i, picks.length);
    }

    result.credits = budget.spent - startSpent;
    this.logger.log(
      `Discovery week=${weekKey} regions=${this.regions().join(',')} shipTo=${market}: ads=${result.adsSeen} detailed=${result.adsDetailed} clusters=${result.clusters} saved=${result.saved} withSupplier=${result.withSupplier} credits=${result.credits} adsRejected=${JSON.stringify(result.adsRejected)} productsRejected=${JSON.stringify(result.productsRejected)}`,
    );
    return result;
  }

  private async saveProduct(
    weekKey: string,
    market: string,
    cluster: ProductCluster,
    meta: DiscoveryMeta,
    trend: TrendScoreBreakdown,
  ) {
    const hash = createHash('sha1').update(cluster.key).digest('hex').slice(0, 12);
    const slug = `d-${hash}-${weekKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const offers: SupplierOffer[] = cluster.suppliers ?? [];
    const best = bestLandedOffer(offers);
    const margin = marginFor(cluster.priceEur, best);
    const fees = cluster.priceEur ? Number((cluster.priceEur * 0.15).toFixed(2)) : null;
    const creatives = [...cluster.ads]
      .sort((a, b) => b.plays - a.plays)
      .slice(0, 12)
      .map((a) => a.creative);

    const product =
      (await this.products.findOne({ where: { slug } })) ??
      this.products.create({ slug, title: cluster.title });
    product.slug = slug;
    product.title = cleanTitle(cluster.title) || 'Producto';
    product.imageUrl = cluster.imageUrl;
    product.category = categoryLabel(meta.categoryKey, market);
    product.country = market;
    product.sources = [
      'ads',
      ...(meta.priceSource === 'store' ? ['store'] : []),
      ...(offers.some((o) => o.kind === 'live' && o.source === 'cj') ? ['cj'] : []),
      ...(offers.some((o) => o.kind === 'live' && o.source === 'aliexpress') ? ['aliexpress'] : []),
    ];
    product.amazonAsin = null;
    product.amazonUrl = null;
    product.catalogWeekKey = weekKey;
    product.currentPrice = cluster.priceEur != null ? String(cluster.priceEur) : null;
    product.currentRank = null;
    product.estimatedSales = null;
    product.estimatedSalesKind = 'unavailable';
    product.gmv = null;
    product.gmvKind = 'unavailable';
    product.growthPct = null;
    product.brand = null;
    product.rating = null;
    product.reviewCount = null;
    product.description = null;
    product.estimatedMarginPct = margin ? String(margin.marginPct) : null;
    product.estimatedProfit = margin ? String(margin.profit) : null;
    product.meta = jsonSafe({
      discovery: { ...meta, scoreBreakdown: trend },
      ingestCategories: [product.category],
      suppliers: offers,
      profitability: {
        salePrice: cluster.priceEur,
        supplierCost: best?.unitPriceEur ?? null,
        shipping: best?.shippingEstimateEur ?? null,
        fees,
        estimatedProfit: margin?.profit ?? null,
        marginPct: margin?.marginPct ?? null,
        available: Boolean(margin),
        priceSource: meta.priceSource,
      },
      adScore: computeAdClusterScore(creatives, cluster.advertisers),
      creativeIntelligence: {
        ads: creatives,
        provider: 'pipiads',
        fetchedAt: new Date().toISOString(),
        fromSnapshot: true,
        disclaimer:
          'Anuncios reales de PipiAds (TikTok/Meta): reproducciones, likes y días activos son señales públicas, no ventas.',
      },
      labels: {
        currentPrice: meta.priceSource === 'store' ? 'PVP en tienda (live)' : 'PVP según PipiAds',
        estimatedMarginPct: 'Margen estimado',
        estimatedProfit: 'Beneficio estimado por unidad',
        dropSniperScore: 'Trend Score 0–100',
      },
    });
    await this.products.save(product);

    const snapshot =
      (await this.snapshots.findOne({ where: { productId: product.id, weekKey } })) ??
      this.snapshots.create({ productId: product.id, weekKey });
    snapshot.rank = null;
    snapshot.price = product.currentPrice;
    snapshot.demand = String(meta.plays);
    snapshot.demandKind = 'estimated';
    snapshot.estimatedSales = null;
    snapshot.estimatedSalesKind = 'unavailable';
    snapshot.gmv = null;
    snapshot.gmvKind = 'unavailable';
    snapshot.growthPct = null;
    snapshot.signals = jsonSafe({
      source: 'pipiads',
      stores: meta.stores.length,
      adCount: meta.adCount,
      plays: meta.plays,
      maxPutDays: meta.maxPutDays,
      priceSource: meta.priceSource,
      trendScore: trend.total,
      saturation: trend.saturation,
      suppliers: offers,
    });
    await this.snapshots.save(snapshot);
    return product;
  }
}

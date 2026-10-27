import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogService } from '../catalog/catalog.service';
import { CreativeIntelligenceService } from '../creative/creative-intelligence.service';
import { currentWeekKey, previousWeekKey } from '../common/week';
import { categoryLabelsForMarket } from '../discovery/discovery-categories';
import { TrendDiscoveryService } from '../discovery/trend-discovery.service';
import {
  KeepaAmazonProvider,
  KeepaIngestProgress,
} from '../integrations/amazon/keepa.provider';
import { passesAmazonIngestFilters } from '../integrations/amazon/product-filters';
import { SuppliersService } from '../integrations/suppliers/suppliers.service';
import { offerMatchesSeed } from '../integrations/suppliers/offer-relevance';
import { CommercialSignal, SupplierOffer } from '../integrations/types';
import { RankingEntry } from '../rankings/ranking-entry.entity';
import { ProductSnapshot } from '../snapshots/product-snapshot.entity';
import { Product } from './product.entity';
import {
  computeAliExpressMarketSignal,
  computeDropSniperScore,
  hasAnySupplier,
  hasViableSupplier,
  isTrendingCandidate,
  isWinnerCandidate,
} from './drop-sniper.score';
import { TrendScoreBreakdown, WINNER_MIN_DAYS } from '../discovery/trend-score';

type CatalogView = 'published' | 'draft';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductSnapshot)
    private readonly snapshots: Repository<ProductSnapshot>,
    @InjectRepository(RankingEntry)
    private readonly rankings: Repository<RankingEntry>,
    private readonly amazon: KeepaAmazonProvider,
    private readonly suppliers: SuppliersService,
    @Inject(forwardRef(() => CatalogService))
    private readonly catalog: CatalogService,
    @Inject(forwardRef(() => CreativeIntelligenceService))
    private readonly creativeIntelligence: CreativeIntelligenceService,
    private readonly discovery: TrendDiscoveryService,
  ) {}

  private slugify(
    title: string,
    country: string,
    asin?: string,
    weekKey?: string,
  ) {
    const base = asin
      ? `${country.toLowerCase()}-${asin.toLowerCase()}`
      : `${country.toLowerCase()}-${title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
          .slice(0, 48)}`;
    // slug is globally unique — include week so draft ≠ published collision
    if (weekKey) {
      const wk = weekKey.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return `${base}-${wk}`.slice(0, 80);
    }
    return base.slice(0, 80);
  }

  private computeProfitability(salePrice: number, bestSupplier?: SupplierOffer) {
    const cost = bestSupplier?.unitPriceEur ?? 0;
    const shipping = bestSupplier?.shippingEstimateEur ?? 0;
    const fees = salePrice * 0.15;
    const profit = salePrice - cost - shipping - fees;
    const marginPct = salePrice > 0 ? (profit / salePrice) * 100 : 0;
    return {
      salePrice,
      supplierCost: cost,
      shipping,
      fees,
      estimatedProfit: Number(profit.toFixed(2)),
      marginPct: Number(marginPct.toFixed(1)),
    };
  }

  private scoreProduct(p: Product) {
    const sniper = Number(
      (p.meta?.dropSniper as { total?: number } | undefined)?.total ?? 0,
    );
    if (sniper > 0) return sniper;
    const sales = Number(p.estimatedSales ?? 0);
    const rating = Number(p.rating ?? 0);
    const reviews = Number(p.reviewCount ?? 0);
    const bsr = p.currentRank ?? 999999;
    const bsrScore = Math.max(0, 100 - Math.log10(bsr + 1) * 12);
    return (
      Math.log10(sales + 1) * 25 +
      rating * 8 +
      Math.log10(reviews + 1) * 5 +
      bsrScore
    );
  }

  private dropSniperTotal(p: Product) {
    return Number(
      (p.meta?.dropSniper as { total?: number } | undefined)?.total ?? 0,
    );
  }

  private scoreMargin(p: Product) {
    return Number(p.estimatedMarginPct ?? 0);
  }

  private scoreProfitPotential(p: Product) {
    const profit = Number(p.estimatedProfit ?? 0);
    const sales = Number(p.estimatedSales ?? 0);
    const growth = Number(p.growthPct ?? 0);
    return (
      profit * (1 + Math.log10(sales + 1) * 0.15) +
      Math.max(0, growth) * 0.5
    );
  }

  async resolveWeekKey(view: CatalogView = 'published'): Promise<string> {
    const state = await this.catalog.getState();
    if (view === 'draft') {
      if (!state.draftWeekKey) {
        throw new NotFoundException('No hay borrador de catálogo.');
      }
      return state.draftWeekKey;
    }
    return this.catalog.assertPublished();
  }

  async countForWeek(weekKey: string) {
    return this.products.count({ where: { catalogWeekKey: weekKey } });
  }

  private async productsForWeek(weekKey: string) {
    return this.products.find({ where: { catalogWeekKey: weekKey } });
  }

  async upsertFromSignals(
    signals: CommercialSignal[],
    weekKey = currentWeekKey(),
  ) {
    const saved: Product[] = [];

    for (const signal of signals) {
      if (!signal.title) continue;
      if (
        !passesAmazonIngestFilters({
          title: signal.title,
          brand: signal.brand,
          category: signal.category,
        })
      ) {
        continue;
      }
      const slug = this.slugify(
        signal.title,
        signal.country,
        signal.externalId,
        weekKey,
      );

      let product =
        (await this.products.findOne({
          where: {
            amazonAsin: signal.externalId,
            country: signal.country,
            catalogWeekKey: weekKey,
          },
        })) ??
        (await this.products.findOne({
          where: { slug },
        }));

      if (!product) {
        product = this.products.create({ slug, title: signal.title });
      }

      const salePrice = signal.price ?? 0;
      let supplierOffers: SupplierOffer[] = [];
      try {
        supplierOffers = await this.suppliers.findRelated(
          signal.title,
          6,
          salePrice,
          signal.country,
          signal.imageUrl,
        );
      } catch (err) {
        this.logger.warn(
          `Suppliers skip "${signal.title.slice(0, 40)}": ${err}`,
        );
      }
      const live = supplierOffers.find(
        (s) => s.kind === 'live' && s.unitPriceEur != null,
      );
      const profitability = live
        ? this.computeProfitability(salePrice, live)
        : {
            salePrice,
            supplierCost: null as number | null,
            shipping: null as number | null,
            fees: salePrice > 0 ? Number((salePrice * 0.15).toFixed(2)) : null,
            estimatedProfit: null as number | null,
            marginPct: null as number | null,
            available: false,
          };

      product.slug = slug;
      product.title = signal.title;
      product.imageUrl = signal.imageUrl ?? product.imageUrl;
      product.category = signal.category;
      product.country = signal.country;
      product.sources = ['amazon'];
      product.amazonAsin = signal.externalId;
      product.catalogWeekKey = weekKey;
      product.currentPrice =
        signal.price != null ? String(signal.price) : product.currentPrice;
      product.currentRank = signal.rank ?? null;
      product.estimatedSales =
        signal.estimatedSales != null ? String(signal.estimatedSales) : null;
      product.estimatedSalesKind = signal.estimatedSalesKind;
      product.gmv = signal.gmv != null ? String(signal.gmv) : null;
      product.gmvKind = signal.gmvKind;
      product.growthPct =
        signal.growthPct != null ? String(signal.growthPct) : product.growthPct;
      product.brand = signal.brand ?? null;
      product.rating = signal.rating != null ? String(signal.rating) : null;
      product.reviewCount = signal.reviewCount ?? null;
      product.amazonUrl = signal.amazonUrl ?? null;
      product.description = signal.description ?? null;
      product.estimatedMarginPct =
        profitability.marginPct != null ? String(profitability.marginPct) : null;
      product.estimatedProfit =
        profitability.estimatedProfit != null
          ? String(profitability.estimatedProfit)
          : null;

      // Temporary meta for scoring helpers (suppliers + keepa raw)
      const keepaMeta = {
        ...(signal.raw ?? {}),
        growthPct7: signal.growthPct7 ?? (signal.raw as Record<string, unknown> | undefined)?.growthPct7 ?? null,
        growthPct30: signal.growthPct30 ?? (signal.raw as Record<string, unknown> | undefined)?.growthPct30 ?? null,
      };
      product.meta = {
        ...(product.meta ?? {}),
        keepa: keepaMeta,
        ingestCategories: signal.ingestCategories?.length
          ? signal.ingestCategories
          : [signal.category],
        suppliers: supplierOffers,
        profitability,
      };
      product.meta.marketSignals = {
        aliexpress: computeAliExpressMarketSignal(product),
      };
      const dropSniper = computeDropSniperScore(product);

      product.meta = {
        ...product.meta,
        dropSniper,
        labels: {
          estimatedSales: 'Ventas mensuales estimadas (Keepa)',
          rank: 'Best Sellers Rank (BSR)',
          rating: 'Valoración Amazon',
          estimatedMarginPct: 'Margen estimado',
          estimatedProfit: 'Beneficio estimado por unidad',
          growthPct: 'Momentum BSR 7d/30d (Keepa)',
          dropSniperScore: 'Drop Sniper Score 0–100',
        },
      };

      await this.products.save(product);

      let snapshot = await this.snapshots.findOne({
        where: { productId: product.id, weekKey },
      });
      if (!snapshot) {
        snapshot = this.snapshots.create({ productId: product.id, weekKey });
      }
      snapshot.rank = signal.rank ?? null;
      snapshot.price = signal.price != null ? String(signal.price) : null;
      snapshot.demand = signal.demand != null ? String(signal.demand) : null;
      snapshot.demandKind = signal.demandKind;
      snapshot.estimatedSales =
        signal.estimatedSales != null ? String(signal.estimatedSales) : null;
      snapshot.estimatedSalesKind = signal.estimatedSalesKind;
      snapshot.gmv = signal.gmv != null ? String(signal.gmv) : null;
      snapshot.gmvKind = signal.gmvKind;
      snapshot.growthPct =
        signal.growthPct != null ? String(signal.growthPct) : null;
      snapshot.signals = {
        source: 'amazon',
        asin: signal.externalId,
        brand: signal.brand,
        rating: signal.rating,
        reviewCount: signal.reviewCount,
        raw: signal.raw,
        // AliExpress (RapidAPI Business API) offers captured at ingest time
        suppliers: supplierOffers,
        profitability,
      };
      await this.snapshots.save(snapshot);
      saved.push(product);
    }

    await this.rebuildRankings(weekKey);
    return saved;
  }

  /**
   * Genera el borrador semanal; admin publica cuando esté listo. Fuente:
   * anuncios de tiendas en TikTok/Meta vía PipiAds (TrendDiscoveryService),
   * con PVP de la tienda y coste CJ/AliExpress. Keepa ya no participa.
   */
  async runWeeklyIngestion(options?: {
    productsTarget?: number;
    creditBudget?: number;
    onProgress?: (progress: KeepaIngestProgress) => void;
  }) {
    const weekKey = currentWeekKey();
    const productsTarget = this.discovery.productsTarget(options?.productsTarget);
    const requestedBudget = this.discovery.creditBudget(options?.creditBudget);
    this.logger.log(
      `Ingesta PipiAds week=${weekKey} productsTarget=${productsTarget} budget=${requestedBudget}`,
    );

    await this.products.manager.query(
      `DELETE FROM ranking_entries WHERE "weekKey" = $1 AND scope <> 'ad_winners'`,
      [weekKey],
    );
    await this.products.manager.query(
      `DELETE FROM product_snapshots WHERE "weekKey" = $1`,
      [weekKey],
    );
    await this.products.manager.query(
      `DELETE FROM products WHERE "catalogWeekKey" = $1`,
      [weekKey],
    );

    const startedAt = Date.now();
    const onProgress = options?.onProgress;
    const run = await this.discovery.runWeek(weekKey, {
      productsTarget,
      creditBudget: requestedBudget,
      onProgress: (p) =>
        onProgress?.({
          market: 'ALL',
          step: p.step,
          categoriesDone: p.done,
          categoriesTotal: p.total,
          callsDone: p.creditsSpent,
          elapsedMs: Date.now() - startedAt,
          etaSeconds: null,
        }),
    });

    onProgress?.({
      market: 'ALL',
      step: 'rankings',
      categoriesDone: 0,
      categoriesTotal: 1,
      callsDone: run.budget.spent,
      elapsedMs: Date.now() - startedAt,
      etaSeconds: null,
    });
    await this.rebuildRankings(weekKey);

    const count = await this.countForWeek(weekKey);
    const shortfall = run.result.stoppedOnBudget
      ? ' · se agotó el tope de créditos antes de llegar al target'
      : run.result.stoppedOnEmptyPool
        ? ' · no hay más anuncios candidatos para seguir'
        : '';
    await this.catalog.markIngested(
      weekKey,
      [],
      count,
      `PipiAds · ${run.budget.spent}/${run.budget.total} créditos (caché: ${run.cache.hits} hits/${run.cache.misses} misses) · ${run.result.saved}/${run.result.productsTarget} productos pedidos (${run.result.withSupplier} con proveedor, ${run.result.rounds} ronda${run.result.rounds === 1 ? '' : 's'})${shortfall}${run.pipiadsRemaining != null ? ` · quedan ${run.pipiadsRemaining}` : ''}`,
    );
    this.logger.log(
      `Snapshot ${weekKey} guardado · ${count} productos · credits=${run.budget.spent}`,
    );

    return {
      weekKey,
      count,
      productsTarget,
      provider: this.discovery.enabled() ? 'pipiads' : 'disabled',
      status: 'draft',
      discovery: {
        credits: run.budget.spent,
        budget: run.budget,
        result: run.result,
        pipiadsRemaining: run.pipiadsRemaining,
      },
      message:
        'Ingesta completa: PipiAds (TikTok/Meta) + tienda + CJ/AliExpress. Publicá el weekKey cuando quieras que salga en la web.',
    };
  }

  /** WeekKeys (de la lista) que tienen tablero legacy Ad Winners. */
  async weekKeysWithAdWinners(weekKeys: string[]): Promise<Set<string>> {
    if (!weekKeys.length) return new Set();
    const rows = await this.rankings
      .createQueryBuilder('r')
      .select('DISTINCT r."weekKey"', 'weekKey')
      .where('r.scope = :scope', { scope: 'ad_winners' })
      .andWhere('r."weekKey" IN (:...weekKeys)', { weekKeys })
      .getRawMany<{ weekKey: string }>();
    return new Set(rows.map((r) => r.weekKey));
  }

  async rebuildRankings(weekKey: string) {
    const products = await this.products.find({
      where: { catalogWeekKey: weekKey },
    });
    await this.rankings
      .createQueryBuilder()
      .delete()
      .where(`"weekKey" = :weekKey AND scope NOT IN (:...keep)`, {
        weekKey,
        keep: ['ad_winners'],
      })
      .execute();

    // Refresh Drop Sniper (e.g. after CI enriches ads → Ad Score)
    for (const p of products) {
      p.meta = {
        ...(p.meta ?? {}),
        marketSignals: {
          aliexpress: computeAliExpressMarketSignal(p),
        },
        dropSniper: computeDropSniperScore(p),
      };
      await this.products.save(p);
    }

    // Every board (general/trending/winners/categoría/país, not just
    // margin/profit) now requires the product to be sourceable on
    // AliExpress — every product shown must be findable there. This
    // also makes ads-origin products (no Amazon match, from AdWinnersService)
    // eligible for general/trending/winners for the first time, not just the
    // ad_winners scope.
    const sourceableProducts = products.filter((p) => hasAnySupplier(p));
    // Margen/beneficio además necesitan margen real, no solo un proveedor live.
    const opportunities = sourceableProducts.filter((p) => hasViableSupplier(p));
    const bySniper = [...sourceableProducts].sort(
      (a, b) => this.dropSniperTotal(b) - this.dropSniperTotal(a),
    );
    this.logger.log(
      `Rankings week=${weekKey}: products=${products.length} sourceable=${sourceableProducts.length} withMargin=${opportunities.length} trending≈…`,
    );

    const writeBoard = async (
      scope: RankingEntry['scope'],
      scopeKey: string,
      list: Product[],
      scoreFn: (p: Product) => number,
      take = 10,
    ) => {
      for (const [index, product] of list.slice(0, take).entries()) {
        await this.rankings.save(
          this.rankings.create({
            weekKey,
            scope,
            scopeKey,
            position: index + 1,
            productId: product.id,
            score: String(scoreFn(product).toFixed(2)),
            signalSources: product.sources,
          }),
        );
      }
    };

    await writeBoard(
      'general',
      '*',
      bySniper,
      (p) => this.dropSniperTotal(p),
      10,
    );

    const trendOf = (p: Product) =>
      (p.meta?.dropSniper as { trend?: { velocity: number; total: number } } | undefined)?.trend;
    const trending = sourceableProducts
      .filter((p) =>
        isTrendingCandidate(p, computeDropSniperScore(p)),
      )
      .sort((a, b) => {
        const ta = trendOf(a);
        const tb = trendOf(b);
        if (ta && tb) {
          if (tb.velocity !== ta.velocity) return tb.velocity - ta.velocity;
          return tb.total - ta.total;
        }
        const keepa = (p: Product) =>
          (p.meta?.keepa as Record<string, unknown> | undefined) ?? {};
        const g7 = (p: Product) => Number(keepa(p).growthPct7 ?? 0);
        const g30 = (p: Product) =>
          Number(keepa(p).growthPct30 ?? p.growthPct ?? 0);
        const da = g7(a) || g30(a);
        const db = g7(b) || g30(b);
        if (db !== da) return db - da;
        return this.dropSniperTotal(b) - this.dropSniperTotal(a);
      });
    await writeBoard(
      'trending',
      '*',
      trending,
      (p) => Number(p.growthPct ?? this.dropSniperTotal(p)),
      10,
    );
    // Alias rising → same as trending for older clients
    await writeBoard(
      'rising',
      '*',
      trending,
      (p) => Number(p.growthPct ?? this.dropSniperTotal(p)),
      10,
    );

    const winners = sourceableProducts
      .filter((p) => isWinnerCandidate(p, computeDropSniperScore(p)))
      .sort((a, b) => this.dropSniperTotal(b) - this.dropSniperTotal(a));
    // Few products reach 3+ stores in one week's credit budget — fill the
    // board with sustained (≥ 30 days), still-active, non-saturated ones.
    if (winners.length < 10) {
      const extra = sourceableProducts
        .filter((p) => !winners.includes(p))
        .filter((p) => {
          const t = (p.meta?.dropSniper as { trend?: TrendScoreBreakdown } | undefined)?.trend;
          return (
            t != null &&
            t.activeDays >= WINNER_MIN_DAYS &&
            (t.daysSinceLastSeen == null || t.daysSinceLastSeen <= 7) &&
            t.tier !== 'saturated'
          );
        })
        .sort((a, b) => this.dropSniperTotal(b) - this.dropSniperTotal(a));
      winners.push(...extra.slice(0, 10 - winners.length));
    }
    await writeBoard(
      'winners',
      '*',
      winners,
      (p) => this.dropSniperTotal(p),
      10,
    );

    const byMargin = [...opportunities].sort(
      (a, b) => this.scoreMargin(b) - this.scoreMargin(a),
    );
    await writeBoard('margin', '*', byMargin, (p) => this.scoreMargin(p), 10);

    const byProfit = [...opportunities].sort(
      (a, b) => this.scoreProfitPotential(b) - this.scoreProfitPotential(a),
    );
    await writeBoard(
      'profit',
      '*',
      byProfit,
      (p) => this.scoreProfitPotential(p),
      10,
    );

    // Tops por categoría (no solo partir el general). Productos de anuncios
    // usan las categorías de discovery; semanas Keepa viejas, sus browse nodes.
    const allowlistByMarket = new Map<string, string[]>();
    for (const p of products) {
      if (!allowlistByMarket.has(p.country)) {
        allowlistByMarket.set(
          p.country,
          p.meta?.discovery
            ? categoryLabelsForMarket(p.country)
            : this.amazon.ingestCategoryLabels(p.country),
        );
      }
    }

    const categoryKeys = new Set<string>();
    for (const labels of allowlistByMarket.values()) {
      for (const label of labels) categoryKeys.add(label);
    }
    // Also include any ingest category seen on products (safety)
    for (const p of sourceableProducts) {
      const cats = (p.meta?.ingestCategories as string[] | undefined) ?? [
        p.category,
      ];
      for (const c of cats) if (c) categoryKeys.add(c);
    }

    for (const category of categoryKeys) {
      const list = sourceableProducts
        .filter((p) => {
          const cats = (p.meta?.ingestCategories as string[] | undefined) ?? [
            p.category,
          ];
          return cats.includes(category) || p.category === category;
        })
        .sort((a, b) => this.dropSniperTotal(b) - this.dropSniperTotal(a));
      if (!list.length) continue;
      await writeBoard(
        'category',
        category,
        list,
        (p) => this.dropSniperTotal(p),
        10,
      );
    }

    this.logger.log(
      `Rankings week=${weekKey} written: general=${Math.min(10, bySniper.length)} trending=${Math.min(10, trending.length)} winners=${Math.min(10, winners.length)} categories=${categoryKeys.size}`,
    );
  }

  private async computeRisers(products: Product[], weekKey: string) {
    const previous = previousWeekKey();
    const risers: Array<{ product: Product; rankDelta: number }> = [];

    for (const product of products) {
      const [curr, prev] = await Promise.all([
        this.snapshots.findOne({
          where: { productId: product.id, weekKey },
        }),
        this.snapshots.findOne({
          where: { productId: product.id, weekKey: previous },
        }),
      ]);
      if (!curr?.rank || !prev?.rank) continue;
      const rankDelta = prev.rank - curr.rank;
      if (rankDelta > 0) risers.push({ product, rankDelta });
    }

    return risers.sort((a, b) => b.rankDelta - a.rankDelta);
  }

  async listBestsellers(
    limit = 40,
    view: CatalogView = 'published',
    options: { requireSupplier?: boolean } = {},
  ) {
    const weekKey = await this.resolveWeekKey(view);
    const rows = await this.productsForWeek(weekKey);
    // Same sourceability gate as rebuildRankings — used by RankingsService's
    // empty-board fallback so it doesn't silently bypass the supplier gate.
    const filtered = options.requireSupplier
      ? rows.filter((p) => hasAnySupplier(p))
      : rows;
    return [...filtered]
      .sort((a, b) => this.scoreProduct(b) - this.scoreProduct(a))
      .slice(0, limit)
      .map((p, index) => ({
        position: index + 1,
        score: Number(this.scoreProduct(p).toFixed(2)),
        weekKey,
        product: this.serializeProduct(p),
      }));
  }

  async listRisers(view: CatalogView = 'published') {
    const weekKey = await this.resolveWeekKey(view);
    const products = await this.productsForWeek(weekKey);
    const risers = await this.computeRisers(products, weekKey);

    return risers.slice(0, 10).map((row) => ({
      product: this.serializeProduct(row.product),
      rankDelta: row.rankDelta,
      growthPct: row.product.growthPct
        ? Number(row.product.growthPct)
        : null,
      weekKey,
    }));
  }

  async getProductDetail(idOrSlug: string, view: CatalogView = 'published') {
    const product =
      (await this.products.findOne({ where: { id: idOrSlug } })) ??
      (await this.products.findOne({ where: { slug: idOrSlug } })) ??
      (await this.products.findOne({ where: { amazonAsin: idOrSlug } }));

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Direct ID (e.g. from URL analysis) can be outside the published week.
    // Slug/ASIN lookups stay scoped to the active catalog.
    const byDirectId = product.id === idOrSlug;
    if (!byDirectId) {
      const weekKey = await this.resolveWeekKey(view);
      if (product.catalogWeekKey !== weekKey) {
        throw new NotFoundException(
          'Producto no encontrado en el catálogo activo',
        );
      }
    }

    const weekKey = product.catalogWeekKey;

    const history = await this.snapshots.find({
      where: { productId: product.id },
      order: { weekKey: 'ASC' },
    });

    const salePrice = Number(product.currentPrice ?? 0);
    const cached = (product.meta?.suppliers as SupplierOffer[] | undefined) ?? [];
    const isAdWinner =
      product.sources?.includes('ads') || product.category === 'Ad Winners';
    const supplierSeed = String(
      (product.meta?.adSeed as string | undefined) ??
        product.title ??
        '',
    ).trim();

    // Drop image-search junk cached from older Ad Winners runs
    const relevantCached = isAdWinner
      ? cached.filter(
          (s) =>
            s.kind !== 'live' ||
            offerMatchesSeed(s.name, supplierSeed),
        )
      : cached;

    // Never invent live supplier prices. Keep search shortcuts without fake unit costs
    // unless we already have kind=live offers.
    const liveOffers = relevantCached.filter((s) => s.kind === 'live');
    let supplierOffers =
      liveOffers.length > 0
        ? liveOffers
        : relevantCached
            .filter((s) => s.listingUrl)
            .map((s) => ({
              ...s,
              unitPriceEur: undefined,
              shippingEstimateEur: undefined,
              kind: 'estimated' as const,
              note:
                s.note ??
                'Sin API de proveedores: solo enlace de búsqueda, sin precio real.',
            }));

    // If Ad Winner cache was all noise, show search links for the seed
    if (isAdWinner && supplierOffers.length === 0 && supplierSeed) {
      try {
        let refreshed = await this.suppliers.findRelated(
          supplierSeed,
          4,
          undefined,
          product.country ?? 'US',
          null,
        );
        refreshed = refreshed.filter(
          (o) =>
            o.kind !== 'live' ||
            offerMatchesSeed(o.name, supplierSeed),
        );
        if (!refreshed.some((s) => s.kind === 'live')) {
          refreshed = refreshed.filter((o) => o.kind !== 'live');
        }
        supplierOffers = refreshed;
      } catch {
        supplierOffers = [];
      }
    }

    const cheapestLive = supplierOffers
      .filter((s) => s.kind === 'live' && s.unitPriceEur != null)
      .sort(
        (a, b) => (a.unitPriceEur ?? Infinity) - (b.unitPriceEur ?? Infinity),
      )[0];
    const hasLiveCost = Boolean(cheapestLive);
    const fromStore = Boolean(product.meta?.discovery);
    // Ad Winners have no Amazon PVP — don't show fake profit vs 0 €
    const profitability =
      hasLiveCost && salePrice > 0
        ? {
            ...this.computeProfitability(salePrice, cheapestLive),
            formula: fromStore
              ? 'Beneficio estimado = PVP de la tienda que lo anuncia − coste proveedor (CJ/AliExpress) − envío − comisiones y pasarela (~15%)'
              : 'Beneficio estimado = PVP Amazon − coste proveedor − envío − comisiones Amazon (~15%)',
            basis: 'Coste de proveedor según oferta enlazada (API).',
            available: true as const,
          }
        : {
            salePrice: salePrice > 0 ? salePrice : null,
            supplierCost: hasLiveCost ? cheapestLive?.unitPriceEur ?? null : null,
            shipping: hasLiveCost
              ? cheapestLive?.shippingEstimateEur ?? null
              : null,
            fees: salePrice > 0 ? Number((salePrice * 0.15).toFixed(2)) : null,
            estimatedProfit: null,
            marginPct: null,
            formula:
              'Beneficio = PVP − coste proveedor − envío − comisiones (~15%)',
            basis: fromStore
              ? salePrice > 0
                ? 'Margen no disponible: no hay precio live de CJ/AliExpress para este producto.'
                : 'Margen no disponible: no se pudo leer el PVP de la tienda.'
              : isAdWinner
                ? 'Ad Winners no tiene PVP Amazon: solo coste de proveedor de referencia.'
                : 'Margen no disponible: no hay precio real de proveedor (API AliExpress no conectada).',
            available: false as const,
            labels: {
              estimatedProfit: 'Beneficio estimado',
              marginPct: 'Margen estimado',
            },
          };

    return {
      weekKey,
      product: this.serializeProduct(product),
      history: history.map((h) => ({
        weekKey: h.weekKey,
        rank: h.rank,
        price: h.price != null ? Number(h.price) : null,
        demand: h.demand != null ? Number(h.demand) : null,
        demandKind: h.demandKind,
        estimatedSales:
          h.estimatedSales != null ? Number(h.estimatedSales) : null,
        estimatedSalesKind: h.estimatedSalesKind,
        gmv: h.gmv != null ? Number(h.gmv) : null,
        gmvKind: h.gmvKind,
        growthPct: h.growthPct != null ? Number(h.growthPct) : null,
        signals: h.signals,
      })),
      profitability,
      suppliers: supplierOffers,
      creativeIntelligence: this.creativeIntelligence.forProductDetail(product),
    };
  }

  serializeProduct(product: Product) {
    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      imageUrl: product.imageUrl,
      category: product.category,
      country: product.country,
      sources: product.sources,
      amazonAsin: product.amazonAsin,
      amazonUrl: product.amazonUrl,
      brand: product.brand,
      rating: product.rating != null ? Number(product.rating) : null,
      reviewCount: product.reviewCount,
      description: product.description,
      catalogWeekKey: product.catalogWeekKey,
      currentPrice:
        product.currentPrice != null && product.currentPrice !== ''
          ? Number(product.currentPrice)
          : null,
      currentRank: product.currentRank,
      estimatedSales:
        product.estimatedSales != null ? Number(product.estimatedSales) : null,
      estimatedSalesKind: product.estimatedSalesKind,
      gmv: product.gmv != null ? Number(product.gmv) : null,
      gmvKind: product.gmvKind,
      growthPct: product.growthPct != null ? Number(product.growthPct) : null,
      estimatedMarginPct:
        product.estimatedMarginPct != null
          ? Number(product.estimatedMarginPct)
          : null,
      estimatedProfit:
        product.estimatedProfit != null
          ? Number(product.estimatedProfit)
          : null,
      meta: product.meta,
      labels: {
        estimatedSales: 'Ventas mensuales estimadas (Keepa)',
        currentRank: 'Best Sellers Rank (BSR)',
        rating: 'Valoración Amazon',
        estimatedMarginPct: 'Margen estimado',
        estimatedProfit: 'Beneficio estimado por unidad',
        growthPct: 'Momentum BSR 7d/30d (Keepa)',
        dropSniperScore: 'Drop Sniper Score 0–100',
      },
    };
  }

  async listAll(view: CatalogView = 'published') {
    const weekKey = await this.resolveWeekKey(view);
    const products = await this.productsForWeek(weekKey);
    return [...products]
      .sort((a, b) => this.scoreProduct(b) - this.scoreProduct(a))
      .map((p) => this.serializeProduct(p));
  }

  discoveryEnabled() {
    return this.discovery.enabled();
  }

  /** Local/dev only: fixture catalogue (no external APIs) when PipiAds is off. */
  async seedFixtures() {
    const weekKey = currentWeekKey();
    const signals = await this.amazon.collectWeeklyCandidates();
    const products = await this.upsertFromSignals(signals, weekKey);
    await this.catalog.markIngested(weekKey, [], products.length, 'Fixtures');
    return { weekKey, count: products.length };
  }

  ingestCategories() {
    return categoryLabelsForMarket('ES');
  }
}

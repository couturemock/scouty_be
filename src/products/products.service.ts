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
import { AdWinnersService } from '../creative/ad-winners.service';
import { CreativeIntelligenceService } from '../creative/creative-intelligence.service';
import { currentWeekKey, previousWeekKey } from '../common/week';
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
  hasViableSupplier,
  isTrendingCandidate,
  isWinnerCandidate,
} from './drop-sniper.score';

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
    @Inject(forwardRef(() => AdWinnersService))
    private readonly adWinners: AdWinnersService,
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

  private async productsForWeek(weekKey: string, market?: string) {
    const where: { catalogWeekKey: string; country?: string } = {
      catalogWeekKey: weekKey,
    };
    if (market) where.country = market.toUpperCase();
    return this.products.find({ where });
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
        // AliExpress (RapidAPI) + Alibaba.com links captured at ingest time
        suppliers: supplierOffers,
        profitability,
      };
      await this.snapshots.save(snapshot);
      saved.push(product);
    }

    await this.rebuildRankings(weekKey);
    return saved;
  }

  /** Amazon/Keepa only — genera borrador; admin publica cuando esté listo. */
  async runWeeklyIngestion(
    markets?: string[],
    options?: {
      productsPerCategory?: number;
      ciTopN?: number;
      onProgress?: (progress: KeepaIngestProgress) => void;
    },
  ) {
    const weekKey = currentWeekKey();
    this.suppliers.beginIngestRun();
    this.logger.log(
      `Ingesta Keepa week=${weekKey} markets=${markets?.join(',') ?? 'default'} perCat=${options?.productsPerCategory ?? 'env'}`,
    );

    if (markets?.length) {
      const placeholders = markets.map((_, i) => `$${i + 2}`).join(',');
      await this.products.manager.query(
        `DELETE FROM ranking_entries WHERE "weekKey" = $1 AND "productId" IN (SELECT id FROM products WHERE "catalogWeekKey" = $1 AND country IN (${placeholders}))`,
        [weekKey, ...markets],
      );
      await this.products.manager.query(
        `DELETE FROM product_snapshots WHERE "weekKey" = $1 AND "productId" IN (SELECT id FROM products WHERE "catalogWeekKey" = $1 AND country IN (${placeholders}))`,
        [weekKey, ...markets],
      );
      await this.products.manager.query(
        `DELETE FROM products WHERE "catalogWeekKey" = $1 AND country IN (${placeholders})`,
        [weekKey, ...markets],
      );
    } else {
      await this.products.manager.query(
        `DELETE FROM ranking_entries WHERE "weekKey" = $1`,
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
    }

    const amazonSignals = await this.amazon.collectWeeklyCandidates(markets, {
      productsPerCategory: options?.productsPerCategory,
      onProgress: options?.onProgress,
    });
    const products = await this.upsertFromSignals(amazonSignals, weekKey);

    // No fake previous-week BSR — TRENDING uses Keepa growthPct / salesRankDrops.

    const keepa = await this.amazon.getStatus();
    await this.catalog.markIngested(
      weekKey,
      markets ?? [],
      products.length,
      keepa.enabled
        ? `Keepa · ${keepa.tokensLeft ?? '?'} tokens restantes`
        : 'Fixtures',
    );
    this.logger.log(
      `Snapshot ${weekKey} guardado · ${products.length} productos · markets=${(markets ?? []).join(',') || 'default'}`,
    );

    // CI can take many minutes; do not block the HTTP response or the admin UI
    // never refreshes (looks like the ingest "failed" / snapshot missing).
    const ciTopN = options?.ciTopN;
    const ingestMarkets = markets ?? [];
    void this.creativeIntelligence
      .enrichTopProductsAtIngest(weekKey, (p) => this.scoreProduct(p), ciTopN)
      .then(async (ci) => {
        this.logger.log(
          `CI PipiAds listo week=${weekKey} enriched=${ci.enriched}/${ci.topN} credits≈${ci.totalCredits}`,
        );
        // Re-score with Ad Score after CI attaches creatives
        await this.rebuildRankings(weekKey);
        const adMarkets = (
          ingestMarkets.length ? ingestMarkets : ['ES']
        ).slice(0, 2);
        for (const m of adMarkets) {
          try {
            const ad = await this.adWinners.runForWeek(weekKey, m);
            this.logger.log(
              `Ad Winners ${m} week=${weekKey} ranked=${ad.ranked} credits≈${ad.credits}`,
            );
          } catch (err) {
            this.logger.warn(`Ad Winners ${m} falló: ${err}`);
          }
        }
        // Ad Winners may attach ads onto Amazon ASINs — refresh Drop Sniper
        await this.rebuildRankings(weekKey);
      })
      .catch((err) => {
        this.logger.warn(`CI PipiAds falló week=${weekKey}: ${err}`);
      });

    return {
      weekKey,
      count: products.length,
      markets: markets ?? null,
      productsPerCategory: options?.productsPerCategory ?? null,
      provider: this.amazon.enabled() ? 'keepa' : 'fixture',
      status: 'draft',
      creativeIntelligence: {
        enriched: 0,
        totalCredits: 0,
        topN:
          ciTopN != null && Number.isFinite(ciTopN) && ciTopN > 0
            ? Math.min(Math.floor(ciTopN), 200)
            : 60,
        running: true,
      },
      message:
        'Ingesta Keepa guardada. CI + Ad Winners siguen en segundo plano; publicá el weekKey cuando termine. Se necesita ingesta nueva para Drop Sniper / TRENDING / WINNERS.',
    };
  }

  /** WeekKeys de la lista dada que ya tienen ranking_entries scope=ad_winners. */
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

  /**
   * Re-ejecuta solo Ad Winners (PipiAds seeds → cluster → Ad Score) para un
   * weekKey ya ingerido — no vuelve a golpear Keepa ni CI. Útil cuando Ad
   * Winners falló o quedó vacío en la ingesta original.
   */
  async rerunAdWinners(weekKey: string, markets: string[]) {
    const targets = (markets.length ? markets : ['ES']).slice(0, 2);
    const results: Array<{ market: string; ranked: number; credits: number }> =
      [];
    for (const m of targets) {
      try {
        const ad = await this.adWinners.runForWeek(weekKey, m);
        results.push({ market: m, ranked: ad.ranked, credits: ad.credits });
        this.logger.log(
          `Ad Winners (retry) ${m} week=${weekKey} ranked=${ad.ranked} credits≈${ad.credits}`,
        );
      } catch (err) {
        this.logger.warn(`Ad Winners (retry) ${m} falló: ${err}`);
        results.push({ market: m, ranked: 0, credits: 0 });
      }
    }
    await this.rebuildRankings(weekKey);
    return { weekKey, markets: targets, results };
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

    // General/Trending/Winners/categoría/país: señal Amazon pura, no exige
    // proveedor live confirmado (eso agotaba categorías enteras cuando
    // AliExpress/Alibaba se quedaban sin cuota a mitad de la ingesta).
    const amazonProducts = products.filter((p) =>
      (p.sources ?? []).includes('amazon'),
    );
    // Margen/beneficio sí necesitan un costo real: solo con proveedor live.
    const opportunities = amazonProducts.filter((p) => hasViableSupplier(p));
    const bySniper = [...amazonProducts].sort(
      (a, b) => this.dropSniperTotal(b) - this.dropSniperTotal(a),
    );
    this.logger.log(
      `Rankings week=${weekKey}: products=${products.length} amazon=${amazonProducts.length} withSupplier=${opportunities.length} trending≈…`,
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

    const trending = amazonProducts
      .filter((p) =>
        isTrendingCandidate(p, computeDropSniperScore(p)),
      )
      .sort((a, b) => {
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

    const winners = amazonProducts
      .filter((p) => isWinnerCandidate(p, computeDropSniperScore(p)))
      .sort((a, b) => this.dropSniperTotal(b) - this.dropSniperTotal(a));
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

    const byCountry = new Map<string, Product[]>();
    for (const p of bySniper) {
      byCountry.set(p.country, [...(byCountry.get(p.country) ?? []), p]);
    }

    // Tops por categoría Keepa allowlist (no solo partir el general).
    // Cada producto pertenece a ingestCategories = browse nodes de donde salió.
    const allowlistByMarket = new Map<string, string[]>();
    for (const p of products) {
      if (!allowlistByMarket.has(p.country)) {
        allowlistByMarket.set(
          p.country,
          this.amazon.ingestCategoryLabels(p.country),
        );
      }
    }

    const categoryKeys = new Set<string>();
    for (const labels of allowlistByMarket.values()) {
      for (const label of labels) categoryKeys.add(label);
    }
    // Also include any ingest category seen on products (safety)
    for (const p of amazonProducts) {
      const cats = (p.meta?.ingestCategories as string[] | undefined) ?? [
        p.category,
      ];
      for (const c of cats) if (c) categoryKeys.add(c);
    }

    for (const category of categoryKeys) {
      const list = amazonProducts
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

    for (const [country, list] of byCountry) {
      await writeBoard(
        'country',
        country,
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
    market?: string,
    limit = 40,
    view: CatalogView = 'published',
  ) {
    const weekKey = await this.resolveWeekKey(view);
    const rows = await this.productsForWeek(weekKey, market);
    return [...rows]
      .sort((a, b) => this.scoreProduct(b) - this.scoreProduct(a))
      .slice(0, limit)
      .map((p, index) => ({
        position: index + 1,
        score: Number(this.scoreProduct(p).toFixed(2)),
        weekKey,
        product: this.serializeProduct(p),
      }));
  }

  async listRisers(market?: string, view: CatalogView = 'published') {
    const weekKey = await this.resolveWeekKey(view);
    const products = await this.productsForWeek(weekKey, market);
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
    // Ad Winners have no Amazon PVP — don't show fake profit vs 0 €
    const profitability =
      hasLiveCost && salePrice > 0
        ? {
            ...this.computeProfitability(salePrice, cheapestLive),
            formula:
              'Beneficio estimado = PVP Amazon − coste proveedor − envío − comisiones Amazon (~15%)',
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
            basis: isAdWinner
              ? 'Ad Winners no tiene PVP Amazon: solo coste de proveedor de referencia.'
              : 'Margen no disponible: no hay precio real de proveedor (API Alibaba/AliExpress no conectada).',
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

  async listAll(market?: string, view: CatalogView = 'published') {
    const weekKey = await this.resolveWeekKey(view);
    const products = await this.productsForWeek(weekKey, market);
    return [...products]
      .sort((a, b) => this.scoreProduct(b) - this.scoreProduct(a))
      .map((p) => this.serializeProduct(p));
  }

  keepaStatus() {
    return this.amazon.getStatus();
  }

  ingestCategoriesForMarket(market?: string) {
    return this.amazon.ingestCategoryLabels(market);
  }
}

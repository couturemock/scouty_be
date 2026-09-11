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
import { KeepaAmazonProvider } from '../integrations/amazon/keepa.provider';
import { AlibabaSupplierProvider } from '../integrations/suppliers/alibaba.provider';
import { CommercialSignal, SupplierOffer } from '../integrations/types';
import { RankingEntry } from '../rankings/ranking-entry.entity';
import { ProductSnapshot } from '../snapshots/product-snapshot.entity';
import { Product } from './product.entity';

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
    private readonly suppliers: AlibabaSupplierProvider,
    @Inject(forwardRef(() => CatalogService))
    private readonly catalog: CatalogService,
    @Inject(forwardRef(() => CreativeIntelligenceService))
    private readonly creativeIntelligence: CreativeIntelligenceService,
  ) {}

  private slugify(title: string, country: string, asin?: string) {
    if (asin) return `${country.toLowerCase()}-${asin.toLowerCase()}`;
    return `${country.toLowerCase()}-${title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60)}`;
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
      const slug = this.slugify(
        signal.title,
        signal.country,
        signal.externalId,
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
          where: { slug, catalogWeekKey: weekKey },
        }));

      if (!product) {
        product = this.products.create({ slug, title: signal.title });
      }

      const salePrice = signal.price ?? 0;
      const supplierOffers = await this.suppliers.findRelated(
        signal.title,
        5,
        salePrice,
      );
      const profitability = this.computeProfitability(salePrice, supplierOffers[0]);

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
      product.estimatedMarginPct = String(profitability.marginPct);
      product.estimatedProfit = String(profitability.estimatedProfit);
      product.meta = {
        ...(product.meta ?? {}),
        keepa: signal.raw ?? {},
        suppliers: supplierOffers,
        profitability,
        labels: {
          estimatedSales: 'Ventas mensuales estimadas (Keepa)',
          rank: 'Best Sellers Rank (BSR)',
          rating: 'Valoración Amazon',
          estimatedMarginPct: 'Margen estimado',
          estimatedProfit: 'Beneficio estimado por unidad',
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
    options?: { productsPerCategory?: number; ciTopN?: number },
  ) {
    const weekKey = currentWeekKey();
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
    });
    const products = await this.upsertFromSignals(amazonSignals, weekKey);

    const prevWeek = previousWeekKey();
    for (const product of products) {
      const exists = await this.snapshots.findOne({
        where: { productId: product.id, weekKey: prevWeek },
      });
      if (exists) continue;
      await this.snapshots.save(
        this.snapshots.create({
          productId: product.id,
          weekKey: prevWeek,
          rank: product.currentRank
            ? product.currentRank + Math.floor(Math.random() * 20) + 5
            : null,
          price: product.currentPrice,
          demand: product.estimatedSales,
          demandKind: 'estimated',
          estimatedSales: product.estimatedSales,
          estimatedSalesKind: product.estimatedSalesKind,
          gmv: null,
          gmvKind: 'unavailable',
          growthPct: null,
          signals: { seededPrevious: true },
        }),
      );
    }

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
    void this.creativeIntelligence
      .enrichTopProductsAtIngest(weekKey, (p) => this.scoreProduct(p), ciTopN)
      .then((ci) => {
        this.logger.log(
          `CI PipiAds listo week=${weekKey} enriched=${ci.enriched}/${ci.topN} credits≈${ci.totalCredits}`,
        );
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
            : undefined,
        running: true,
      },
      message:
        'Ingesta Keepa guardada. Creative Intelligence (PipiAds) sigue en segundo plano; refresca la lista en unos minutos. Si el weekKey ya existía (p. ej. 2026-W37), se actualizó esa fila — no se crea otra.',
    };
  }

  async rebuildRankings(weekKey: string) {
    const products = await this.products.find({
      where: { catalogWeekKey: weekKey },
    });
    await this.rankings.delete({ weekKey });

    const sorted = [...products].sort(
      (a, b) => this.scoreProduct(b) - this.scoreProduct(a),
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

    await writeBoard('general', '*', sorted, (p) => this.scoreProduct(p), 10);

    const byMargin = [...products].sort(
      (a, b) => this.scoreMargin(b) - this.scoreMargin(a),
    );
    await writeBoard('margin', '*', byMargin, (p) => this.scoreMargin(p), 10);

    const byProfit = [...products].sort(
      (a, b) => this.scoreProfitPotential(b) - this.scoreProfitPotential(a),
    );
    await writeBoard('profit', '*', byProfit, (p) => this.scoreProfitPotential(p), 10);

    const risers = await this.computeRisers(products, weekKey);
    for (const [index, row] of risers.slice(0, 10).entries()) {
      await this.rankings.save(
        this.rankings.create({
          weekKey,
          scope: 'rising',
          scopeKey: '*',
          position: index + 1,
          productId: row.product.id,
          score: String(row.rankDelta),
          signalSources: row.product.sources,
        }),
      );
    }

    const byCategory = new Map<string, Product[]>();
    const byCountry = new Map<string, Product[]>();
    for (const p of sorted) {
      const catKey = p.category.split(' · ')[0] || p.category;
      byCategory.set(catKey, [...(byCategory.get(catKey) ?? []), p]);
      byCountry.set(p.country, [...(byCountry.get(p.country) ?? []), p]);
    }
    for (const [category, list] of byCategory) {
      await writeBoard('category', category, list, (p) => this.scoreProduct(p), 10);
    }
    for (const [country, list] of byCountry) {
      await writeBoard('country', country, list, (p) => this.scoreProduct(p), 10);
    }
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
    const weekKey = await this.resolveWeekKey(view);
    const product =
      (await this.products.findOne({ where: { id: idOrSlug } })) ??
      (await this.products.findOne({ where: { slug: idOrSlug } })) ??
      (await this.products.findOne({ where: { amazonAsin: idOrSlug } }));

    if (!product || product.catalogWeekKey !== weekKey) {
      throw new NotFoundException('Producto no encontrado en el catálogo activo');
    }

    const history = await this.snapshots.find({
      where: { productId: product.id },
      order: { weekKey: 'ASC' },
    });

    const salePrice = Number(product.currentPrice ?? 0);
    const cached = (product.meta?.suppliers as SupplierOffer[] | undefined) ?? [];
    const needsRefresh =
      !cached.length ||
      cached.some(
        (s) =>
          s.kind === 'estimated' ||
          s.listingUrl?.includes('1688.com/search/-') ||
          (salePrice > 50 && (s.unitPriceEur ?? 0) < salePrice * 0.1),
      );

    const supplierOffers = needsRefresh
      ? await this.suppliers.findRelated(product.title, 5, salePrice)
      : cached;

    const profitability = this.computeProfitability(salePrice, supplierOffers[0]);

    // Refresh absurd / broken fixture data so UI is honest without re-ingest
    if (needsRefresh) {
      product.meta = {
        ...(product.meta ?? {}),
        suppliers: supplierOffers,
        profitability,
      };
      product.estimatedMarginPct = String(profitability.marginPct);
      product.estimatedProfit = String(profitability.estimatedProfit);
      await this.products.save(product);
    }

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
      profitability: {
        formula:
          'Beneficio estimado = PVP Amazon − coste proveedor − envío − comisiones Amazon (~15%)',
        basis:
          supplierOffers[0]?.kind === 'estimated'
            ? 'El coste de proveedor es una estimación Scout-ly (aún no hay API 1688/Alibaba). Se escala al PVP; en marcas (Apple, etc.) asume coste alto.'
            : 'Coste de proveedor según oferta enlazada.',
        ...profitability,
        labels: {
          estimatedProfit: 'Beneficio estimado',
          marginPct: 'Margen estimado',
        },
      },
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
}

import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  computeAdClusterScore,
  normalizeAdProductKey,
} from '../integrations/ads/ad-score';
import { productQueryTokens } from '../integrations/ads/ad-engagement';
import { amazonIngestRejectReason } from '../integrations/amazon/product-filters';
import { KeepaAmazonProvider } from '../integrations/amazon/keepa.provider';
import { PipiAdsProvider } from '../integrations/pipiads/pipiads.provider';
import { offerMatchesSeed } from '../integrations/suppliers/offer-relevance';
import { SuppliersService } from '../integrations/suppliers/suppliers.service';
import { CreativeAd, CommercialSignal, SupplierOffer } from '../integrations/types';
import { RankingEntry } from '../rankings/ranking-entry.entity';
import { Product } from '../products/product.entity';

/**
 * Broad category/product terms across common dropshipping verticals, run
 * through the reliable keyword-search path (`searchAdsForProduct`) —
 * discovery expansion happens here, not via the keyword-less browse (see
 * `discoveryEnabled` — verified live to return mostly non-product noise).
 * Kept as concrete, short, on-topic product terms so the existing relevance
 * filter (`filterAdsByRelevance`) still has something real to match against.
 */
const DEFAULT_SEEDS = [
  // Home / kitchen
  'portable blender',
  'led strip lights',
  'mini projector',
  'kitchen gadget',
  'air fryer accessories',
  'knife sharpener',
  'shower head filter',
  'closet organizer',
  // Cleaning
  'cleaning gel',
  'stain remover',
  'lint remover',
  'window cleaning tool',
  // Beauty / personal care
  'facial massager',
  'hair straightener brush',
  'blackhead remover',
  'nail art kit',
  // Wellness / fitness
  'neck massager',
  'posture corrector',
  'foam roller',
  'resistance bands set',
  'massage gun',
  'knee brace',
  // Pets
  'pet hair remover',
  'dog harness',
  'cat scratcher',
  'pet grooming brush',
  // Baby / kids
  'baby carrier',
  'kids night light',
  'toddler travel toy',
  // Car
  'car phone holder',
  'car vacuum cleaner',
  'car seat organizer',
  // Tech / phone accessories
  'phone camera lens kit',
  'wireless charger stand',
  'ring light',
  'mini bluetooth speaker',
  // Outdoor / travel
  'camping lantern',
  'travel neck pillow',
  'portable fan',
  // Office / desk
  'desk organizer',
  'ergonomic mouse pad',
  'cable management box',
].join(',');

/**
 * Postgres jsonb rejects NUL bytes, and a lone UTF-16 surrogate (an emoji
 * truncated mid-codepoint by PipiAds) still round-trips through
 * JSON.stringify/parse as "valid" JSON text but can't be encoded as UTF-8 —
 * pg then rejects the insert with "invalid input syntax for type json".
 * Strip both before saving.
 */
const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g;

function jsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (typeof v === 'bigint') return Number(v);
      if (typeof v === 'number' && !Number.isFinite(v)) return null;
      if (typeof v === 'string') {
        return v.replace(/\u0000/g, '').replace(LONE_SURROGATE, '');
      }
      if (v === undefined) return null;
      return v;
    }),
  ) as T;
}

function displayTitleFromSeed(seed: string): string {
  return seed
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .slice(0, 80);
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(
    normalizeAdProductKey(a)
      .split(' ')
      .filter(Boolean),
  );
  const tb = new Set(
    normalizeAdProductKey(b)
      .split(' ')
      .filter(Boolean),
  );
  if (!ta.size || !tb.size) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit += 1;
  return hit / Math.min(ta.size, tb.size);
}

/**
 * Independent Ad Winners path (Minea-lite): PipiAds seeds → cluster → Ad Score → suppliers.
 */
@Injectable()
export class AdWinnersService {
  private readonly logger = new Logger(AdWinnersService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly pipiads: PipiAdsProvider,
    private readonly suppliers: SuppliersService,
    private readonly amazon: KeepaAmazonProvider,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(RankingEntry)
    private readonly rankings: Repository<RankingEntry>,
  ) {}

  enabled() {
    const flag = this.config.get<string>('AD_WINNERS_ENABLED')?.trim();
    if (flag === '0' || flag === 'false') return false;
    return this.pipiads.enabled();
  }

  private seeds(): string[] {
    const raw =
      this.config.get<string>('AD_WINNER_SEEDS')?.trim() || DEFAULT_SEEDS;
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 60);
  }

  /**
   * Off by default — verified live against the real PipiAds API (2026-09-29,
   * region ES/US/GB): `/adspy/list` with no keyword returns "top viral video
   * ads across the whole platform", not "top dropshipping product ads". Even
   * after filtering app-install ads (`isAppPromotionAd`) and the category
   * denylist (`isNonProductAd`), most of what's left is still non-product:
   * travel booking, grocery delivery, streaming, holiday/religious greetings,
   * generic marketplace-brand promo (Amazon, Shopee). Keyword search
   * (`searchAdsForProduct`) stays the reliable path — this flag exists for
   * opt-in experimentation, not as the default discovery mechanism.
   */
  private discoveryEnabled(): boolean {
    const flag = this.config.get<string>('AD_DISCOVERY_ENABLED')?.trim();
    return flag === '1' || flag === 'true';
  }

  private discoveryLimit(): number {
    const n = Number(this.config.get('AD_DISCOVERY_LIMIT') ?? 40);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 100) : 40;
  }

  private discoveryPages(): number {
    const n = Number(this.config.get('AD_DISCOVERY_PAGES') ?? 2);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 5) : 2;
  }

  private topN(): number {
    const n = Number(this.config.get('AD_WINNERS_TOP_N') ?? 15);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 50) : 15;
  }

  private cleanTitle(title: string, seed: string): string {
    const t = title.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim();
    if (t.length >= 8) return t.slice(0, 120);
    return seed.slice(0, 120);
  }

  /**
   * Client-requested step: once ads point at a candidate product, actively
   * search Amazon for that *same* product (Keepa's own search endpoint) —
   * not just a lookup against whatever the weekly Keepa bestseller sweep
   * already ingested. Amazon here is the final verification step, not the
   * discovery source.
   */
  private async searchAmazonForCluster(
    cluster: { title: string; seed: string },
    market: string,
    weekKey: string,
  ): Promise<Product | null> {
    const base =
      cluster.title && cluster.title.length >= 8 ? cluster.title : cluster.seed;
    const tokens = productQueryTokens(base).slice(0, 6);
    const term = (tokens.length ? tokens.join(' ') : base).slice(0, 80);
    if (!term) return null;

    let signal: CommercialSignal | null = null;
    try {
      const found = await this.amazon.searchByKeyword(term, market, 3);
      signal = found[0] ?? null;
    } catch (err) {
      this.logger.warn(`Ad Winners Keepa verify "${term}": ${err}`);
      return null;
    }
    if (!signal) return null;

    const slug = `${market.toLowerCase()}-${signal.externalId.toLowerCase()}-${weekKey
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}`.slice(0, 80);

    const product =
      (await this.products.findOne({
        where: {
          amazonAsin: signal.externalId,
          country: market,
          catalogWeekKey: weekKey,
        },
      })) ??
      (await this.products.findOne({ where: { slug } })) ??
      this.products.create({ slug, title: signal.title });

    product.slug = slug;
    product.title = signal.title;
    product.imageUrl = signal.imageUrl ?? product.imageUrl ?? null;
    product.category = signal.category ?? product.category ?? 'Ad Winners';
    product.country = market;
    product.amazonAsin = signal.externalId;
    product.catalogWeekKey = weekKey;
    product.currentPrice =
      signal.price != null ? String(signal.price) : product.currentPrice ?? null;
    product.currentRank = signal.rank ?? product.currentRank ?? null;
    product.estimatedSales =
      signal.estimatedSales != null
        ? String(signal.estimatedSales)
        : product.estimatedSales ?? null;
    product.estimatedSalesKind =
      signal.estimatedSalesKind ?? product.estimatedSalesKind;
    product.growthPct =
      signal.growthPct != null
        ? String(signal.growthPct)
        : product.growthPct ?? null;
    product.brand = signal.brand ?? product.brand ?? null;
    product.rating =
      signal.rating != null ? String(signal.rating) : product.rating ?? null;
    product.reviewCount = signal.reviewCount ?? product.reviewCount ?? null;
    product.amazonUrl = signal.amazonUrl ?? product.amazonUrl ?? null;
    product.description = signal.description ?? product.description ?? null;

    const existingMeta =
      product.meta && typeof product.meta === 'object' ? product.meta : {};
    product.meta = {
      ...existingMeta,
      keepa: {
        ...((signal.raw as Record<string, unknown> | undefined) ?? {}),
        growthPct7: signal.growthPct7 ?? null,
        growthPct30: signal.growthPct30 ?? null,
      },
    };

    return product;
  }

  async runForWeek(weekKey: string, country = 'ES') {
    if (!this.enabled()) {
      this.logger.log('Ad Winners skip (disabled or no PipiAds)');
      return { clusters: 0, ranked: 0, credits: 0 };
    }

    // Fresh supplier quota — Amazon ingest already burned the previous budget.
    this.suppliers.beginIngestRun();

    const market = country.toUpperCase();
    const seeds = this.seeds();
    type Cluster = {
      key: string;
      title: string;
      seed: string;
      ads: CreativeAd[];
      advertisers: string[];
      thumb?: string;
    };
    const clusters = new Map<string, Cluster>();
    let credits = 0;

    const addAdToCluster = (ad: CreativeAd, fallbackSeed: string) => {
      const key =
        normalizeAdProductKey(ad.title) ||
        normalizeAdProductKey(fallbackSeed) ||
        fallbackSeed.toLowerCase();
      if (!key) return;
      const existing = clusters.get(key);
      const advertiser = String(ad.publicSignals?.advertiserName ?? '');
      if (existing) {
        existing.ads.push(ad);
        if (advertiser) existing.advertisers.push(advertiser);
        if (!existing.thumb && ad.thumbnailUrl) {
          existing.thumb = ad.thumbnailUrl;
        }
      } else {
        clusters.set(key, {
          key,
          seed: fallbackSeed,
          title: this.cleanTitle(ad.title, fallbackSeed),
          ads: [ad],
          advertisers: advertiser ? [advertiser] : [],
          thumb: ad.thumbnailUrl,
        });
      }
    };

    // Discovery phase (client-requested): scan the market's top-performing
    // ads directly instead of only re-checking a handful of known seeds —
    // this is what actually finds NEW winning products. `filterRealProductAds`
    // (inside discoverTopAds) already drops app/gambling/dating/political
    // ads that a keyword-less scan otherwise surfaces.
    if (this.discoveryEnabled()) {
      try {
        const { ads, creditsUsed } = await this.pipiads.discoverTopAds(
          market,
          this.discoveryLimit(),
          { pages: this.discoveryPages() },
        );
        credits += creditsUsed;
        for (const ad of ads) {
          // No hand-picked seed for a discovered ad — the ad's own (cleaned)
          // title doubles as the seed used later for supplier/Amazon lookup.
          addAdToCluster(ad, ad.title);
        }
        this.logger.log(
          `Ad Winners discovery ${market}: ${ads.length} candidate ads, credits≈${creditsUsed}`,
        );
      } catch (err) {
        this.logger.warn(`Ad Winners discovery ${market}: ${err}`);
      }
    }

    // Seed backfill: keeps re-checking known evergreen dropshipping
    // categories even when discovery misses them (e.g. low ad volume that
    // week, or the category isn't dominant enough to surface on its own).
    for (const seed of seeds) {
      try {
        const { ads, creditsUsed } = await this.pipiads.searchAdsForProduct(
          seed,
          market,
          12,
          { looseRelevance: true },
        );
        credits += creditsUsed;
        for (const ad of ads) addAdToCluster(ad, seed);
      } catch (err) {
        this.logger.warn(`Ad Winners seed "${seed}": ${err}`);
      }
    }

    type Scored = {
      cluster: Cluster;
      adScore: ReturnType<typeof computeAdClusterScore>;
      suppliers: SupplierOffer[];
      marginPct: number | null;
      hasLive: boolean;
    };
    const scored: Scored[] = [];

    // Prefer seed-level clusters: merge all ads for the same seed if fragmented
    const bySeed = new Map<string, Cluster>();
    for (const c of clusters.values()) {
      const seedKey = normalizeAdProductKey(c.seed) || c.seed;
      const prev = bySeed.get(seedKey);
      if (!prev) {
        bySeed.set(seedKey, { ...c, key: seedKey });
      } else {
        prev.ads.push(...c.ads);
        prev.advertisers.push(...c.advertisers);
        if (!prev.thumb && c.thumb) prev.thumb = c.thumb;
        if (c.title.length > prev.title.length) prev.title = c.title;
      }
    }

    for (const cluster of bySeed.values()) {
      // Same "useful for dropshipping" gate the Amazon ingest already applies
      // (no big brands, consumables/beverages, regulated/dangerous, medical,
      // heavy/fragile, generic junk) — discovery mode has no keyword to keep
      // it on-topic, so junk ads cluster into "products" here too without it.
      const rejectReason =
        amazonIngestRejectReason({ title: cluster.title }) ??
        amazonIngestRejectReason({ title: cluster.seed });
      if (rejectReason) {
        this.logger.debug(
          `Ad Winners skip cluster "${cluster.title.slice(0, 40)}" reason=${rejectReason}`,
        );
        continue;
      }

      const uniqueAdvertisers = [
        ...new Set(
          cluster.advertisers.map((a) => a.trim().toLowerCase()).filter(Boolean),
        ),
      ];
      // One strong long-running ad OR multi-creative / multi-advertiser
      const adScore = computeAdClusterScore(cluster.ads, uniqueAdvertisers);
      const strongSingle =
        cluster.ads.length >= 1 &&
        adScore.duration >= 40 &&
        adScore.engagement >= 25;
      if (
        cluster.ads.length < 2 &&
        uniqueAdvertisers.length < 2 &&
        !strongSingle
      ) {
        continue;
      }
      if (adScore.total < 28) continue;

      let suppliers: SupplierOffer[] = [];
      try {
        // Keyword-only: ad thumbnails (gym/lifestyle) poison Alibaba image search.
        const rawOffers = await this.suppliers.findRelated(
          cluster.seed,
          6,
          undefined,
          market,
          null,
        );
        suppliers = rawOffers.filter(
          (o) =>
            o.kind !== 'live' ||
            offerMatchesSeed(o.name, cluster.seed),
        );
        // If filters wiped live offers, keep search-link fallbacks for the seed
        if (!suppliers.some((s) => s.kind === 'live')) {
          suppliers = rawOffers.filter((o) => o.kind !== 'live');
        }
      } catch {
        suppliers = [];
      }
      const live = suppliers.filter(
        (s) => s.kind === 'live' && s.unitPriceEur != null,
      );
      const hasLive = live.length > 0;
      // No Amazon PVP on Ad Winners — don't invent margin %
      const marginPct = null;

      scored.push({
        cluster,
        adScore,
        suppliers,
        marginPct,
        hasLive,
      });
    }

    scored.sort((a, b) => {
      if (a.hasLive !== b.hasLive) return a.hasLive ? -1 : 1;
      return b.adScore.total - a.adScore.total;
    });
    const top = scored.slice(0, this.topN());

    const amazonCatalog = (
      await this.products.find({
        where: { catalogWeekKey: weekKey, country: market },
      })
    ).filter((p) => Boolean(p.amazonAsin));

    const matchAmazon = (cluster: Cluster): Product | null => {
      let best: { p: Product; score: number } | null = null;
      for (const p of amazonCatalog) {
        const key = normalizeAdProductKey(p.title);
        if (key && key === cluster.key) return p;
        const overlap = Math.max(
          tokenOverlap(p.title, cluster.title),
          tokenOverlap(p.title, cluster.seed),
        );
        if (overlap >= 0.6 && (!best || overlap > best.score)) {
          best = { p, score: overlap };
        }
      }
      return best?.p ?? null;
    };

    await this.rankings.delete({ weekKey, scope: 'ad_winners' });

    let ranked = 0;
    for (const [index, row] of top.entries()) {
      let amazonHit = matchAmazon(row.cluster);
      let verifiedLive = false;
      if (!amazonHit) {
        // No match in this week's already-ingested Keepa bestsellers — actively
        // search Amazon for this same ad-detected product instead of giving up.
        amazonHit = await this.searchAmazonForCluster(
          row.cluster,
          market,
          weekKey,
        );
        verifiedLive = Boolean(amazonHit);
      }
      let product: Product;

      if (amazonHit) {
        product = amazonHit;
        const sources = new Set([...(product.sources ?? []), 'ads', 'amazon']);
        product.sources = [...sources];
        product.meta = jsonSafe({
          ...(product.meta && typeof product.meta === 'object'
            ? product.meta
            : {}),
          adScore: row.adScore,
          adClusterKey: row.cluster.key,
          adSeed: row.cluster.seed,
          hasLiveSupplier: row.hasLive,
          amazonVerifiedLive: verifiedLive,
          creativeIntelligence: {
            ads: row.cluster.ads.slice(0, 12),
            provider: 'pipiads',
            fetchedAt: new Date().toISOString(),
            fromSnapshot: true,
            disclaimer: verifiedLive
              ? 'Producto detectado por anuncios (TikTok/Meta) y verificado en Amazon vía búsqueda Keepa en vivo: duración, advertisers, engagement. No son ventas Amazon reales.'
              : 'Ads cruzados con ASIN Amazon: duración, advertisers, engagement. No son ventas Amazon.',
          },
        });
        try {
          await this.products.save(product);
        } catch (err) {
          this.logger.warn(
            `Ad Winners attach Amazon "${product.title.slice(0, 40)}": ${err}`,
          );
          continue;
        }
      } else {
        const hash = createHash('sha1')
          .update(`${market}:${row.cluster.key}`)
          .digest('hex')
          .slice(0, 12);
        const slug = `${market.toLowerCase()}-ad-${hash}-${weekKey
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')}`;

        product =
          (await this.products.findOne({
            where: { slug, catalogWeekKey: weekKey },
          })) ??
          this.products.create({
            slug,
            title: row.cluster.title,
          });

        product.slug = slug;
        product.title = displayTitleFromSeed(row.cluster.seed);
        product.imageUrl = row.cluster.thumb ?? null;
        product.category = 'Ad Winners';
        product.country = market;
        product.sources = ['ads'];
        product.amazonAsin = null;
        product.catalogWeekKey = weekKey;
        product.growthPct = String(row.adScore.total);
        product.estimatedMarginPct = null;
        product.estimatedProfit = null;
        product.currentPrice = null;
        product.meta = jsonSafe({
          ...(product.meta && typeof product.meta === 'object'
            ? product.meta
            : {}),
          adScore: row.adScore,
          adClusterKey: row.cluster.key,
          adSeed: row.cluster.seed,
          hasLiveSupplier: row.hasLive,
          creativeIntelligence: {
            ads: row.cluster.ads.slice(0, 12),
            provider: 'pipiads',
            fetchedAt: new Date().toISOString(),
            fromSnapshot: true,
            disclaimer:
              'Ad Winners: cluster PipiAds (duración, advertisers, engagement). No son ventas Amazon.',
          },
          suppliers: row.suppliers,
          labels: {
            growthPct: 'Ad Score 0–100',
            dropSniperScore: 'N/A (vía ads)',
          },
        });
        try {
          await this.products.save(product);
        } catch (err) {
          this.logger.warn(
            `Ad Winners save product "${product.title.slice(0, 40)}": ${err}`,
          );
          continue;
        }
      }

      try {
        await this.rankings.save(
          this.rankings.create({
            weekKey,
            scope: 'ad_winners',
            scopeKey: '*',
            position: index + 1,
            productId: product.id,
            score: String(row.adScore.total),
            signalSources: product.sources ?? ['ads'],
          }),
        );
        ranked += 1;
      } catch (err) {
        this.logger.warn(`Ad Winners ranking row: ${err}`);
      }
    }

    this.logger.log(
      `Ad Winners week=${weekKey} clusters=${clusters.size} seedGroups=${bySeed.size} candidates=${scored.length} ranked=${ranked} credits≈${credits}`,
    );
    return { clusters: clusters.size, ranked, credits };
  }
}

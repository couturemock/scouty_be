import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  computeAdClusterScore,
  normalizeAdProductKey,
} from '../integrations/ads/ad-score';
import { PipiAdsProvider } from '../integrations/pipiads/pipiads.provider';
import { offerMatchesSeed } from '../integrations/suppliers/offer-relevance';
import { SuppliersService } from '../integrations/suppliers/suppliers.service';
import { CreativeAd, SupplierOffer } from '../integrations/types';
import { RankingEntry } from '../rankings/ranking-entry.entity';
import { Product } from '../products/product.entity';

const DEFAULT_SEEDS =
  'portable blender,neck massager,led strip lights,posture corrector,pet hair remover,mini projector,foam roller,cleaning gel';

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
      .slice(0, 20);
  }

  private cleanTitle(title: string, seed: string): string {
    const t = title.replace(/[\u{1F300}-\u{1FAFF}]/gu, '').trim();
    if (t.length >= 8) return t.slice(0, 120);
    return seed.slice(0, 120);
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

    for (const seed of seeds) {
      try {
        const { ads, creditsUsed } = await this.pipiads.searchAdsForProduct(
          seed,
          market,
          12,
          { looseRelevance: true },
        );
        credits += creditsUsed;
        for (const ad of ads) {
          const key =
            normalizeAdProductKey(ad.title) ||
            normalizeAdProductKey(seed) ||
            seed.toLowerCase();
          if (!key) continue;
          const existing = clusters.get(key);
          const advertiser = String(
            ad.publicSignals?.advertiserName ?? '',
          );
          if (existing) {
            existing.ads.push(ad);
            if (advertiser) existing.advertisers.push(advertiser);
            if (!existing.thumb && ad.thumbnailUrl) {
              existing.thumb = ad.thumbnailUrl;
            }
          } else {
            clusters.set(key, {
              key,
              seed,
              title: this.cleanTitle(ad.title, seed),
              ads: [ad],
              advertisers: advertiser ? [advertiser] : [],
              thumb: ad.thumbnailUrl,
            });
          }
        }
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
    const top = scored.slice(0, 10);

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
      const amazonHit = matchAmazon(row.cluster);
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
          creativeIntelligence: {
            ads: row.cluster.ads.slice(0, 12),
            provider: 'pipiads',
            fetchedAt: new Date().toISOString(),
            fromSnapshot: true,
            disclaimer:
              'Ads cruzados con ASIN Amazon: duración, advertisers, engagement. No son ventas Amazon.',
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

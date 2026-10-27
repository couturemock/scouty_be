import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  filterAdsByRelevance,
  productQueryTokens,
  sortAdsByEngagement,
} from '../ads/ad-engagement';
import {
  filterRealProductAds,
  isAppPromotionAd,
} from '../ads/ad-content-filters';
import { resolveCreativeSourceUrl } from '../ads/creative-source-url';
import {
  AdProductDetail,
  DiscoveredAd,
  DiscoveryPass,
} from '../../discovery/discovery.types';
import { CreativeAd } from '../types';
import { PipiAdsClient } from './pipiads.client';

type RawAd = Record<string, unknown>;

@Injectable()
export class PipiAdsProvider {
  private readonly logger = new Logger(PipiAdsProvider.name);

  constructor(
    private readonly client: PipiAdsClient,
    private readonly config: ConfigService,
  ) {}

  enabled() {
    return this.client.enabled();
  }

  async getStatus() {
    const searchResults = Number(this.config.get('CI_SEARCH_RESULTS') ?? 8);
    const defaultTopN = Number(this.config.get('CI_SNAPSHOT_TOP_N') ?? 30);
    if (!this.enabled()) {
      return {
        enabled: false,
        provider: 'fixture',
        creditsRemaining: null,
        creditsUsed: null,
        creditsTotal: null,
        defaultCiTopN: defaultTopN,
        searchResultsPerProduct: searchResults,
        estimatedCreditsPerProduct: searchResults,
      };
    }
    const credits = await this.client.getCredits();
    return {
      enabled: true,
      provider: 'pipiads',
      creditsRemaining: credits.remaining,
      creditsUsed: credits.used,
      creditsTotal: credits.total,
      creditsSource: credits.source,
      defaultCiTopN: defaultTopN,
      searchResultsPerProduct: searchResults,
      /** Two list calls (TikTok + Meta); each result still ~1 credit. */
      estimatedCreditsPerProduct: searchResults,
    };
  }

  regionForCountry(country?: string) {
    const map: Record<string, string[]> = {
      ES: ['ES', 'US', 'GB'],
      US: ['US', 'GB', 'CA'],
      DE: ['DE', 'US', 'GB'],
      FR: ['FR', 'US', 'GB'],
      IT: ['IT', 'US', 'GB'],
      UK: ['GB', 'US'],
      CA: ['CA', 'US'],
      MX: ['MX', 'US'],
    };
    return map[(country ?? 'US').toUpperCase()] ?? ['US', 'GB'];
  }

  private keywordFromTitle(title: string) {
    const tokens = productQueryTokens(title).slice(0, 6);
    if (tokens.length) return tokens.join(' ').slice(0, 80);
    return title
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 4)
      .join(' ')
      .slice(0, 80);
  }

  /** type:1 = keyword search across ad copy, advertiser, landing URL, product, creative. */
  private extendKeywords(keyword: string) {
    const phrase = keyword.trim().slice(0, 80);
    return [{ type: 1, keyword: phrase }];
  }

  private rawHaystack(raw: RawAd) {
    return [
      raw.desc,
      raw.ad_copy,
      raw.title,
      raw.product_name,
      raw.goods_name,
      raw.brand_name,
      raw.advertiser_name,
      raw.landing_page,
      raw.ad_url,
      raw.share_url,
    ]
      .map((v) => String(v ?? ''))
      .join(' ');
  }

  private platformFromRaw(raw: RawAd): CreativeAd['platform'] {
    const plat = raw.plat_type ?? raw.platform ?? raw.plat;
    if (plat === 1 || plat === 'tiktok' || plat === 'TikTok') return 'tiktok';
    if (plat === 2 || plat === 'facebook' || plat === 'Facebook') return 'facebook';
    const url = String(raw.ad_url ?? raw.url ?? raw.landing_page ?? '');
    if (url.includes('instagram')) return 'instagram';
    if (url.includes('facebook')) return 'facebook';
    return 'tiktok';
  }

  private analyzeAd(raw: RawAd, title: string): CreativeAd['aiAnalysis'] {
    const copy = String(raw.desc ?? raw.ad_copy ?? raw.title ?? title).toLowerCase();
    const hasUgc = /ugc|review|unboxing|demo|test/i.test(copy);
    const hasOffer = /%|off|free|gratis|descuento|sale|offer|limited/i.test(copy);
    const hasProblem = /problem|solve|finally|stop|never|sin |anti-/i.test(copy);
    const plays = Number(raw.play_count ?? raw.ad_play_count ?? 0);
    const days = Number(raw.put_day ?? raw.delivery_days ?? 0);

    const hook: 'Fuerte' | 'Medio' | 'Débil' =
      hasProblem || hasOffer ? 'Fuerte' : copy.length > 40 ? 'Medio' : 'Débil';
    const cta: 'Fuerte' | 'Medio' | 'Débil' =
      /shop now|buy|compra|order|link in bio|cta/i.test(copy) ? 'Fuerte' : 'Medio';

    return {
      label: 'Análisis/estimación de Scout-ly AI',
      hook,
      cta,
      ctrPotential: plays > 500_000 ? 'Alto' : plays > 50_000 ? 'Medio' : 'Bajo',
      conversionPotential: hasOffer && hasUgc ? 'Alto' : 'Medio',
      structure: hasProblem
        ? 'Hook problema → demo → prueba → CTA'
        : hasUgc
          ? 'UGC hook → demostración → CTA'
          : 'Hook → beneficio → CTA',
      format: String(raw.formate_type ?? raw.format ?? '').includes('2')
        ? 'Imagen / carrusel'
        : 'Vídeo vertical 9:16',
      angle: hasProblem
        ? 'Problema/solución'
        : hasOffer
          ? 'Oferta / urgencia'
          : hasUgc
            ? 'UGC / demostración'
            : 'Beneficio directo',
      notes:
        days > 30
          ? `Anuncio con ~${days} días de entrega estimados (señal pública PipiAds).`
          : undefined,
    };
  }

  private mapAd(
    raw: RawAd,
    fallbackTitle: string,
    country?: string,
  ): CreativeAd {
    const title =
      String(raw.desc ?? raw.ad_copy ?? raw.title ?? fallbackTitle).slice(0, 120) ||
      fallbackTitle;
    const platform = this.platformFromRaw(raw);
    const resolved = resolveCreativeSourceUrl({
      platform,
      productTitle: fallbackTitle,
      country,
      raw,
      candidates: [
        String(raw.url ?? ''),
        String(raw.share_url ?? ''),
        String(raw.tiktok_author_url ?? ''),
        String(raw.app_url ?? ''),
        String(raw.ad_url ?? ''),
        String(raw.landing_page ?? ''),
        String(raw.video_url ?? ''),
      ],
    });
    return {
      platform,
      title,
      thumbnailUrl: String(
        raw.cover ?? raw.cover_url ?? raw.thumbnail ?? raw.image ?? '',
      ) || undefined,
      sourceUrl: resolved.url,
      publicSignals: {
        label: 'Señales públicas PipiAds (sin clicks/CTR/CPA/ROAS reales en USD)',
        linkKind: resolved.kind,
        videoId: raw.video_id ?? raw.id,
        adArchiveId:
          raw.ad_archive_id ??
          raw.adArchiveId ??
          raw.facebook_ad_id ??
          raw.facebookAdId ??
          raw.archive_id,
        mediaUrl: raw.video_url || undefined,
        playCount: raw.play_count ?? raw.ad_play_count,
        likeCount: raw.digg_count ?? raw.like_count,
        // Not in the live payload today (confirmed empty across TikTok and
        // Meta responses, 2026-10-06) but kept as a forward-compatible
        // fallback in case a future PipiAds response variant includes them.
        commentCount: raw.comment_count,
        shareCount: raw.share_count,
        deliveryDays: raw.put_day ?? raw.put_days ?? raw.delivery_days,
        // `ad_cost`/`cost` never appear in the live payload (verified
        // 2026-10-06) — kept as a fallback only. `min_cpa`/`min_cpm` ARE
        // real fields PipiAds returns, but their scale is inconsistent with
        // real USD (e.g. a viral TikTok ad reporting min_cpm≈76,000, which
        // at its play count implies billions of dollars of spend) and
        // undocumented, so they're stored for reference/debugging only —
        // never treated as real spend and never fed into scoring.
        adSpendUsd: raw.ad_cost ?? raw.cost,
        estimatedCpaUnverified: raw.min_cpa,
        estimatedCpmUnverified: raw.min_cpm,
        hotValueUnverified: raw.hot_value,
        advertiserName: raw.app_name ?? raw.unique_id ?? raw.advertiser_name ?? raw.brand_name,
        region: raw.region ?? raw.fetch_region,
      },
      aiAnalysis: this.analyzeAd(raw, fallbackTitle),
    };
  }

  private extractList(data: unknown): RawAd[] {
    if (!data || typeof data !== 'object') return [];
    const obj = data as Record<string, unknown>;
    const list =
      obj.list ??
      obj.data ??
      obj.items ??
      obj.records ??
      (Array.isArray(data) ? data : []);
    return Array.isArray(list) ? (list as RawAd[]) : [];
  }

  async searchAdsForProduct(
    productTitle: string,
    country?: string,
    limit = 8,
    opts?: { looseRelevance?: boolean },
  ): Promise<{ ads: CreativeAd[]; creditsUsed: number }> {
    const keyword = opts?.looseRelevance
      ? productTitle.trim().slice(0, 80)
      : this.keywordFromTitle(productTitle);
    const searchSize = Math.min(
      Number(this.config.get('CI_SEARCH_RESULTS') ?? 8),
      20,
    );
    const detailCount = Math.min(
      Number(this.config.get('CI_DETAIL_COUNT') ?? 0),
      5,
    );
    const region = this.regionForCountry(country);
    const perPlatform = Math.min(20, Math.max(8, Math.ceil(searchSize)));
    const keywords = this.extendKeywords(keyword);

    const listParams = (plat_type: 1 | 2) => ({
      current_page: 1,
      page_size: perPlatform,
      plat_type,
      extend_keywords: keywords,
      // PipiAds defaults to word-segmented OR matching (is_participle=true),
      // which surfaces top-played ads sharing any single common word instead
      // of ones actually about the product. false = literal phrase match.
      is_participle: false,
      region,
      sort: 4,
      sort_type: 'desc',
    });

    const [tiktokRaw, metaRaw] = await Promise.all([
      this.client
        .call<unknown>('/v3/api/open/adspy/list', listParams(1))
        .then((data) => this.extractList(data))
        .catch((err) => {
          this.logger.warn(`PipiAds TikTok search: ${err}`);
          return [] as RawAd[];
        }),
      this.client
        .call<unknown>('/v3/api/open/adspy/list', listParams(2))
        .then((data) => this.extractList(data))
        .catch((err) => {
          this.logger.warn(`PipiAds Meta search: ${err}`);
          return [] as RawAd[];
        }),
    ]);

    let creditsUsed =
      Math.min(tiktokRaw.length, perPlatform) +
      Math.min(metaRaw.length, perPlatform);

    const mapped = [...tiktokRaw, ...metaRaw]
      .filter((raw) => {
        if (opts?.looseRelevance) return true;
        const hay = this.rawHaystack(raw);
        const tokens = productQueryTokens(keyword);
        if (!tokens.length) return true;
        const lower = hay.toLowerCase();
        return tokens.some((t) => lower.includes(t));
      })
      .map((r) => this.mapAd(r, productTitle, country));

    const seen = new Set<string>();
    const unique: CreativeAd[] = [];
    for (const ad of mapped) {
      const key =
        String(ad.publicSignals?.videoId ?? '') ||
        ad.sourceUrl ||
        `${ad.platform}:${ad.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(ad);
    }

    const minScore = opts?.looseRelevance
      ? 0.2
      : productQueryTokens(keyword).length <= 4
        ? 0.2
        : 0.34;
    // Real bug found via a live ingest: falling back to "top engagement
    // regardless of relevance" here surfaced completely unrelated viral
    // clips (a Fortnite ad, a beauty ASMR video, a Motrin post) under
    // products like "Portable Blender"/"Neck Massager" — every product
    // shown must be about that product. If nothing clears the relevance
    // bar, the honest answer is zero ads for this seed, not the wrong ones.
    const relevant = filterAdsByRelevance(unique, productTitle, minScore);
    if (unique.length && !relevant.length) {
      this.logger.warn(
        `PipiAds: ${unique.length} ads for "${productTitle}" discarded as irrelevant (keyword="${keyword}")`,
      );
    }

    const ads = sortAdsByEngagement(relevant).slice(0, limit);
    if (creditsUsed === 0) creditsUsed = ads.length;

    if (detailCount > 0) {
      for (const ad of ads.slice(0, detailCount)) {
        const id = ad.publicSignals?.videoId;
        if (!id) continue;
        try {
          await this.client.call('/v3/api/open/adspy/detail', {
            id: String(id),
          });
          creditsUsed += 20;
        } catch (err) {
          this.logger.warn(`PipiAds detail ${id}: ${err}`);
        }
      }
    }

    return { ads, creditsUsed };
  }

  /**
   * Discovery mode: browse the top-performing ads for a market/platform
   * WITHOUT a target product in mind (no `extend_keywords`), instead of
   * searching for one of a handful of hand-picked seeds. This is what lets
   * Ad Winners find products nobody typed in as a seed — the client-requested
   * "watch the ads, see what's scaling" behaviour, not just "look up these 8
   * known dropshipping products again".
   *
   * There is no `query` to score relevance against here (that's the whole
   * point), so `filterAdsByRelevance` doesn't apply. Instead, `mapAd` results
   * pass through `filterRealProductAds` — a keyword-less scan surfaces app
   * installs, gambling, dating and political ads alongside real product ads,
   * and none of those are useful for dropshipping regardless of how much
   * engagement they have.
   */
  async discoverTopAds(
    country: string,
    limit = 40,
    opts?: { pages?: number },
  ): Promise<{ ads: CreativeAd[]; creditsUsed: number }> {
    const region = this.regionForCountry(country);
    const pages = Math.max(1, Math.min(opts?.pages ?? 2, 5));
    const pageSize = Math.min(50, Math.max(20, Math.ceil(limit / pages)));

    const fetchPlatform = async (plat_type: 1 | 2): Promise<RawAd[]> => {
      const collected: RawAd[] = [];
      for (let page = 1; page <= pages; page += 1) {
        try {
          const data = await this.client.call<unknown>(
            '/v3/api/open/adspy/list',
            {
              current_page: page,
              page_size: pageSize,
              plat_type,
              // No extend_keywords: browse the platform's top ads for this
              // region instead of searching for a specific product.
              region,
              sort: 4,
              sort_type: 'desc',
            },
          );
          const list = this.extractList(data);
          if (!list.length) break;
          collected.push(...list);
        } catch (err) {
          this.logger.warn(
            `PipiAds discovery plat_type=${plat_type} page=${page}: ${err}`,
          );
          break;
        }
      }
      return collected;
    };

    const [tiktokRaw, metaRaw] = await Promise.all([
      fetchPlatform(1),
      fetchPlatform(2),
    ]);

    const creditsUsed = tiktokRaw.length + metaRaw.length;

    // Drop app-install/in-app-content ads before mapping (mapAd doesn't
    // carry app_id/data_type through to CreativeAd — see isAppPromotionAd).
    const rawProducts = [...tiktokRaw, ...metaRaw].filter(
      (r) => !isAppPromotionAd(r),
    );
    // mapAd already falls back to raw.desc/ad_copy/title internally.
    const mapped = rawProducts.map((r) => this.mapAd(r, 'Producto', country));

    const seen = new Set<string>();
    const unique: CreativeAd[] = [];
    for (const ad of mapped) {
      const key =
        String(ad.publicSignals?.videoId ?? '') ||
        ad.sourceUrl ||
        `${ad.platform}:${ad.title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(ad);
    }

    const realProducts = filterRealProductAds(unique);
    if (unique.length && !realProducts.length) {
      this.logger.warn(
        `PipiAds discovery: ${unique.length} ads found but all filtered as non-product (country=${country})`,
      );
    }

    const ads = sortAdsByEngagement(realProducts).slice(0, limit);
    return { ads, creditsUsed: creditsUsed || ads.length };
  }

  /**
   * Generic, filtered `/adspy/list` page for the weekly discovery snapshot.
   * Unlike `discoverTopAds`, callers pass e-commerce filters (shop_type,
   * data_type, put_day, first_time...) so the result is store product ads,
   * not platform-wide viral content.
   */
  async searchDiscovery(
    params: Record<string, unknown>,
    opts: { country: string; pass: DiscoveryPass; seed?: string },
  ): Promise<{ ads: DiscoveredAd[]; creditsUsed: number; hasNext: boolean }> {
    const { data, consumed } = await this.client.callWithMeta<unknown>(
      '/v3/api/open/adspy/list',
      { sort_type: 'desc', ...params },
    );
    const list = this.extractList(data);
    const page =
      data && typeof data === 'object'
        ? ((data as Record<string, unknown>).page as
            | Record<string, unknown>
            | undefined)
        : undefined;
    const queriedPlatform: CreativeAd['platform'] | null =
      params.plat_type === 1 ? 'tiktok' : params.plat_type === 2 ? 'facebook' : null;
    const ads = list
      .map((raw) => this.toDiscoveredAd(raw, opts))
      .filter((a): a is DiscoveredAd => a != null)
      .map((a) => {
        if (!queriedPlatform) return a;
        a.platform = queriedPlatform;
        a.creative.platform = queriedPlatform;
        return a;
      });
    return {
      ads,
      creditsUsed: consumed ?? list.length,
      hasNext: Boolean(page?.is_next),
    };
  }

  private toDiscoveredAd(
    raw: RawAd,
    opts: { country: string; pass: DiscoveryPass; seed?: string },
  ): DiscoveredAd | null {
    const videoId = String(raw.video_id ?? raw.id ?? '').trim();
    if (!videoId) return null;
    const copy = String(raw.desc ?? raw.app_title ?? raw.title ?? '').trim();
    const creative = this.mapAd(raw, opts.seed ?? (copy || 'Producto'), opts.country);
    const n = (v: unknown) => {
      const x = Number(v);
      return Number.isFinite(x) ? x : 0;
    };
    const ts = (v: unknown) => {
      const x = Number(v);
      return Number.isFinite(x) && x > 0 ? x : null;
    };
    const dataTypes = Array.isArray(raw.data_type)
      ? (raw.data_type as unknown[]).map(Number).filter(Number.isFinite)
      : [];
    const tags = Array.isArray(raw.ai_analysis_tags)
      ? (raw.ai_analysis_tags as unknown[]).map((t) => String(t)).filter(Boolean)
      : [];
    const script = raw.had_ai_analysis ? String(raw.ai_analysis_script ?? '').trim() || null : null;
    creative.publicSignals = {
      ...creative.publicSignals,
      storeId: raw.store_id ?? null,
      firstSeenAt: ts(raw.found_time) ?? ts(raw.ad_create_time),
      lastSeenAt: ts(raw.last_put_time),
      dataTypes,
      buttonText: raw.button_text ?? null,
    };
    return {
      videoId,
      platform: creative.platform,
      copy,
      script,
      advertiser:
        String(raw.unique_id ?? raw.app_name ?? '').trim() || null,
      advertiserId: String(raw.root_path_id ?? '').trim() || null,
      storeId: String(raw.store_id ?? '').trim() || null,
      shopType: String(raw.shop_type ?? '').trim() || null,
      dataTypes,
      buttonText: String(raw.button_text ?? '').trim() || null,
      putDays: n(raw.put_days ?? raw.put_day),
      plays: n(raw.play_count),
      likes: n(raw.digg_count),
      comments: n(raw.comment_count),
      shares: n(raw.share_count),
      firstSeenAt: ts(raw.found_time) ?? ts(raw.ad_create_time),
      lastSeenAt: ts(raw.last_put_time),
      aiTags: tags,
      pass: opts.pass,
      seed: opts.seed,
      creative,
    };
  }

  /**
   * `/adspy/detail` — 1 credit. The only place PipiAds exposes the advertised
   * product (title, price, currency) and the store landing URL; the list
   * payload only carries `store_id` (verified live 2026-10-12).
   */
  async adProductDetail(
    videoId: string,
  ): Promise<{ detail: AdProductDetail | null; creditsUsed: number }> {
    const { data, consumed } = await this.client.callWithMeta<unknown>(
      '/v3/api/open/adspy/detail',
      { id: videoId },
    );
    return { detail: parseAdProductDetail(data), creditsUsed: consumed ?? 1 };
  }
}

function str(v: unknown): string | null {
  const s = v == null ? '' : String(v).trim();
  return s && s !== 'null' ? s : null;
}

export function parseAdProductDetail(data: unknown): AdProductDetail | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const store = (d.ad_store ?? d.ad_advertiser ?? {}) as Record<string, unknown>;
  const landing = [d.app_url, d.landing_page, d.ad_url]
    .map(str)
    .find((u) => u != null && /^https?:\/\//i.test(u) && !/tiktok\.com|facebook\.com|instagram\.com/i.test(u));
  const price = Number(d.product_price);
  const domain =
    str(store.link)
      ?.replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/\/.*$/, '')
      .toLowerCase() ??
    (landing ? safeHost(landing) : null);
  const detail: AdProductDetail = {
    productId: str(d.product_id),
    productTitle: str(d.product_title),
    productPrice: Number.isFinite(price) && price > 0 ? price : null,
    productCurrency: str(d.product_currency),
    productImage: str(d.product_image),
    storeName: str(store.name),
    storeDomain: domain,
    landingUrl: landing ?? null,
  };
  if (!detail.productTitle && !detail.landingUrl && !detail.storeDomain) {
    return null;
  }
  return detail;
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

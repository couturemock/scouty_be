import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { sortAdsByEngagement } from '../ads/ad-engagement';
import { resolveCreativeSourceUrl } from '../ads/creative-source-url';
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

  private regionForCountry(country?: string) {
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
    return title
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 6)
      .join(' ')
      .slice(0, 80);
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
        String(raw.share_url ?? ''),
        String(raw.ad_url ?? ''),
        String(raw.url ?? ''),
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
        label: 'Señales públicas PipiAds (sin CTR/CPA/ROAS reales)',
        linkKind: resolved.kind,
        videoId: raw.video_id ?? raw.id,
        playCount: raw.play_count ?? raw.ad_play_count,
        likeCount: raw.digg_count ?? raw.like_count,
        deliveryDays: raw.put_day ?? raw.delivery_days,
        adSpendUsd: raw.ad_cost ?? raw.cost,
        region: raw.region,
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
  ): Promise<{ ads: CreativeAd[]; creditsUsed: number }> {
    const keyword = this.keywordFromTitle(productTitle);
    const searchSize = Math.min(
      Number(this.config.get('CI_SEARCH_RESULTS') ?? 8),
      20,
    );
    const detailCount = Math.min(
      Number(this.config.get('CI_DETAIL_COUNT') ?? 0),
      5,
    );
    const region = this.regionForCountry(country);
    const perPlatform = Math.max(4, Math.ceil(searchSize / 2));

    // Always query TikTok and Meta separately so we don't end up with only one network.
    const [tiktokRaw, metaRaw] = await Promise.all([
      this.client
        .call<unknown>('/v3/api/open/adspy/list', {
          current_page: 1,
          page_size: perPlatform,
          plat_type: 1,
          extend_keywords: [{ type: 1, keyword }],
          region,
          sort: 4,
          sort_type: 'desc',
        })
        .then((data) => this.extractList(data))
        .catch((err) => {
          this.logger.warn(`PipiAds TikTok search: ${err}`);
          return [] as RawAd[];
        }),
      this.client
        .call<unknown>('/v3/api/open/adspy/list', {
          current_page: 1,
          page_size: perPlatform,
          plat_type: 2,
          extend_keywords: [{ type: 1, keyword }],
          region,
          sort: 4,
          sort_type: 'desc',
        })
        .then((data) => this.extractList(data))
        .catch((err) => {
          this.logger.warn(`PipiAds Meta search: ${err}`);
          return [] as RawAd[];
        }),
    ]);

    let creditsUsed =
      Math.min(tiktokRaw.length, perPlatform) +
      Math.min(metaRaw.length, perPlatform);

    // Map everything we got, then rank by views/likes in Scout-ly (not only remote sort).
    const mapped = [...tiktokRaw, ...metaRaw].map((r) =>
      this.mapAd(r, productTitle, country),
    );
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

    const ads = sortAdsByEngagement(unique).slice(0, limit);
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
}

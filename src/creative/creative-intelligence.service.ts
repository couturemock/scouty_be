import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { planById } from '../common/plans';
import {
  sortAdsByEngagement,
  summarizeWinningFormats,
  type WinningFormatStat,
} from '../integrations/ads/ad-engagement';
import {
  librarySearchTerm,
  metaAdLibraryAdUrl,
  metaAdLibrarySearchUrl,
  tiktokAdLibrarySearchUrl,
} from '../integrations/ads/creative-source-url';
import { CreativeAdsProvider } from '../integrations/ads/creative-ads.provider';
import {
  computeAdClusterScore,
  type AdClusterScore,
} from '../integrations/ads/ad-score';
import { CreativeAd } from '../integrations/types';
import { Product } from '../products/product.entity';
import { UsageService } from '../usage/usage.service';
import { User } from '../users/user.entity';

export interface StoredCreativeIntelligence {
  ads: CreativeAd[];
  provider: string;
  creditsUsed?: number;
  fetchedAt: string;
  fromSnapshot: boolean;
  disclaimer: string;
  winningFormats?: WinningFormatStat[];
}

@Injectable()
export class CreativeIntelligenceService {
  private readonly logger = new Logger(CreativeIntelligenceService.name);

  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    private readonly ads: CreativeAdsProvider,
    private readonly usage: UsageService,
    private readonly config: ConfigService,
  ) {}

  private disclaimer() {
    return 'Anuncios similares ordenados por vistas e interacciones públicas (PipiAds). No son CTR, CPA ni ROAS de Meta o TikTok Ads Manager.';
  }

  /**
   * Prefer Meta/TikTok library pages. Never promote PipiAds CDN mp4 to sourceUrl
   * (browsers download the file instead of opening an ad page).
   */
  repairAdLinks(ads: CreativeAd[], country = 'US'): CreativeAd[] {
    return ads.map((ad) => {
      const signals = { ...(ad.publicSignals ?? {}) };
      const media = String(signals.mediaUrl ?? signals.videoUrl ?? '').trim();
      let src = String(ad.sourceUrl ?? '').trim();
      const isCdn =
        /\.(mp4|m3u8|webm)(\?|$)/i.test(src) ||
        /pipiads\.com|pipispy\.com/i.test(src);

      if (media && /^https?:\/\//i.test(media)) {
        signals.mediaUrl = media;
      }

      // Already a deep Meta ad link — keep it
      if (
        !isCdn &&
        src.includes('facebook.com') &&
        src.includes('ads/library') &&
        /[?&]id=\d{5,}/.test(src)
      ) {
        return {
          ...ad,
          sourceUrl: src,
          publicSignals: { ...signals, linkKind: 'ad' },
        };
      }

      if (isCdn || !src) {
        const archiveId = String(
          signals.adArchiveId ?? signals.facebookAdId ?? '',
        ).trim();
        if (
          (ad.platform === 'facebook' || ad.platform === 'instagram') &&
          /^\d{5,}$/.test(archiveId)
        ) {
          return {
            ...ad,
            sourceUrl: metaAdLibraryAdUrl(archiveId, 'ALL'),
            publicSignals: { ...signals, linkKind: 'ad' },
          };
        }

        const term = librarySearchTerm(
          String(signals.advertiserName ?? ad.title ?? 'product'),
        );
        const href =
          ad.platform === 'tiktok'
            ? tiktokAdLibrarySearchUrl(term, country)
            : metaAdLibrarySearchUrl(term, country);
        return {
          ...ad,
          sourceUrl: href,
          publicSignals: { ...signals, linkKind: 'search' },
        };
      }

      return {
        ...ad,
        sourceUrl: src,
        publicSignals: signals,
      };
    });
  }

  private withRanking(ads: CreativeAd[], country?: string) {
    const ranked = sortAdsByEngagement(this.repairAdLinks(ads, country));
    return {
      ads: ranked,
      winningFormats: summarizeWinningFormats(ranked),
    };
  }

  adScoreFromAds(
    ads: CreativeAd[],
    provider?: string,
  ): AdClusterScore | null {
    if (provider === 'fixture' || !ads.length) return null;
    const advertisers = ads
      .map((ad) => String(ad.publicSignals?.advertiserName ?? ''))
      .filter(Boolean);
    return computeAdClusterScore(ads, advertisers);
  }

  getStored(product: {
    meta?: Record<string, unknown> | null;
    country?: string;
  }): StoredCreativeIntelligence | null {
    const stored = product.meta?.creativeIntelligence as
      | StoredCreativeIntelligence
      | undefined;
    if (!stored?.ads?.length) return null;
    const ranked = this.withRanking(stored.ads, product.country);
    return {
      ...stored,
      ads: ranked.ads,
      winningFormats: ranked.winningFormats,
      disclaimer: stored.disclaimer || this.disclaimer(),
    };
  }

  async enrichProductAtIngest(product: Product): Promise<StoredCreativeIntelligence> {
    const { ads, provider, creditsUsed } = await this.ads.fetchAds(
      product.title,
      8,
      product.country,
    );
    const ranked = this.withRanking(ads, product.country);
    const adScore = this.adScoreFromAds(ranked.ads, provider);
    const payload: StoredCreativeIntelligence = {
      ads: ranked.ads,
      winningFormats: ranked.winningFormats,
      provider,
      creditsUsed,
      fetchedAt: new Date().toISOString(),
      fromSnapshot: true,
      disclaimer: this.disclaimer(),
    };
    product.meta = {
      ...(product.meta ?? {}),
      creativeIntelligence: payload,
      ...(adScore ? { adScore } : { adScore: { total: 0 } }),
    };
    await this.products.save(product);
    return payload;
  }

  async enrichTopProductsAtIngest(
    weekKey: string,
    scoreFn: (p: Product) => number,
    topNOverride?: number,
  ) {
    const topN =
      topNOverride != null && Number.isFinite(topNOverride) && topNOverride > 0
        ? Math.min(Math.floor(topNOverride), 200)
        : Number(this.config.get('CI_SNAPSHOT_TOP_N') ?? 60);
    const rows = await this.products.find({ where: { catalogWeekKey: weekKey } });
    const top = [...rows]
      .sort((a, b) => scoreFn(b) - scoreFn(a))
      .slice(0, topN);

    let totalCredits = 0;
    let enriched = 0;
    for (const product of top) {
      try {
        const result = await this.enrichProductAtIngest(product);
        totalCredits += result.creditsUsed ?? 0;
        enriched += 1;
      } catch (err) {
        this.logger.warn(`CI ingest ${product.id}: ${err}`);
      }
    }

    return { enriched, totalCredits, topN };
  }

  async fetchForAnalysis(
    productTitle: string,
    country?: string,
    product?: Product | null,
  ) {
    if (product) {
      const cached = this.getStored(product);
      if (cached) {
        return {
          ads: cached.ads,
          winningFormats: cached.winningFormats,
          provider: cached.provider,
          cached: true,
          disclaimer: cached.disclaimer,
        };
      }
    }
    const { ads, provider } = await this.ads.fetchAds(
      productTitle,
      8,
      country,
    );
    const ranked = this.withRanking(ads, country);
    return {
      ads: ranked.ads,
      winningFormats: ranked.winningFormats,
      provider,
      cached: false,
      disclaimer: this.disclaimer(),
    };
  }

  async analyzeOnDemand(
    user: User,
    productTitle: string,
    productId?: string,
    country?: string,
  ) {
    let product: Product | null = null;
    if (productId) {
      product = await this.products.findOne({ where: { id: productId } });
    }

    const market =
      country?.trim().toUpperCase() ||
      product?.country ||
      user.targetMarket ||
      'ES';

    const cached = product ? this.getStored(product) : null;
    if (cached) {
      return {
        productTitle,
        ads: cached.ads,
        winningFormats: cached.winningFormats,
        provider: cached.provider,
        cached: true,
        creditsUsed: 0,
        proposal: this.buildProposal(user, productTitle, cached.winningFormats),
        disclaimer: cached.disclaimer,
      };
    }

    await this.usage.assertAndIncrement(user, 'creative_intelligence');
    const { ads, provider, creditsUsed } = await this.ads.fetchAds(
      productTitle,
      8,
      market,
    );
    const ranked = this.withRanking(ads, market);

    if (product) {
      const adScore = this.adScoreFromAds(ranked.ads, provider);
      product.meta = {
        ...(product.meta ?? {}),
        creativeIntelligence: {
          ads: ranked.ads,
          winningFormats: ranked.winningFormats,
          provider,
          creditsUsed,
          fetchedAt: new Date().toISOString(),
          fromSnapshot: false,
          disclaimer: this.disclaimer(),
        },
        ...(adScore ? { adScore } : {}),
      };
      await this.products.save(product);
    }

    return {
      productTitle,
      ads: ranked.ads,
      winningFormats: ranked.winningFormats,
      provider,
      cached: false,
      creditsUsed,
      proposal: this.buildProposal(user, productTitle, ranked.winningFormats),
      upgradeRequiredForProposal: !planById(user.plan).creativeProposal,
      disclaimer: this.disclaimer(),
    };
  }

  private buildProposal(
    user: User,
    productTitle: string,
    formats?: WinningFormatStat[],
  ) {
    if (!planById(user.plan).creativeProposal) return null;
    const topFormat = formats?.[0]?.format ?? 'Vídeo vertical 9:16, 12–20s';
    return {
      label: 'Propuesta original Scout-ly AI (no es copia literal)',
      hook: `¿Sigues pagando de más por ${productTitle.slice(0, 60)}?`,
      script: [
        'Segundo 0-3: problema visual rápido.',
        'Segundo 3-8: demostración del producto en uso real.',
        'Segundo 8-12: prueba social / beneficio principal.',
        'Segundo 12-15: oferta clara + CTA.',
      ],
      cta: 'Compra ahora con envío rápido',
      angle: 'Problema/solución con demostración UGC',
      structure: 'Hook → demo → prueba → CTA',
      recommendedFormat: topFormat,
    };
  }

  forProductDetail(product: Product) {
    const stored = this.getStored(product);
    if (stored) {
      const ads =
        stored.provider === 'fixture'
          ? []
          : stored.ads.filter((ad) => {
              const kind = String(ad.publicSignals?.linkKind ?? '');
              const plays = Number(ad.publicSignals?.playCount ?? 0);
              if (kind === 'search' && !(plays > 0)) return false;
              return true;
            });
      return {
        ads,
        winningFormats: ads.length ? stored.winningFormats ?? [] : [],
        paused: ads.length === 0,
        provider: stored.provider,
        fetchedAt: stored.fetchedAt,
        fromSnapshot: stored.fromSnapshot,
        disclaimer: stored.disclaimer,
        message:
          ads.length === 0
            ? 'Sin anuncios reales de PipiAds para este producto.'
            : undefined,
      };
    }
    return {
      ads: [],
      winningFormats: [],
      paused: true,
      message:
        'Sin creatividades en este snapshot. Aparecen en el Top del ranking o bajo demanda (Creative Intelligence).',
    };
  }
}

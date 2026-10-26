import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreativeAdFixtureProvider } from '../ads/creative-ad-fixture.provider';
import { AiAdSearchProvider } from '../openai/ai-ad-search.provider';
import { PipiAdsProvider } from '../pipiads/pipiads.provider';
import { AdsProvider, CreativeAd } from '../types';

export interface CreativeFetchResult {
  ads: CreativeAd[];
  provider: string;
  creditsUsed: number;
  cached: boolean;
}

@Injectable()
export class CreativeAdsProvider implements AdsProvider {
  private readonly logger = new Logger(CreativeAdsProvider.name);
  readonly name: string;

  constructor(
    private readonly config: ConfigService,
    private readonly pipiads: PipiAdsProvider,
    private readonly fixture: CreativeAdFixtureProvider,
    private readonly aiAds: AiAdSearchProvider,
  ) {
    const mode = this.config.get<string>('CREATIVE_PROVIDER') ?? 'auto';
    this.name =
      mode === 'fixture' || !this.pipiads.enabled()
        ? 'fixture'
        : 'pipiads';
  }

  private usePipiAds() {
    const mode = this.config.get<string>('CREATIVE_PROVIDER') ?? 'auto';
    if (mode === 'fixture') return false;
    if (mode === 'pipiads') return this.pipiads.enabled();
    return this.pipiads.enabled();
  }

  async findRelatedAds(
    productTitle: string,
    limit = 5,
    country?: string,
  ): Promise<CreativeAd[]> {
    const result = await this.fetchAds(productTitle, limit, country);
    return result.ads;
  }

  async fetchAds(
    productTitle: string,
    limit = 5,
    country?: string,
  ): Promise<CreativeFetchResult> {
    const take = Math.min(Math.max(limit, 3), 8);
    let weakPipiAds: { ads: CreativeAd[]; creditsUsed: number } | null = null;

    if (this.usePipiAds()) {
      try {
        const { ads, creditsUsed } = await this.pipiads.searchAdsForProduct(
          productTitle,
          country,
          take,
        );
        if (ads.length >= 3) {
          return {
            ads: ads.slice(0, take),
            provider: 'pipiads',
            creditsUsed,
            cached: false,
          };
        }
        // A single ad clearing a loose relevance filter is noise, not
        // signal — one shared keyword is enough to pass but not enough to
        // trust as "the ad for this product". Below 2, keep it as a partial
        // result but still try the AI fallback below for more real signal.
        if (ads.length >= 2) {
          this.logger.warn(
            `PipiAds devolvió ${ads.length} ads para "${productTitle}", usando fixture parcial`,
          );
          return {
            ads,
            provider: 'pipiads',
            creditsUsed,
            cached: false,
          };
        }
        this.logger.warn(
          `PipiAds devolvió ${ads.length} ads para "${productTitle}" (insuficiente), probando IA`,
        );
        weakPipiAds = { ads, creditsUsed };
      } catch (err) {
        this.logger.warn(`PipiAds falló: ${err}. Probando IA.`);
      }
    }

    // Last resort before the honest search-shortcut fixture: ask OpenAI to
    // find a real, currently-running ad via web search. `findAd` returns
    // null unless it's backed by a real citation and clears the same
    // relevance bar PipiAds ads have to clear — never a guess.
    const aiAd = await this.aiAds.findAd(productTitle, country).catch((err) => {
      this.logger.warn(`AI ad search falló: ${err}`);
      return null;
    });
    if (aiAd) {
      const ads = [...(weakPipiAds?.ads ?? []), aiAd];
      return {
        ads,
        provider: 'openai_search',
        creditsUsed: weakPipiAds?.creditsUsed ?? 0,
        cached: false,
      };
    }

    const ads = await this.fixture.findRelatedAds(productTitle, take, country);
    return {
      ads,
      provider: 'fixture',
      creditsUsed: 0,
      cached: false,
    };
  }
}

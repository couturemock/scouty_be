import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreativeAdFixtureProvider } from '../ads/creative-ad-fixture.provider';
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
        this.logger.warn(
          `PipiAds devolvió ${ads.length} ads para "${productTitle}", usando fixture parcial`,
        );
        if (ads.length) {
          return {
            ads,
            provider: 'pipiads',
            creditsUsed,
            cached: false,
          };
        }
      } catch (err) {
        this.logger.warn(`PipiAds falló: ${err}. Fallback fixture.`);
      }
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

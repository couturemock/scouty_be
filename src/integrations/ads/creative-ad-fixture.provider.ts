import { Injectable } from '@nestjs/common';
import { CreativeAd, AdsProvider } from '../types';
import {
  librarySearchTerm,
  metaAdLibrarySearchUrl,
  tiktokAdLibrarySearchUrl,
} from './creative-source-url';

/**
 * Honest fallback when PipiAds has no relevant ads.
 * These are library search shortcuts — never invent fake ads with fake metrics.
 */
@Injectable()
export class CreativeAdFixtureProvider implements AdsProvider {
  readonly name = 'meta_tiktok_fixture';

  async findRelatedAds(
    productTitle: string,
    limit = 5,
    country = 'ES',
  ): Promise<CreativeAd[]> {
    const term = librarySearchTerm(productTitle);
    const ads: CreativeAd[] = [
      {
        platform: 'facebook',
        title: `Buscar “${term}” en Meta Ad Library`,
        sourceUrl: metaAdLibrarySearchUrl(term, country),
        publicSignals: {
          label: 'Atajo de búsqueda (no es un anuncio concreto)',
          linkKind: 'search',
          note: 'PipiAds no devolvió anuncios claros para este producto. Abrí Meta con el keyword prefiltrado.',
        },
      },
      {
        platform: 'tiktok',
        title: `Buscar “${term}” en TikTok Ad Library`,
        sourceUrl: tiktokAdLibrarySearchUrl(term, country),
        publicSignals: {
          label: 'Atajo de búsqueda (no es un anuncio concreto)',
          linkKind: 'search',
          note: 'La biblioteca TikTok busca por keyword/anunciante; no garantiza el mismo creativo que PipiAds.',
        },
      },
    ];
    return ads.slice(0, Math.min(Math.max(limit, 2), ads.length));
  }
}

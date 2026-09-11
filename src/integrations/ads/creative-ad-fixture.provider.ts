import { Injectable } from '@nestjs/common';
import { CreativeAd, AdsProvider } from '../types';
import {
  metaAdLibrarySearchUrl,
  tiktokSearchUrl,
} from './creative-source-url';

@Injectable()
export class CreativeAdFixtureProvider implements AdsProvider {
  readonly name = 'meta_tiktok_fixture';

  async findRelatedAds(
    productTitle: string,
    limit = 5,
    country = 'ES',
  ): Promise<CreativeAd[]> {
    const term = productTitle
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 4)
      .join(' ')
      .slice(0, 60) || productTitle.slice(0, 40)

    const ads: CreativeAd[] = [
      {
        platform: 'tiktok',
        title: `${productTitle}: demo UGC en 15s`,
        sourceUrl: tiktokSearchUrl(term, country),
        publicSignals: {
          label: 'Referencia de ejemplo (fixture)',
          linkKind: 'search',
          playCount: 1_250_000,
          likeCount: 48_000,
          note: 'Sin PIPIADS_API_KEY: abre la biblioteca de anuncios TikTok del producto, no un anuncio concreto.',
        },
        aiAnalysis: {
          label: 'Análisis/estimación de Scout-ly AI',
          hook: 'Fuerte',
          cta: 'Fuerte',
          ctrPotential: 'Alto',
          conversionPotential: 'Medio',
          structure: 'Hook → demo → oferta → CTA',
          format: 'UGC vertical 9:16',
          angle: 'Problema/solución',
        },
      },
      {
        platform: 'instagram',
        title: `${productTitle}: before/after`,
        sourceUrl: metaAdLibrarySearchUrl(term, country),
        publicSignals: {
          label: 'Meta Ad Library (fixture · búsqueda)',
          linkKind: 'search',
          playCount: 420_000,
          likeCount: 12_500,
          note: 'Sin PIPIADS_API_KEY: abre Meta Ad Library con el producto prefiltrado (todos los anuncios, no políticos).',
        },
        aiAnalysis: {
          label: 'Análisis/estimación de Scout-ly AI',
          hook: 'Medio',
          cta: 'Fuerte',
          ctrPotential: 'Medio',
          conversionPotential: 'Alto',
          structure: 'Problema → prueba social → CTA',
          format: 'Reels',
          angle: 'Transformación',
        },
      },
      {
        platform: 'facebook',
        title: `${productTitle}: oferta limitada`,
        sourceUrl: metaAdLibrarySearchUrl(term, country),
        publicSignals: {
          label: 'Meta Ad Library (fixture · búsqueda)',
          linkKind: 'search',
          playCount: 180_000,
          likeCount: 6_200,
          note: 'Sin PIPIADS_API_KEY: abre Meta Ad Library con el producto prefiltrado.',
        },
        aiAnalysis: {
          label: 'Análisis/estimación de Scout-ly AI',
          hook: 'Fuerte',
          cta: 'Medio',
          ctrPotential: 'Alto',
          conversionPotential: 'Medio',
          structure: 'Hook numérico → beneficios → CTA',
          format: 'Video 4:5',
          angle: 'Oferta',
        },
      },
    ];
    return ads.slice(0, Math.min(Math.max(limit, 3), 5));
  }
}

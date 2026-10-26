import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { filterAdsByRelevance, productQueryTokens } from '../ads/ad-engagement';
import { isUselessCreativeUrl } from '../ads/creative-source-url';
import { CreativeAd } from '../types';
import { OpenAiClient, sameUrl } from './openai.client';
import { parseFirstFoundJson } from './parse-found-json';

type ParsedAd = {
  found: boolean;
  platform?: string;
  title?: string;
  url?: string;
};

function toPlatform(value: string | undefined): CreativeAd['platform'] {
  const v = (value ?? '').toLowerCase();
  if (v.includes('tiktok')) return 'tiktok';
  if (v.includes('instagram')) return 'instagram';
  return 'facebook';
}

/**
 * Last-resort ad lookup via OpenAI web search, used only when PipiAds comes
 * back with fewer than 2 relevant ads. Never invents an ad: a result only
 * counts if it's backed by a real `url_citation`, the URL actually looks
 * like an ad/library page (`isUselessCreativeUrl`, the same guard the
 * PipiAds path uses), and the title clears the same relevance bar PipiAds
 * results have to clear (`filterAdsByRelevance`).
 */
@Injectable()
export class AiAdSearchProvider {
  private readonly logger = new Logger(AiAdSearchProvider.name);

  constructor(
    private readonly client: OpenAiClient,
    private readonly config: ConfigService,
  ) {}

  enabled() {
    if (this.config.get<string>('AI_ADS_FALLBACK_ENABLED') === 'false') return false;
    return this.client.enabled();
  }

  async findAd(productTitle: string, country?: string): Promise<CreativeAd | null> {
    if (!this.enabled()) return null;

    try {
      const result = await this.client.searchWeb({
        instructions:
          'Sos un investigador de publicidad. Buscá un anuncio REAL y activo (no contenido ' +
          'orgánico, no una tienda, no un resultado de búsqueda genérico) de este producto en ' +
          'TikTok o en la Meta Ad Library (facebook.com/ads/library). Tiene que ser la página real ' +
          'del anuncio o de su entrada en la librería pública, no la home del producto. Si no ' +
          'encontrás un anuncio real, decilo — nunca inventes uno. Respondé SOLO con un JSON al ' +
          'final de tu mensaje: {"found": true|false, "platform": "tiktok"|"facebook"|"instagram", ' +
          '"title": "<título/copy del anuncio>", "url": "<URL exacta del anuncio>"}.',
        query: `Anuncio real para "${productTitle}"${country ? ` (región: ${country})` : ''}.`,
      });

      const parsed = parseFirstFoundJson<ParsedAd>(result.text);
      if (!parsed?.found || !parsed.url) return null;

      const citation = result.citations.find((c) => sameUrl(c.url, parsed.url!));
      if (!citation) {
        this.logger.debug(`AI ad search "${productTitle.slice(0, 40)}": URL sin citación real, descartado`);
        return null;
      }
      if (isUselessCreativeUrl(parsed.url)) {
        this.logger.debug(`AI ad search "${productTitle.slice(0, 40)}": URL no parece un anuncio, descartado`);
        return null;
      }

      const candidate: CreativeAd = {
        platform: toPlatform(parsed.platform),
        title: (parsed.title || productTitle).slice(0, 120),
        sourceUrl: parsed.url,
        publicSignals: {
          label: 'Anuncio encontrado por IA (búsqueda web) — verificar antes de usar, no viene de PipiAds.',
          linkKind: 'ad',
        },
      };

      const minScore = productQueryTokens(productTitle).length <= 4 ? 0.2 : 0.34;
      const [relevant] = filterAdsByRelevance([candidate], productTitle, minScore);
      if (!relevant) {
        this.logger.debug(`AI ad search "${productTitle.slice(0, 40)}": título no coincide, descartado`);
        return null;
      }

      return relevant;
    } catch (err) {
      this.logger.warn(`AI ad search "${productTitle.slice(0, 40)}": ${err}`);
      return null;
    }
  }
}

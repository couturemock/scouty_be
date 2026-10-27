import { Injectable, Logger } from '@nestjs/common';
import { DiscoveredAd } from '../../discovery/discovery.types';
import { OpenAiClient } from './openai.client';

export type PrefilterVerdict = {
  id: string;
  apto: boolean;
  motivo: string;
};

const SYSTEM_PROMPT = `Sos un comprador experto de dropshipping que filtra candidatos antes de gastar
presupuesto en investigarlos a fondo. Te paso una lista de anuncios (id + texto + tags) detectados en
TikTok o Meta. El texto puede ser el gancho corto on-screen ("Genetics.") o, cuando PipiAds ya lo
transcribió, el guion completo hablado del video — ese es el que de verdad describe el producto; el
gancho solo casi nunca alcanza. Las "tags" son la clasificación automática que PipiAds ya le hizo al
anuncio (ej. #skincare, #serum, #petsupplies) — úsalas como señal extra de qué tipo de producto es,
sobre todo cuando el texto es ambiguo o es solo un gancho corto sin info real. Para cada uno, decidí
si el producto anunciado es apto para dropshipping:

- Tiene que ser un producto FÍSICO que un proveedor tipo CJdropshipping o AliExpress pueda tener en
  stock y despachar tal cual: nada hecho a medida, nada de servicio, nada digital (software,
  suscripciones, cursos, descargas). Las tags ayudan a detectar esto (ej. #app, #course, #coaching
  son buena señal de que no es físico, aunque el gancho no lo diga).
- Factor "wow"/impulso: se tiene que poder explicar y vender en 15-30s de video (truco visual,
  antes/después, soluciona un problema cotidiano).
- NO es una marca grande o registrada (Nike, Apple, Samsung, etc.), NO es electrónica regulada
  (medicinal, vapeadores), NO es ingerible (suplementos, gomitas, comida), NO es joyería fina (oro
  macizo, diamantes), NO es venta al por mayor/bulk. Las tags también sirven para pescar esto (ej.
  #supplements, #vape, #finejewelry).
- Si el texto Y las tags son ambiguos o no dan información suficiente para decidir con confianza,
  marcá apto=true (nunca inventes un motivo de rechazo que ninguno de los dos sostenga — dejá pasar
  la duda a la siguiente etapa, que sí mira el producto con más detalle).

Respondé SOLO un objeto JSON, sin texto extra: {"items": [{"id": "<id>", "apto": true|false, "motivo": "<motivo breve>"}]}`;

/**
 * Cheap pre-detail filter: runs on candidates that already passed the free
 * regex gate (`adRejectReason`), BEFORE spending a PipiAds `adspy/detail`
 * credit on them. Never blocks discovery on an OpenAI outage or malformed
 * response — a missing verdict means "let it through", the detail credit
 * gate downstream still applies.
 */
@Injectable()
export class DropshipPrefilterProvider {
  private readonly logger = new Logger(DropshipPrefilterProvider.name);

  constructor(private readonly client: OpenAiClient) {}

  enabled() {
    return this.client.enabled();
  }

  async filter(ads: DiscoveredAd[], batchSize = 25): Promise<Map<string, PrefilterVerdict>> {
    const verdicts = new Map<string, PrefilterVerdict>();
    if (!this.enabled() || !ads.length) return verdicts;

    for (let i = 0; i < ads.length; i += batchSize) {
      const batch = ads.slice(i, i + batchSize);
      const payload = batch.map((ad) => ({
        id: ad.videoId,
        // `script` (PipiAds' own AI transcript of the video) is far more
        // informative than the on-screen hook alone — found live: a hook
        // of just "Genetics." told the model nothing, while its script
        // ("...It's a hydrating serum and gentle exfoliator...") named the
        // actual product. Falls back to the hook when there's no script
        // (most non-video or un-analyzed ads).
        texto: (ad.script || ad.copy || ad.creative.title || '').slice(0, 300),
        tags: ad.aiTags.slice(0, 8),
      }));
      try {
        const result = await this.client.completeJson<{ items?: PrefilterVerdict[] }>({
          system: SYSTEM_PROMPT,
          user: JSON.stringify(payload),
          maxOutputTokens: Math.max(200, 60 * batch.length),
        });
        for (const item of result.items ?? []) {
          if (item?.id) verdicts.set(String(item.id), item);
        }
      } catch (err) {
        this.logger.warn(`OpenAI prefilter batch@${i}: ${err}`);
      }
    }
    return verdicts;
  }
}

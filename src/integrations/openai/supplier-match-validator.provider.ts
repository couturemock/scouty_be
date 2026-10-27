import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OpenAiClient } from './openai.client';

type MatchVerdict = { id: number; same: boolean; motivo?: string };

const SYSTEM_PROMPT = `Sos un verificador que compara el título de un producto que vendemos contra
listados reales de un proveedor (CJdropshipping/AliExpress), para confirmar que cada listado es
efectivamente EL MISMO producto y no uno distinto que quedó pegado por una búsqueda de palabras
clave. Te paso el título del producto (a veces vago o ambiguo por sí solo — ej. "THE DAILY" es en
realidad un suplemento diario para perros, no se nota solo por el título), opcionalmente tags de IA
que ya clasificaron el anuncio (ej. #dogsupplement, #petmultivitamin — usalas para saber qué es
realmente el producto cuando el título no alcanza), y una lista de listados (id + nombre). Para cada
id, decidí si el listado es el mismo producto físico — misma función/tipo de objeto principal; color,
material, tamaño o cantidad pueden variar sin que deje de ser el mismo producto. Si tenés duda real
(el nombre es ambiguo pero no contradice ni al título ni a las tags), marcá same=true: preferimos un
match dudoso a descartar uno real por error — un filtro de palabras clave anterior ya sacó los casos
obviamente distintos.

Respondé SOLO un JSON: {"items": [{"id": <id>, "same": true|false, "motivo": "<motivo breve>"}]}`;

/**
 * Fine-grained same-product check for live CJ/AliExpress offers, run AFTER
 * the free keyword-overlap filter (`offerMatchesSeed`). Real bug this
 * catches: that filter is loose enough that two *different* products can
 * share enough generic words to pass (see `offer-relevance.ts` for the live
 * example that motivated `GENERIC_TOKENS`) — this is a semantic second
 * opinion, not a search, so it's a plain cheap Chat Completion (no
 * `web_search` tool, no per-search fee). Never blocks on an OpenAI outage or
 * malformed response: an offer with no verdict is kept, same philosophy as
 * `DropshipPrefilterProvider`.
 */
@Injectable()
export class SupplierMatchValidatorProvider {
  private readonly logger = new Logger(SupplierMatchValidatorProvider.name);

  constructor(
    private readonly client: OpenAiClient,
    private readonly config: ConfigService,
  ) {}

  enabled() {
    if (this.config.get<string>('AI_SUPPLIER_MATCH_VALIDATION_ENABLED') === 'false') return false;
    return this.client.enabled();
  }

  /**
   * Keeps only the offers the model confirms are the same product (or
   * didn't get a verdict for). `aiTags` — PipiAds' own free classification
   * of the ad (e.g. `#dogsupplement`) — is optional context for when the
   * title alone doesn't say what the product actually is. Real bug found
   * live: "THE DAILY" (a dog supplement, per its tags) got matched against
   * "Silicone Daily Necessitiesr" — same generic word "Daily", nothing else
   * in common — because the title alone gave the model nothing to tell them
   * apart.
   */
  async filterSameProduct<T extends { name: string }>(
    productTitle: string,
    offers: T[],
    aiTags?: string[],
  ): Promise<T[]> {
    if (!this.enabled() || !offers.length) return offers;

    const indexed = offers.map((o, id) => ({ id, nombre: o.name.slice(0, 160) }));
    const payload: { producto: string; tags?: string[]; listados: typeof indexed } = {
      producto: productTitle.slice(0, 160),
      listados: indexed,
    };
    if (aiTags?.length) payload.tags = aiTags.slice(0, 8);
    try {
      const result = await this.client.completeJson<{ items?: MatchVerdict[] }>({
        system: SYSTEM_PROMPT,
        user: JSON.stringify(payload),
        maxOutputTokens: Math.max(150, 50 * offers.length),
      });
      const verdicts = new Map((result.items ?? []).map((v) => [Number(v.id), v]));
      return offers.filter((offer, id) => {
        const verdict = verdicts.get(id);
        if (!verdict || verdict.same) return true;
        this.logger.debug(
          `Supplier match "${offer.name.slice(0, 40)}" vs "${productTitle.slice(0, 40)}": distinto` +
            (verdict.motivo ? ` (${verdict.motivo})` : ''),
        );
        return false;
      });
    } catch (err) {
      this.logger.warn(`Supplier match validation "${productTitle.slice(0, 40)}": ${err}`);
      return offers;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { toEur } from '../shared/fx';
import { offerIsSameProduct } from '../suppliers/offer-relevance';
import { SupplierOffer } from '../types';
import { OpenAiClient, sameUrl } from './openai.client';
import { parseFirstFoundJson } from './parse-found-json';

type ParsedPrice = {
  found: boolean;
  name?: string;
  price?: number;
  currency?: string;
  url?: string;
};

/** There's no live Alibaba API (see plan notes) — a citation on alibaba.com is how Alibaba shows up at all. */
function sourceForUrl(url: string): SupplierOffer['source'] {
  try {
    return new URL(url).hostname.replace(/^www\./, '').includes('alibaba.com') ? 'alibaba' : 'ai';
  } catch {
    return 'ai';
  }
}

/**
 * Last-resort price lookup via OpenAI web search, used only when CJ and
 * AliExpress both came back with no live offer. Never invents a price: a
 * result only counts if it's backed by a real `url_citation` (see
 * `OpenAiClient.searchWeb`), parses to a positive number, and the listing
 * name still looks like the same product (`offerIsSameProduct`, the same
 * check CJ/AliExpress offers already have to pass).
 */
@Injectable()
export class AiSupplierSearchProvider {
  private readonly logger = new Logger(AiSupplierSearchProvider.name);

  constructor(
    private readonly client: OpenAiClient,
    private readonly config: ConfigService,
  ) {}

  enabled() {
    if (this.config.get<string>('AI_SUPPLIER_FALLBACK_ENABLED') === 'false') return false;
    return this.client.enabled();
  }

  async findPrice(
    productTitle: string,
    salePriceEur: number | undefined,
    market: string,
  ): Promise<SupplierOffer | null> {
    if (!this.enabled()) return null;

    const priceHint =
      salePriceEur != null ? ` El precio de venta al público ronda ${salePriceEur} EUR.` : '';
    try {
      const result = await this.client.searchWeb({
        instructions:
          'Sos un buscador de proveedores de dropshipping. Buscá este producto PRIMERO en ' +
          'Alibaba.com (precio de mayorista/proveedor) — es la fuente preferida. Si no encontrás ' +
          'un listado real con precio en Alibaba, probá en AliExpress, CJdropshipping, o cualquier ' +
          'otra tienda online real que lo venda al por mayor o a precio de proveedor, y encontrá su ' +
          'precio de compra real, verificado en la página. Si no encontrás un listado real con ' +
          'precio en ningún lado, decilo — nunca inventes un precio. Respondé SOLO con un JSON al ' +
          'final de tu mensaje: {"found": true|false, "name": "<título del listado>", ' +
          '"price": <número>, "currency": "<ISO 4217>", "url": "<URL exacta del listado>"}.',
        query: `Precio de proveedor para "${productTitle}" (mercado de envío: ${market}).${priceHint}`,
      });

      return this.validate(parseFirstFoundJson<ParsedPrice>(result.text), result.citations, productTitle);
    } catch (err) {
      this.logger.warn(`AI supplier search "${productTitle.slice(0, 40)}": ${err}`);
      return null;
    }
  }

  /**
   * Same lookup as `findPrice`, but for N products at once — used by the
   * weekly ingest so a shortlist needing a second price opinion (CJ alone
   * isn't enough, see `SuppliersService.findRelated`) isn't one sequential
   * round-trip per product.
   *
   * This used to pack every item into a single prompt and ask the model to
   * search each one before answering. Live testing caught it doing a real
   * search for one item and then fabricating a plausible-looking URL with
   * ZERO citations for the rest of the same batch — our citation check
   * correctly rejected those, but it meant most of a batch came back empty
   * even when a real listing existed. Fixed by firing one independent
   * `findPrice` call per item instead (same proven single-item search +
   * validation), run concurrently in groups of `AI_SUPPLIER_BATCH_SIZE` —
   * there's no longer a multi-item prompt for the model to cut corners on.
   * Cost is unaffected: OpenAI bills `web_search` per actual search, not per
   * request, so this only removes the opening to skip a real search, it
   * doesn't change what a real search costs.
   */
  async findPricesBatch(
    items: Array<{ title: string; salePriceEur?: number }>,
    market: string,
  ): Promise<Array<SupplierOffer | null>> {
    const results: Array<SupplierOffer | null> = items.map(() => null);
    if (!this.enabled() || !items.length) return results;

    // `findPrice` never throws (it catches and logs internally), so a plain
    // `Promise.all` is enough — one group's failures can't take down another.
    const concurrency = Math.max(1, Number(this.config.get('AI_SUPPLIER_BATCH_SIZE') ?? 3));
    for (let start = 0; start < items.length; start += concurrency) {
      const group = items.slice(start, start + concurrency);
      const offers = await Promise.all(
        group.map((item) => this.findPrice(item.title, item.salePriceEur, market)),
      );
      offers.forEach((offer, i) => {
        results[start + i] = offer;
      });
    }
    return results;
  }

  /** Shared acceptance rule: real citation + numeric price + same-product check. Never invents. */
  private validate(
    parsed: ParsedPrice | null,
    citations: Array<{ url: string }>,
    productTitle: string,
  ): SupplierOffer | null {
    if (!parsed?.found || !parsed.url || !(Number(parsed.price) > 0)) return null;

    // The URL must be one the model actually retrieved, not one it typed.
    const citation = citations.find((c) => sameUrl(c.url, parsed.url!));
    if (!citation) {
      this.logger.debug(`AI supplier "${productTitle.slice(0, 40)}": URL sin citación real, descartado`);
      return null;
    }

    const name = parsed.name || productTitle;
    if (!offerIsSameProduct({ name, matchedBy: 'keyword' }, productTitle)) {
      this.logger.debug(`AI supplier "${productTitle.slice(0, 40)}": match insuficiente, descartado`);
      return null;
    }

    const unitPriceEur = toEur(Number(parsed.price), parsed.currency);
    if (unitPriceEur == null) return null;

    const source = sourceForUrl(parsed.url);
    return {
      source,
      name,
      listingUrl: parsed.url,
      unitPriceEur,
      kind: 'live',
      matchedBy: 'keyword',
      note:
        source === 'alibaba'
          ? 'Precio de Alibaba encontrado por IA (búsqueda web) — verificar en la tienda antes de usarlo.'
          : 'Precio encontrado por IA (búsqueda web) — verificar en la tienda antes de usarlo.',
    };
  }
}

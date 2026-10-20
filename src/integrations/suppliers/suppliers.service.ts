import { Injectable, Logger } from '@nestjs/common';
import { SupplierOffer } from '../types';
import { AliExpressSupplierProvider } from './aliexpress.provider';
import { CjSupplierProvider } from './cj.provider';
import { offerMatchesSeed } from './offer-relevance';
import { supplierSearchKeywords } from './search-keywords';

function searchLinkFallback(productTitle: string, limit: number): SupplierOffer[] {
  const seed = supplierSearchKeywords(productTitle) || productTitle.slice(0, 40);
  const q = encodeURIComponent(seed);
  const offers: SupplierOffer[] = [
    {
      source: 'aliexpress',
      name: `${seed} — Buscar en AliExpress`,
      listingUrl: `https://www.aliexpress.com/wholesale?SearchText=${q}`,
      kind: 'estimated',
      region: 'AliExpress',
      note: 'Sin precio live: abrí la búsqueda y compará listings.',
    },
    {
      source: 'cj',
      name: `${seed} — Buscar en CJdropshipping`,
      listingUrl: `https://cjdropshipping.com/search?keyword=${q}`,
      kind: 'estimated',
      region: 'CJdropshipping',
      note: 'Sin precio live: abrí la búsqueda en CJ.',
    },
  ];
  return offers.slice(0, Math.max(0, limit));
}

/** Landed cost (unit + shipping when known) — the number margin is computed from. */
export function landedCostEur(o: SupplierOffer): number {
  return (o.unitPriceEur ?? Infinity) + (o.shippingEstimateEur ?? 0);
}

/**
 * Live: AliExpress Business API (RapidAPI) + CJdropshipping API 2.0, queried
 * in parallel. Failures / quota → plain search-link fallbacks (no API, no
 * cost). Never throws.
 */
@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    private readonly aliexpress: AliExpressSupplierProvider,
    private readonly cj: CjSupplierProvider,
  ) {}

  status() {
    return {
      aliexpress: {
        enabled: this.aliexpress.enabled(),
        provider: this.aliexpress.name,
      },
      cj: {
        enabled: this.cj.enabled(),
        provider: this.cj.name,
      },
    };
  }

  beginIngestRun() {
    // No per-run budget to reset anymore — kept as a no-op so callers
    // (products.service.ts, ad-winners.service.ts) don't need changes.
  }

  /**
   * Identify candidate products from a photo alone (no title yet) — AliExpress
   * Business API image search (`imageurl_search.php`).
   */
  async identifyByImage(
    imageUrl: string,
    limit = 5,
    market = 'ES',
  ): Promise<SupplierOffer[]> {
    return this.aliexpress.searchByImageOnly(imageUrl, limit, market).catch((err) => {
      this.logger.warn(`AliExpress image identify: ${err}`);
      return [] as SupplierOffer[];
    });
  }

  async findRelated(
    productTitle: string,
    limit = 6,
    salePriceEur?: number,
    market = 'ES',
    imageUrl?: string | null,
  ): Promise<SupplierOffer[]> {
    const take = Math.min(Math.max(limit, 1), 9);
    const perSource = Math.max(3, Math.ceil(take / 2) + 1);

    const [byKeyword, byCj] = await Promise.all([
      this.aliexpress
        .findRelated(productTitle, perSource, salePriceEur, market)
        .catch((err) => {
          this.logger.warn(`AliExpress keyword search: ${err}`);
          return [] as SupplierOffer[];
        }),
      this.cj.findRelated(productTitle, perSource, salePriceEur, market).catch((err) => {
        this.logger.warn(`CJ keyword search: ${err}`);
        return [] as SupplierOffer[];
      }),
    ]);

    const relevant = (o: SupplierOffer) =>
      o.kind !== 'live' || offerMatchesSeed(o.name, productTitle);
    let merged = [...byKeyword, ...byCj].filter(relevant);

    if (merged.length < take && imageUrl) {
      const byImage = await this.aliexpress
        .searchByImageOnly(imageUrl, take - merged.length, market)
        .catch((err) => {
          this.logger.warn(`AliExpress image search: ${err}`);
          return [] as SupplierOffer[];
        });
      const seen = new Set(merged.map((o) => o.listingUrl));
      for (const o of byImage.filter(relevant)) {
        if (seen.has(o.listingUrl)) continue;
        seen.add(o.listingUrl);
        merged.push(o);
      }
    }

    merged = merged.sort((a, b) => landedCostEur(a) - landedCostEur(b));
    this.logger.log(
      `Suppliers "${productTitle.slice(0, 40)}" → AE ${merged.filter((o) => o.source === 'aliexpress').length} · CJ ${merged.filter((o) => o.source === 'cj').length}`,
    );

    if (merged.length >= take) return merged.slice(0, take);

    const fallback = searchLinkFallback(productTitle, take - merged.length);
    const seen = new Set(merged.map((o) => o.listingUrl));
    for (const s of fallback) {
      if (seen.has(s.listingUrl)) continue;
      merged.push(s);
    }

    return merged.slice(0, take);
  }

  /** Adds real CJ freight to the cheapest CJ offer (2 extra CJ requests). */
  async withShipping(offers: SupplierOffer[], market: string): Promise<SupplierOffer[]> {
    const idx = offers.findIndex(
      (o) => o.source === 'cj' && o.kind === 'live' && o.shippingEstimateEur == null,
    );
    if (idx < 0) return offers;
    const enriched = await this.cj.withFreight(offers[idx]!, market).catch(() => offers[idx]!);
    const next = [...offers];
    next[idx] = enriched;
    return next.sort((a, b) => landedCostEur(a) - landedCostEur(b));
  }
}

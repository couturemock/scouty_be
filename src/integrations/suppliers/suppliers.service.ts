import { Injectable, Logger } from '@nestjs/common';
import { AiSupplierSearchProvider } from '../openai/ai-supplier-search.provider';
import { SupplierMatchValidatorProvider } from '../openai/supplier-match-validator.provider';
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
    private readonly aiSupplier: AiSupplierSearchProvider,
    private readonly matchValidator: SupplierMatchValidatorProvider,
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
    opts?: { skipAiFallback?: boolean },
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

    // Match against the same cleaned keyword the search itself used, not the
    // raw title — a real bug found live: "Krazy Klean Pro (10-year
    // warranty)" searched fine as "Krazy Klean Pro" (CJ found 4 live
    // offers), but the relevance check then compared against the full raw
    // title, so "warranty" (the last token, never present in a generic
    // supplier listing) sank every one of them.
    const matchSeed = supplierSearchKeywords(productTitle) || productTitle;
    const relevant = (o: SupplierOffer) =>
      o.kind !== 'live' || offerMatchesSeed(o.name, matchSeed);
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

    // Second, finer-grained pass: `offerMatchesSeed` above is a cheap
    // keyword-overlap check and lets through offers that share enough
    // generic words without being the same product (see `offer-relevance.ts`
    // for the live bug that motivated this). Ask the model directly whether
    // each live offer is really the same product before showing it.
    const liveOffers = merged.filter((o) => o.kind === 'live');
    if (liveOffers.length) {
      const confirmed = await this.matchValidator.filterSameProduct(productTitle, liveOffers);
      const keep = new Set(confirmed.map((o) => o.listingUrl));
      const rejected = liveOffers.length - confirmed.length;
      if (rejected > 0) {
        this.logger.log(
          `Suppliers "${productTitle.slice(0, 40)}": validador de IA descartó ${rejected}/${liveOffers.length} ofertas live por no ser el mismo producto`,
        );
      }
      merged = merged.filter((o) => o.kind !== 'live' || keep.has(o.listingUrl));
    }

    merged = merged.sort((a, b) => landedCostEur(a) - landedCostEur(b));

    // CJ alone is not treated as "we're covered" — we want a second price
    // opinion (AliExpress live, or the AI fallback) even when CJ already
    // found something, not just when every real source came back empty.
    // `skipAiFallback` lets bulk ingest batch this across many products in
    // one request instead of one-at-a-time (see TrendDiscoveryService).
    const hasNonCjLive = merged.some((o) => o.kind === 'live' && o.source !== 'cj');
    if (!hasNonCjLive && !opts?.skipAiFallback) {
      const aiOffer = await this.aiSupplier.findPrice(productTitle, salePriceEur, market);
      if (aiOffer) merged.push(aiOffer);
    }

    this.logger.log(
      `Suppliers "${productTitle.slice(0, 40)}" → AE ${merged.filter((o) => o.source === 'aliexpress').length} · CJ ${merged.filter((o) => o.source === 'cj').length} · Alibaba ${merged.filter((o) => o.source === 'alibaba').length} · IA ${merged.filter((o) => o.source === 'ai').length}`,
    );

    if (merged.length >= take) return merged.slice(0, take);
    // Once there's at least one real offer (CJ/AliExpress/AI), a generic
    // "search this on AliExpress" link next to it is noise, not a second
    // option — it points at a marketplace search, not this product. Only
    // pad with it when we have literally nothing real to show.
    if (merged.length > 0) return merged;

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

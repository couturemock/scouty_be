import { Injectable, Logger } from '@nestjs/common';
import { SupplierOffer } from '../types';
import { AlibabaComSupplierProvider } from './alibaba-com.provider';
import { AlibabaSupplierProvider } from './alibaba.provider';
import { AliExpressSupplierProvider } from './aliexpress.provider';
import { offerMatchesSeed } from './offer-relevance';

/**
 * Live: AliExpress True API + Otapi Alibaba.com.
 * Failures / quota → search-link fallbacks. Never throws.
 */
@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    private readonly aliexpress: AliExpressSupplierProvider,
    private readonly alibabaCom: AlibabaComSupplierProvider,
    private readonly links: AlibabaSupplierProvider,
  ) {}

  status() {
    return {
      aliexpress: {
        enabled: this.aliexpress.enabled(),
        provider: this.aliexpress.name,
      },
      alibabaCom: {
        enabled: this.alibabaCom.enabled(),
        provider: this.alibabaCom.name,
        host: 'otapi-alibaba',
      },
    };
  }

  beginIngestRun() {
    this.alibabaCom.resetRunBudget();
  }

  /**
   * Identify candidate products from a photo alone (no title yet) — only
   * Alibaba.com/Otapi supports image search; AliExpress is keyword-only.
   */
  async identifyByImage(imageUrl: string, limit = 5): Promise<SupplierOffer[]> {
    return this.alibabaCom.searchByImageOnly(imageUrl, limit).catch((err) => {
      this.logger.warn(`Alibaba.com image identify: ${err}`);
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
    const perSource = Math.min(4, Math.max(2, Math.ceil(take / 2)));

    const [aeRaw, albRaw] = await Promise.all([
      this.aliexpress
        .findRelated(productTitle, perSource, salePriceEur, market)
        .catch((err) => {
          this.logger.warn(`AliExpress spike: ${err}`);
          return [] as SupplierOffer[];
        }),
      this.alibabaCom
        .findRelated(productTitle, perSource, salePriceEur, imageUrl)
        .catch((err) => {
          this.logger.warn(`Alibaba.com spike: ${err}`);
          return [] as SupplierOffer[];
        }),
    ]);

    // A keyword/image search can return a live-priced item that shares no
    // real identity with the product (Alibaba's image-only mode in
    // particular matches generic packaging shapes, not the product itself).
    // Drop those before they ever reach the UI as a trustworthy live offer.
    const ae = aeRaw.filter(
      (o) => o.kind !== 'live' || offerMatchesSeed(o.name, productTitle),
    );
    const alb = albRaw.filter(
      (o) => o.kind !== 'live' || offerMatchesSeed(o.name, productTitle),
    );
    const droppedIrrelevant =
      aeRaw.length - ae.length + (albRaw.length - alb.length);

    const merged = this.mergeDiverse([ae, alb], take);

    this.logger.log(
      `Suppliers "${productTitle.slice(0, 40)}" → AE ${ae.length} · Alibaba ${alb.length} · merged ${merged.length}` +
        (droppedIrrelevant
          ? ` (${droppedIrrelevant} descartados por baja relevancia)`
          : ''),
    );

    if (merged.length >= take) return merged;

    try {
      const fallback = await this.links.findRelated(
        productTitle,
        take - merged.length,
        salePriceEur,
      );
      const seen = new Set(merged.map((o) => o.listingUrl));
      for (const s of fallback) {
        if (seen.has(s.listingUrl)) continue;
        merged.push({
          ...s,
          unitPriceEur: undefined,
          shippingEstimateEur: undefined,
          kind: 'estimated' as const,
          note: s.note ?? 'Sin precio live: enlace de búsqueda.',
        });
        if (merged.length >= take) break;
      }
    } catch (err) {
      this.logger.warn(`Supplier link fallback: ${err}`);
    }

    return merged.slice(0, take);
  }

  /** Round-robin by source so the UI shows AE + Alibaba when available. */
  private mergeDiverse(buckets: SupplierOffer[][], take: number): SupplierOffer[] {
    const queues = buckets.map((b) =>
      [...b].sort(
        (a, c) => (a.unitPriceEur ?? Infinity) - (c.unitPriceEur ?? Infinity),
      ),
    );
    const out: SupplierOffer[] = [];
    const seen = new Set<string>();

    let progressed = true;
    while (out.length < take && progressed) {
      progressed = false;
      for (const q of queues) {
        while (q.length) {
          const next = q.shift()!;
          if (seen.has(next.listingUrl)) continue;
          seen.add(next.listingUrl);
          out.push(next);
          progressed = true;
          break;
        }
        if (out.length >= take) break;
      }
    }
    return out;
  }
}

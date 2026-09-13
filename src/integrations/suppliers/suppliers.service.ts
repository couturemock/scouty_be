import { Injectable, Logger } from '@nestjs/common';
import { SupplierOffer } from '../types';
import { Alibaba1688SupplierProvider } from './alibaba-1688.provider';
import { AlibabaComSupplierProvider } from './alibaba-com.provider';
import { AlibabaSupplierProvider } from './alibaba.provider';
import { AliExpressSupplierProvider } from './aliexpress.provider';

/**
 * Live: AliExpress True API + Otapi 1688 + Otapi Alibaba.com (always all three).
 * Failures / quota → search-link fallbacks. Never throws.
 */
@Injectable()
export class SuppliersService {
  private readonly logger = new Logger(SuppliersService.name);

  constructor(
    private readonly aliexpress: AliExpressSupplierProvider,
    private readonly alibaba1688: Alibaba1688SupplierProvider,
    private readonly alibabaCom: AlibabaComSupplierProvider,
    private readonly links: AlibabaSupplierProvider,
  ) {}

  status() {
    return {
      aliexpress: {
        enabled: this.aliexpress.enabled(),
        provider: this.aliexpress.name,
      },
      alibaba1688: {
        enabled: this.alibaba1688.enabled(),
        provider: this.alibaba1688.name,
        host: 'otapi-1688',
      },
      alibabaCom: {
        enabled: this.alibabaCom.enabled(),
        provider: this.alibabaCom.name,
        host: 'otapi-alibaba',
      },
    };
  }

  beginIngestRun() {
    this.alibaba1688.resetRunBudget();
    this.alibabaCom.resetRunBudget();
  }

  async findRelated(
    productTitle: string,
    limit = 6,
    salePriceEur?: number,
    market = 'ES',
    imageUrl?: string | null,
  ): Promise<SupplierOffer[]> {
    const take = Math.min(Math.max(limit, 1), 9);
    // Always query each marketplace — don't let AE fill the whole slot list.
    const perSource = Math.min(3, Math.max(2, Math.ceil(take / 3)));

    const [ae, s1688, alb] = await Promise.all([
      this.aliexpress
        .findRelated(productTitle, perSource, salePriceEur, market)
        .catch((err) => {
          this.logger.warn(`AliExpress spike: ${err}`);
          return [] as SupplierOffer[];
        }),
      this.alibaba1688
        .findRelated(productTitle, perSource, salePriceEur, imageUrl)
        .catch((err) => {
          this.logger.warn(`1688 spike: ${err}`);
          return [] as SupplierOffer[];
        }),
      this.alibabaCom
        .findRelated(productTitle, perSource, salePriceEur, imageUrl)
        .catch((err) => {
          this.logger.warn(`Alibaba.com spike: ${err}`);
          return [] as SupplierOffer[];
        }),
    ]);

    const merged = this.mergeDiverse([ae, s1688, alb], take);

    this.logger.log(
      `Suppliers "${productTitle.slice(0, 40)}" → AE ${ae.length} · 1688 ${s1688.length} · Alibaba ${alb.length} · merged ${merged.length}`,
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

  /**
   * Round-robin by source so the UI always shows AE + 1688 + Alibaba when available,
   * instead of 5× AliExpress.
   */
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

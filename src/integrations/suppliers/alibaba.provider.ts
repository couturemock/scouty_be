import { Injectable } from '@nestjs/common';
import { SupplierOffer, SupplierProvider } from '../types';
import { supplierSearchKeywords } from './search-keywords';

function searchAlibaba(keywords: string) {
  return `https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&SearchText=${encodeURIComponent(keywords)}`;
}

/**
 * Last-resort Alibaba.com search links when live Otapi / AliExpress fail or hit quota.
 */
@Injectable()
export class AlibabaSupplierProvider implements SupplierProvider {
  readonly name = 'supplier_search_links_fallback';

  async findRelated(
    productTitle: string,
    limit = 5,
    _salePriceEur?: number,
  ): Promise<SupplierOffer[]> {
    const seed =
      supplierSearchKeywords(productTitle) || productTitle.slice(0, 40);
    const take = Math.min(Math.max(limit, 1), 5);

    const templates: Array<{ label: string; url: string }> = [
      {
        label: 'Buscar en Alibaba',
        url: searchAlibaba(seed),
      },
      {
        label: 'Buscar wholesale Alibaba',
        url: searchAlibaba(`${seed} wholesale`),
      },
      {
        label: 'Buscar OEM Alibaba',
        url: searchAlibaba(`${seed} OEM`),
      },
    ];

    return templates.slice(0, take).map((t) => ({
      source: 'alibaba' as const,
      name: `${seed} — ${t.label}`,
      listingUrl: t.url,
      kind: 'estimated' as const,
      region: 'Alibaba.com',
      note: 'Sin precio live: abrí la búsqueda y compará listings.',
    }));
  }
}

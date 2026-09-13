import { Injectable } from '@nestjs/common';
import { SupplierOffer, SupplierProvider } from '../types';
import { supplierSearchKeywords } from './search-keywords';

function search1688(keywords: string) {
  return `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(keywords)}`;
}

function searchAlibaba(keywords: string) {
  return `https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&SearchText=${encodeURIComponent(keywords)}`;
}

/**
 * Last-resort search links when live Otapi / AliExpress APIs fail or hit quota.
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

    const templates: Array<{
      source: '1688' | 'alibaba';
      label: string;
      url: string;
    }> = [
      {
        source: '1688',
        label: 'Buscar en 1688',
        url: search1688(seed),
      },
      {
        source: 'alibaba',
        label: 'Buscar en Alibaba',
        url: searchAlibaba(seed),
      },
      {
        source: '1688',
        label: 'Buscar OEM en 1688',
        url: search1688(`${seed} OEM`),
      },
      {
        source: 'alibaba',
        label: 'Buscar wholesale Alibaba',
        url: searchAlibaba(`${seed} wholesale`),
      },
    ];

    return templates.slice(0, take).map((t) => ({
      source: t.source,
      name: `${seed} — ${t.label}`,
      listingUrl: t.url,
      kind: 'estimated' as const,
      region: t.source === '1688' ? '1688 / China' : 'Alibaba.com',
      note: 'Sin precio live: abrí la búsqueda y compará listings.',
    }));
  }
}

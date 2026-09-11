import { Injectable } from '@nestjs/common';
import { SupplierOffer, SupplierProvider } from '../types';

function round2(n: number) {
  return Number(n.toFixed(2));
}

function searchSeed(title: string) {
  return title
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 6)
    .join(' ')
    .slice(0, 60);
}

function isLikelyBranded(title: string) {
  return /\b(apple|samsung|sony|nike|adidas|dyson|lego|microsoft|bose|canon|nikon|hp|dell|lenovo|asus|macbook|iphone|ipad)\b/i.test(
    title,
  );
}

function search1688(keywords: string) {
  return `https://s.1688.com/selloffer/offer_search.htm?keywords=${encodeURIComponent(keywords)}`;
}

function searchAlibaba(keywords: string) {
  return `https://www.alibaba.com/trade/search?fsb=y&IndexArea=product_en&SearchText=${encodeURIComponent(keywords)}`;
}

/**
 * Fixture / estimación de proveedores hasta conectar API real Alibaba/1688.
 * Costes se escalan al PVP Amazon para no inventar márgenes absurdos (p. ej. MacBook a 6 €).
 */
@Injectable()
export class AlibabaSupplierProvider implements SupplierProvider {
  readonly name = 'alibaba_1688_fixture';

  async findRelated(
    productTitle: string,
    limit = 5,
    salePriceEur?: number,
  ): Promise<SupplierOffer[]> {
    const seed = searchSeed(productTitle) || productTitle.slice(0, 40);
    const price = salePriceEur != null && salePriceEur > 0 ? salePriceEur : 25;
    const branded = isLikelyBranded(productTitle);

    // Branded retail: coste estimado alto (no hay OEM barato real).
    // Genérico / dropshipping: coste ~20–40% del PVP.
    const tiers = branded
      ? [
          { source: '1688' as const, label: 'referencia fábrica (marca)', factor: 0.72, moq: 50 },
          { source: '1688' as const, label: 'lote autorizado est.', factor: 0.68, moq: 100 },
          { source: 'alibaba' as const, label: 'distribuidor trade', factor: 0.78, moq: 20 },
          { source: 'alibaba' as const, label: 'ready to ship est.', factor: 0.82, moq: 10 },
          { source: 'alibaba' as const, label: 'canal premium est.', factor: 0.85, moq: 5 },
        ]
      : [
          { source: '1688' as const, label: 'fabricante OEM', factor: 0.28, moq: 200 },
          { source: '1688' as const, label: 'lote económico', factor: 0.22, moq: 500 },
          { source: 'alibaba' as const, label: 'trade assurance', factor: 0.35, moq: 100 },
          { source: 'alibaba' as const, label: 'ready to ship', factor: 0.4, moq: 50 },
          { source: 'alibaba' as const, label: 'premium factory', factor: 0.45, moq: 100 },
        ];

    const shippingBase = round2(Math.min(28, Math.max(1.2, price * 0.015)));

    const offers: SupplierOffer[] = tiers.map((tier, index) => {
      const unit = round2(Math.max(1.2, price * tier.factor));
      const shipping = round2(shippingBase + index * 0.35);
      const url =
        tier.source === '1688' ? search1688(seed) : searchAlibaba(seed);
      return {
        source: tier.source,
        name: `${seed} — ${tier.label}`,
        listingUrl: url,
        unitPriceEur: unit,
        moq: tier.moq,
        shippingEstimateEur: shipping,
        leadTimeDays: 7 + index * 3,
        reliabilityScore: branded ? 70 - index * 2 : 90 - index * 3,
        region: index % 2 === 0 ? 'Shenzhen, CN' : 'Guangzhou, CN',
        kind: 'estimated',
        note: branded
          ? 'Estimación Scout-ly (fixture). Producto de marca: el coste real de reventa suele ser cercano al PVP; no hay API 1688/Alibaba conectada.'
          : 'Estimación Scout-ly (fixture). Coste ≈ % del PVP Amazon. El enlace abre búsqueda en 1688/Alibaba, no un listing concreto.',
      };
    });

    return offers.slice(0, Math.min(Math.max(limit, 1), 5));
  }
}

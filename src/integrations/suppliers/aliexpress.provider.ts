import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupplierOffer } from '../types';
import { supplierSearchKeywords } from './search-keywords';
import { isLikelyBranded } from '../shared/brand-denylist';

type AeProduct = Record<string, unknown>;

function round2(n: number) {
  return Number(n.toFixed(2));
}

function shipToForMarket(market?: string) {
  const m = (market ?? 'ES').toUpperCase();
  if (m === 'UK') return 'GB';
  return m;
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pickPrice(p: AeProduct): number | null {
  return (
    asNumber(p.target_sale_price) ??
    asNumber(p.sale_price) ??
    asNumber(p.target_sale_price_cents) ??
    asNumber(p.app_sale_price) ??
    null
  );
}

function pickTitle(p: AeProduct): string {
  return String(
    p.product_title ?? p.title ?? p.product_main_image_url ?? 'AliExpress',
  ).slice(0, 120);
}

function pickUrl(p: AeProduct): string | null {
  const id = p.product_id ?? p.productId ?? p.itemId;
  const direct = p.product_detail_url ?? p.detail_url ?? p.product_url ?? p.url;
  if (typeof direct === 'string' && direct.startsWith('http')) return direct;
  if (id != null && String(id).trim()) {
    return `https://www.aliexpress.com/item/${String(id)}.html`;
  }
  return null;
}

/** lastest_volume / orders from Affiliate-style payloads — never invented. */
function pickSold(p: AeProduct): number | null {
  return (
    asNumber(p.lastest_volume) ??
    asNumber(p.latest_volume) ??
    asNumber(p.last_volume) ??
    asNumber(p.volume) ??
    asNumber(p.orders) ??
    asNumber(p.order_count) ??
    asNumber(p.historical_sold) ??
    asNumber(p.sold) ??
    asNumber(p.sales) ??
    null
  );
}

function mapAeOffers(
  list: AeProduct[],
  limit: number,
  salePriceEur?: number,
): SupplierOffer[] {
  const offers: SupplierOffer[] = [];
  const seen = new Set<string>();

  for (const raw of list) {
    const price = pickPrice(raw);
    const listingUrl = pickUrl(raw);
    if (price == null || price <= 0 || !listingUrl) continue;
    if (salePriceEur != null && price >= salePriceEur * 0.9) continue;
    if (seen.has(listingUrl)) continue;
    seen.add(listingUrl);

    const sold = pickSold(raw);
    offers.push({
      source: 'aliexpress',
      name: pickTitle(raw),
      listingUrl,
      unitPriceEur: round2(price),
      shippingEstimateEur: undefined,
      leadTimeDays: 12,
      reliabilityScore: 70,
      region: 'AliExpress',
      kind: 'live',
      soldCount: sold ?? undefined,
      popularity: sold ?? undefined,
      note: 'Precio AliExpress (spike RapidAPI). Match por keyword — verificá que sea el mismo producto.',
    });
    if (offers.length >= limit) break;
  }
  return offers;
}

function extractList(payload: unknown): AeProduct[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;

  const asArray = (v: unknown): AeProduct[] | null => {
    if (Array.isArray(v)) return v as AeProduct[];
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      // RapidAPI AliExpress True API: { products: { product: [...] } }
      if (Array.isArray(o.product)) return o.product as AeProduct[];
      if (Array.isArray(o.products)) return o.products as AeProduct[];
      if (Array.isArray(o.items)) return o.items as AeProduct[];
    }
    return null;
  };

  for (const c of [
    root.products,
    root.data,
    root.result,
    root.items,
    (root.data as Record<string, unknown> | undefined)?.products,
    (root.result as Record<string, unknown> | undefined)?.products,
  ]) {
    const list = asArray(c);
    if (list?.length) return list;
  }
  return [];
}

/**
 * Spike: AliExpress product search via RapidAPI proxy (no official Alibaba partner needed).
 * Env: ALIEXPRESS_RAPIDAPI_KEY
 * Optional: ALIEXPRESS_RAPIDAPI_HOST (default aliexpress-true-api.p.rapidapi.com)
 */
@Injectable()
export class AliExpressSupplierProvider {
  private readonly logger = new Logger(AliExpressSupplierProvider.name);
  readonly name = 'aliexpress_rapidapi';

  constructor(private readonly config: ConfigService) {}

  enabled() {
    return Boolean(this.config.get<string>('ALIEXPRESS_RAPIDAPI_KEY')?.trim());
  }

  async findRelated(
    productTitle: string,
    limit = 5,
    salePriceEur?: number,
    market = 'ES',
  ): Promise<SupplierOffer[]> {
    if (!this.enabled()) return [];
    if (isLikelyBranded(productTitle)) {
      this.logger.debug(
        `AliExpress skip branded title: ${productTitle.slice(0, 40)}`,
      );
      return [];
    }

    const key = this.config.get<string>('ALIEXPRESS_RAPIDAPI_KEY')!.trim();
    const host =
      this.config.get<string>('ALIEXPRESS_RAPIDAPI_HOST')?.trim() ||
      'aliexpress-true-api.p.rapidapi.com';
    const keywords = supplierSearchKeywords(productTitle);
    if (!keywords) return [];

    const params = new URLSearchParams({
      keywords,
      page_no: '1',
      page_size: String(Math.min(Math.max(limit * 2, 8), 20)),
      sort: 'LAST_VOLUME_DESC',
      target_currency: 'EUR',
      target_language: 'EN',
      ship_to_country: shipToForMarket(market),
    });

    if (salePriceEur != null && salePriceEur > 0) {
      // Keep AE cost below Amazon PVP — otherwise it's not a sourcing candidate.
      params.set('min_sale_price', String(round2(Math.max(0.5, salePriceEur * 0.04))));
      params.set('max_sale_price', String(round2(salePriceEur * 0.55)));
    }

    const url = `https://${host}/api/v3/products?${params.toString()}`;

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'X-RapidAPI-Key': key,
          'X-RapidAPI-Host': host,
        },
      });
      if (!res.ok) {
        this.logger.warn(`AliExpress HTTP ${res.status}: ${res.statusText}`);
        params.set('sort', 'SALE_PRICE_ASC');
        const retryUrl = `https://${host}/api/v3/products?${params.toString()}`;
        const retry = await fetch(retryUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'X-RapidAPI-Key': key,
            'X-RapidAPI-Host': host,
          },
        });
        if (!retry.ok) return [];
        const list = extractList(await retry.json());
        const offers = mapAeOffers(list, limit, salePriceEur);
        this.logger.log(
          `AliExpress "${keywords}" → ${offers.length} live offers (from ${list.length} raw, price sort fallback)`,
        );
        return offers;
      }
      const json = (await res.json()) as unknown;
      let list = extractList(json);
      if (!list.length) {
        params.set('sort', 'SALE_PRICE_ASC');
        const retryUrl = `https://${host}/api/v3/products?${params.toString()}`;
        const retry = await fetch(retryUrl, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'X-RapidAPI-Key': key,
            'X-RapidAPI-Host': host,
          },
        });
        if (retry.ok) {
          list = extractList(await retry.json());
        }
      }
      const offers = mapAeOffers(list, limit, salePriceEur);
      this.logger.log(
        `AliExpress "${keywords}" → ${offers.length} live offers (from ${list.length} raw)`,
      );
      return offers;
    } catch (err) {
      this.logger.warn(`AliExpress search failed: ${err}`);
      return [];
    }
  }
}

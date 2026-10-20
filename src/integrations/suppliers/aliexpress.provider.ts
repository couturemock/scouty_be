import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupplierOffer } from '../types';
import { supplierSearchKeywords } from './search-keywords';
import { isLikelyBranded } from '../shared/brand-denylist';

type AeItem = Record<string, unknown>;

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

/** `"10,000+"` / `"48500+"` → 10000 / 48500. Never invented — null when absent. */
function parseVolume(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(String(v).replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function itemUrl(itemId: unknown): string | null {
  const id = String(itemId ?? '').trim();
  return id ? `https://www.aliexpress.com/item/${id}.html` : null;
}

/** `textsearch.php` result item (search by keyword). */
function mapTextSearchItem(raw: AeItem, salePriceEur?: number): SupplierOffer | null {
  const price =
    asNumber(raw.targetSalePrice) ?? asNumber(raw.salePrice) ?? null;
  const listingUrl = itemUrl(raw.itemId);
  if (price == null || price <= 0 || !listingUrl) return null;
  if (salePriceEur != null && price >= salePriceEur * 0.9) return null;

  const sold = parseVolume(raw.orders);
  return {
    source: 'aliexpress',
    name: String(raw.title ?? 'AliExpress').slice(0, 120),
    listingUrl,
    unitPriceEur: round2(price),
    shippingEstimateEur: undefined,
    leadTimeDays: 12,
    reliabilityScore: 70,
    region: 'AliExpress',
    kind: 'live',
    soldCount: sold ?? undefined,
    popularity: sold ?? undefined,
    note: 'Precio AliExpress (Business API). Match por keyword — verificá que sea el mismo producto.',
  };
}

/** `imageurl_search.php` result item (search by image). */
function mapImageSearchItem(raw: AeItem, salePriceEur?: number): SupplierOffer | null {
  const priceRaw = asNumber(raw.target_sale_price);
  // Unlike textsearch.php (decimal strings like "3.99"), this endpoint
  // returns target_sale_price as a whole-number string in cents (e.g. "406"
  // for a $4.06 item) — confirmed by cross-checking the same itemId between
  // both endpoints, and by a 20-item sample all landing in plausible cents
  // ranges once divided. A literal decimal value (already scaled) passes
  // through unchanged.
  const price =
    priceRaw != null && Number.isInteger(priceRaw) ? priceRaw / 100 : priceRaw;
  const listingUrl =
    typeof raw.product_detail_url === 'string' && raw.product_detail_url.startsWith('http')
      ? raw.product_detail_url
      : itemUrl(raw.product_id);
  if (price == null || price <= 0 || !listingUrl) return null;
  if (salePriceEur != null && price >= salePriceEur * 0.9) return null;

  const sold = parseVolume(raw.latest_volume);
  return {
    source: 'aliexpress',
    name: String(raw.product_title ?? 'AliExpress').slice(0, 120),
    listingUrl,
    unitPriceEur: round2(price),
    shippingEstimateEur: undefined,
    leadTimeDays: 12,
    reliabilityScore: 65,
    region: 'AliExpress',
    kind: 'live',
    soldCount: sold ?? undefined,
    popularity: sold ?? undefined,
    matchedBy: 'image',
    note: 'Precio AliExpress (Business API). Match por imagen — verificá bien el listing.',
  };
}

function extractList(payload: unknown): AeItem[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  const data = root.data as Record<string, unknown> | undefined;
  const list = data?.itemList;
  return Array.isArray(list) ? (list as AeItem[]) : [];
}

/**
 * AliExpress Business API (RapidAPI, host `aliexpress-business-api.p.rapidapi.com`).
 * Replaces the old AliExpress True API + Alibaba.com/Otapi split: this single
 * provider covers keyword search, live pricing/volume, AND image search
 * (`imageurl_search.php`) — Alibaba.com is no longer used anywhere.
 *
 * Env: ALIEXPRESS_RAPIDAPI_KEY
 * Optional: ALIEXPRESS_RAPIDAPI_HOST (default aliexpress-business-api.p.rapidapi.com)
 */
@Injectable()
export class AliExpressSupplierProvider {
  private readonly logger = new Logger(AliExpressSupplierProvider.name);
  readonly name = 'aliexpress_business_api';

  constructor(private readonly config: ConfigService) {}

  enabled() {
    return Boolean(this.config.get<string>('ALIEXPRESS_RAPIDAPI_KEY')?.trim());
  }

  private host() {
    return (
      this.config.get<string>('ALIEXPRESS_RAPIDAPI_HOST')?.trim() ||
      'aliexpress-business-api.p.rapidapi.com'
    );
  }

  private headers() {
    const host = this.host();
    return {
      Accept: 'application/json',
      'X-RapidAPI-Key': this.config.get<string>('ALIEXPRESS_RAPIDAPI_KEY')!.trim(),
      'X-RapidAPI-Host': host,
    };
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

    const keywords = supplierSearchKeywords(productTitle);
    if (!keywords) return [];

    const params = new URLSearchParams({
      keyWord: keywords,
      pageSize: String(Math.min(Math.max(limit * 2, 8), 20)),
      pageIndex: '1',
      country: shipToForMarket(market),
      currency: 'EUR',
      lang: 'en',
      filter: 'orders',
      sortBy: 'desc',
    });

    const host = this.host();
    const url = `https://${host}/textsearch.php?${params.toString()}`;

    try {
      const res = await fetch(url, { method: 'GET', headers: this.headers() });
      if (!res.ok) {
        this.logger.warn(`AliExpress HTTP ${res.status}: ${res.statusText}`);
        return [];
      }
      const list = extractList(await res.json());
      const offers = list
        .map((raw) => mapTextSearchItem(raw, salePriceEur))
        .filter((o): o is SupplierOffer => o != null)
        .slice(0, limit);
      this.logger.log(
        `AliExpress "${keywords}" → ${offers.length} live offers (from ${list.length} raw)`,
      );
      return offers;
    } catch (err) {
      this.logger.warn(`AliExpress search failed: ${err}`);
      return [];
    }
  }

  /**
   * Identify candidate products from a photo/image alone (no title yet) —
   * replaces Alibaba.com/Otapi's image search. `imageUrl` must be a publicly
   * reachable URL (Amazon product image, or our own uploaded photo).
   */
  async searchByImageOnly(
    imageUrl: string,
    limit = 5,
    market = 'ES',
  ): Promise<SupplierOffer[]> {
    if (!this.enabled()) return [];
    if (!imageUrl?.trim()) return [];

    const params = new URLSearchParams({
      imgUrl: imageUrl.trim(),
      search_type: 'similar',
      country: shipToForMarket(market),
      currency: 'EUR',
      lang: 'en',
      filter: 'orders',
      sortBy: 'desc',
    });

    const host = this.host();
    const url = `https://${host}/imageurl_search.php?${params.toString()}`;

    try {
      const res = await fetch(url, { method: 'GET', headers: this.headers() });
      if (!res.ok) {
        this.logger.warn(`AliExpress image search HTTP ${res.status}: ${res.statusText}`);
        return [];
      }
      const list = extractList(await res.json());
      const offers = list
        .map((raw) => mapImageSearchItem(raw))
        .filter((o): o is SupplierOffer => o != null)
        .slice(0, limit);
      this.logger.log(
        `AliExpress image search → ${offers.length} live offers (from ${list.length} raw)`,
      );
      return offers;
    } catch (err) {
      this.logger.warn(`AliExpress image search failed: ${err}`);
      return [];
    }
  }
}

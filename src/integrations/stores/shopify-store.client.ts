import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StoreProductInfo } from '../../discovery/discovery.types';
import { toEur } from '../shared/fx';

type ShopifyProductJson = {
  product?: {
    title?: string;
    product_type?: string;
    vendor?: string;
    tags?: string | string[];
    variants?: Array<{
      price?: string | number;
      compare_at_price?: string | number | null;
      requires_shipping?: boolean;
    }>;
    images?: Array<{ src?: string }>;
    image?: { src?: string } | null;
  };
};

/**
 * Parses Shopify's public `/products/<handle>.json`. Prices come in the
 * store's currency, which the JSON doesn't state — the caller passes the
 * currency PipiAds reported for the same product.
 */
export function parseShopifyProduct(
  json: unknown,
  currency: string | null,
): StoreProductInfo | null {
  const p = (json as ShopifyProductJson | null)?.product;
  if (!p?.title) return null;
  const prices = (p.variants ?? [])
    .map((v) => Number(v.price))
    .filter((n) => Number.isFinite(n) && n > 0);
  const compareAt = (p.variants ?? [])
    .map((v) => Number(v.compare_at_price))
    .filter((n) => Number.isFinite(n) && n > 0);
  const tags = Array.isArray(p.tags)
    ? p.tags
    : String(p.tags ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
  const shipping = (p.variants ?? [])
    .map((v) => v.requires_shipping)
    .filter((v): v is boolean => typeof v === 'boolean');
  return {
    title: p.title.trim(),
    priceEur: prices.length ? toEur(Math.min(...prices), currency) : null,
    compareAtEur: compareAt.length ? toEur(Math.max(...compareAt), currency) : null,
    imageUrl: p.image?.src ?? p.images?.[0]?.src ?? null,
    productType: p.product_type?.trim() || null,
    vendor: p.vendor?.trim() || null,
    tags: tags.slice(0, 20),
    requiresShipping: shipping.length ? shipping.some(Boolean) : null,
  };
}

/**
 * Reads the live product page of the store an ad points to. Public endpoint,
 * no PipiAds credits; non-Shopify stores simply return null.
 */
@Injectable()
export class ShopifyStoreClient {
  private readonly logger = new Logger(ShopifyStoreClient.name);
  private readonly cache = new Map<string, StoreProductInfo | null>();

  constructor(private readonly config: ConfigService) {}

  private timeoutMs() {
    const n = Number(this.config.get('STORE_SCRAPE_TIMEOUT_MS') ?? 5000);
    return Number.isFinite(n) && n > 0 ? n : 5000;
  }

  concurrency() {
    const n = Number(this.config.get('STORE_SCRAPE_CONCURRENCY') ?? 4);
    return Number.isFinite(n) && n > 0 ? Math.min(n, 10) : 4;
  }

  async fetchProduct(
    domain: string,
    handle: string,
    currency: string | null,
  ): Promise<StoreProductInfo | null> {
    const host = domain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    const key = `${host}/${handle}`;
    if (this.cache.has(key)) return this.cache.get(key) ?? null;

    const url = `https://${host}/products/${encodeURIComponent(handle)}.json`;
    let info: StoreProductInfo | null = null;
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; ScoutlyBot/1.0)',
        },
        signal: AbortSignal.timeout(this.timeoutMs()),
        redirect: 'follow',
      });
      if (res.ok && (res.headers.get('content-type') ?? '').includes('json')) {
        info = parseShopifyProduct(await res.json(), currency);
      }
    } catch (err) {
      this.logger.debug(`Store scrape ${key}: ${err}`);
    }
    this.cache.set(key, info);
    return info;
  }
}

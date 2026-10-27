import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isLikelyBranded } from '../shared/brand-denylist';
import { toEur } from '../shared/fx';
import { SupplierOffer } from '../types';
import { supplierSearchKeywords } from './search-keywords';

const CJ_BASE = 'https://developers.cjdropshipping.com/api2.0/v1';

/** Warehouses that ship to EU/US buyers in days rather than weeks. */
const FAST_WAREHOUSES = new Set(['US', 'DE', 'GB', 'UK', 'FR', 'ES', 'IT', 'PL', 'CZ', 'NL', 'BE']);

type CjListProduct = {
  id?: string;
  nameEn?: string;
  sku?: string;
  bigImage?: string;
  sellPrice?: string | number;
  nowPrice?: string | number | null;
  discountPrice?: string | number | null;
  listedNum?: number;
  addMarkStatus?: number;
  inventoryInfo?: string | null;
  deliveryCycle?: string | null;
  warehouseInventoryNum?: number;
};

type CjEnvelope<T> = {
  code?: number;
  result?: boolean;
  message?: string;
  data?: T;
};

function firstPrice(...values: Array<string | number | null | undefined>): number | null {
  for (const v of values) {
    // sellPrice can be a range ("3.20-5.10") — take the low end.
    const n = Number(String(v ?? '').split('-')[0]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

function hasFastWarehouse(inventoryInfo: string | null | undefined): boolean {
  if (!inventoryInfo) return false;
  const codes = String(inventoryInfo).match(/"(?:countryCode|areaEn|countryNameEn)"\s*:\s*"([A-Za-z]{2})"/g) ?? [];
  return codes.some((m) => FAST_WAREHOUSES.has(m.slice(-3, -1).toUpperCase()));
}

export function extractCjProducts(payload: unknown): CjListProduct[] {
  const data = (payload as CjEnvelope<{ content?: Array<{ productList?: CjListProduct[] }> }>)?.data;
  return (data?.content ?? []).flatMap((c) => c.productList ?? []);
}

export function mapCjProduct(raw: CjListProduct, salePriceEur?: number): SupplierOffer | null {
  const name = raw.nameEn?.trim();
  const priceUsd = firstPrice(raw.discountPrice, raw.nowPrice, raw.sellPrice);
  if (!name || !raw.id || priceUsd == null) return null;
  const unitPriceEur = toEur(priceUsd, 'USD') ?? undefined;
  const fast = hasFastWarehouse(raw.inventoryInfo);
  const listed = Number(raw.listedNum);
  const margin =
    salePriceEur && unitPriceEur ? Math.round(((salePriceEur - unitPriceEur) / salePriceEur) * 100) : null;
  return {
    source: 'cj',
    name,
    externalId: raw.id,
    listingUrl: `https://cjdropshipping.com/product/-p-${raw.id}.html`,
    imageUrl: raw.bigImage || undefined,
    unitPriceEur,
    moq: 1,
    region: fast ? 'CJ (almacén US/EU)' : 'CJ (China)',
    fastShipping: fast,
    listedCount: Number.isFinite(listed) ? listed : undefined,
    popularity: Number.isFinite(listed) ? listed : undefined,
    kind: 'live',
    note: [
      'Precio CJdropshipping (API), sin envío.',
      raw.addMarkStatus === 1 ? 'Envío gratis en CJ.' : null,
      raw.deliveryCycle ? `Procesado ${raw.deliveryCycle} días.` : null,
      margin != null ? `Margen bruto vs PVP tienda ≈ ${margin}%.` : null,
    ]
      .filter(Boolean)
      .join(' '),
  };
}

/**
 * CJdropshipping API 2.0. Env: CJ_API_KEY (format `CJUserNum@api@key`), or a
 * pre-issued CJ_ACCESS_TOKEN. Token lives ~180 days; cached in memory and
 * refreshed on 401-style errors. Free accounts are capped at 1000 req/day,
 * so calls are paced by CJ_RPS (default 1/s). Never throws.
 */
@Injectable()
export class CjSupplierProvider {
  private readonly logger = new Logger(CjSupplierProvider.name);
  readonly name = 'cjdropshipping_api_v2';
  private token: { access: string; refresh: string | null; expiresAt: number } | null = null;
  private lastCallAt = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private authInFlight: Promise<string | null> | null = null;

  constructor(private readonly config: ConfigService) {}

  enabled() {
    return Boolean(
      this.config.get<string>('CJ_API_KEY')?.trim() ||
        this.config.get<string>('CJ_ACCESS_TOKEN')?.trim(),
    );
  }

  private minIntervalMs() {
    const rps = Number(this.config.get('CJ_RPS') ?? 1);
    return Number.isFinite(rps) && rps > 0 ? Math.ceil(1000 / rps) : 1000;
  }

  /** Serializes and paces requests so concurrent callers respect CJ_RPS. */
  private paced<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.queue.then(async () => {
      const wait = this.lastCallAt + this.minIntervalMs() - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.lastCallAt = Date.now();
      return fn();
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async accessToken(force = false): Promise<string | null> {
    const preset = this.config.get<string>('CJ_ACCESS_TOKEN')?.trim();
    if (preset && !force) return preset;
    if (!force && this.token && this.token.expiresAt > Date.now() + 60_000) {
      return this.token.access;
    }
    const apiKey = this.config.get<string>('CJ_API_KEY')?.trim();
    if (!apiKey) return preset ?? null;

    // Dedupe concurrent callers racing to get/refresh a token at the same
    // time — e.g. two products looked up in parallel right at ingest start,
    // before any token is cached. Found live: each used to fire its own
    // auth request with no pacing at all, so two near-simultaneous calls
    // blew straight past CJ's own "1 request/second" limit ("CJ auth
    // failed: Too Many Requests, QPS limit is 1 time/1second").
    if (this.authInFlight) return this.authInFlight;
    this.authInFlight = this.doAuth(apiKey).finally(() => {
      this.authInFlight = null;
    });
    return this.authInFlight;
  }

  /** The actual auth/refresh call — paced like every other CJ request, never throws. */
  private async doAuth(apiKey: string): Promise<string | null> {
    const tryAuth = async (path: string, body: Record<string, string>) => {
      const res = await this.paced(() =>
        fetch(`${CJ_BASE}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(15_000),
        }),
      );
      const json = (await res.json()) as CjEnvelope<{
        accessToken?: string;
        refreshToken?: string;
        accessTokenExpiryDate?: string;
      }>;
      if (json.code !== 200 || !json.data?.accessToken) {
        throw new Error(`CJ auth ${json.code}: ${json.message}`);
      }
      const exp = Date.parse(json.data.accessTokenExpiryDate ?? '');
      this.token = {
        access: json.data.accessToken,
        refresh: json.data.refreshToken ?? null,
        expiresAt: Number.isFinite(exp) ? exp : Date.now() + 14 * 86_400_000,
      };
      return this.token.access;
    };

    try {
      if (this.token?.refresh) {
        try {
          return await tryAuth('/authentication/refreshAccessToken', {
            refreshToken: this.token.refresh,
          });
        } catch (err) {
          this.logger.debug(`CJ refresh failed, re-auth: ${err}`);
        }
      }
      return await tryAuth('/authentication/getAccessToken', { apiKey });
    } catch (err) {
      this.logger.warn(`CJ auth failed: ${err}`);
      return null;
    }
  }

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    params: Record<string, unknown>,
    retried = false,
  ): Promise<CjEnvelope<T> | null> {
    const token = await this.accessToken(retried);
    if (!token) return null;
    const url =
      method === 'GET'
        ? `${CJ_BASE}${path}?${new URLSearchParams(
            Object.entries(params)
              .filter(([, v]) => v != null && v !== '')
              .map(([k, v]) => [k, String(v)]),
          ).toString()}`
        : `${CJ_BASE}${path}`;
    try {
      const res = await this.paced(() =>
        fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json', 'CJ-Access-Token': token },
          body: method === 'POST' ? JSON.stringify(params) : undefined,
          signal: AbortSignal.timeout(15_000),
        }),
      );
      const json = (await res.json()) as CjEnvelope<T>;
      // 1600001 / 1600003: invalid or expired token.
      if (!retried && (res.status === 401 || json.code === 1600001 || json.code === 1600003)) {
        this.token = null;
        return this.request<T>(method, path, params, true);
      }
      if (json.code !== 200) {
        this.logger.warn(`CJ ${path} ${json.code}: ${json.message}`);
        return null;
      }
      return json;
    } catch (err) {
      this.logger.warn(`CJ ${path} failed: ${err}`);
      return null;
    }
  }

  async findRelated(
    productTitle: string,
    limit = 5,
    salePriceEur?: number,
    market = 'ES',
  ): Promise<SupplierOffer[]> {
    if (!this.enabled()) return [];
    if (isLikelyBranded(productTitle)) return [];
    const keyWord = supplierSearchKeywords(productTitle);
    if (!keyWord) return [];

    const json = await this.request<unknown>('GET', '/product/listV2', {
      keyWord,
      page: 1,
      size: Math.min(Math.max(limit * 2, 6), 20),
    });
    if (!json) return [];
    const offers = extractCjProducts(json)
      .map((raw) => mapCjProduct(raw, salePriceEur))
      .filter((o): o is SupplierOffer => o != null)
      .slice(0, limit);
    this.logger.log(`CJ "${keyWord}" (${market}) → ${offers.length} live offers`);
    return offers;
  }

  /**
   * Adds real shipping to the offer: product detail (first variant id + weight)
   * then freightCalculate CN → market. Cheapest line wins. Two CJ requests.
   */
  async withFreight(offer: SupplierOffer, market: string): Promise<SupplierOffer> {
    if (offer.source !== 'cj' || !offer.externalId) return offer;
    const detail = await this.request<{
      productWeight?: string | number;
      variants?: Array<{ vid?: string }>;
    }>('GET', '/product/query', { pid: offer.externalId });
    const vid = detail?.data?.variants?.find((v) => v.vid)?.vid;
    if (!vid) return offer;
    const weightG = Number(detail?.data?.productWeight);

    const dest = market.toUpperCase() === 'UK' ? 'GB' : market.toUpperCase();
    const freight = await this.request<
      Array<{ logisticPrice?: number; logisticAging?: string; logisticName?: string }>
    >('POST', '/logistic/freightCalculate', {
      startCountryCode: 'CN',
      endCountryCode: dest,
      products: [{ quantity: 1, vid }],
    });
    const best = (freight?.data ?? [])
      .filter((l) => Number(l.logisticPrice) > 0)
      .sort((a, b) => Number(a.logisticPrice) - Number(b.logisticPrice))[0];
    if (!best) return { ...offer, variantId: vid };
    const aging = String(best.logisticAging ?? '').split('-').map(Number);
    return {
      ...offer,
      variantId: vid,
      shippingEstimateEur: toEur(Number(best.logisticPrice), 'USD') ?? undefined,
      leadTimeDays: Number.isFinite(aging[aging.length - 1]) ? aging[aging.length - 1] : undefined,
      note: `${offer.note ?? ''} Envío ${best.logisticName ?? 'CJ'} ${best.logisticAging ?? ''} días a ${dest}${
        Number.isFinite(weightG) && weightG > 0 ? ` · ${Math.round(weightG)} g` : ''
      }.`.trim(),
    };
  }
}

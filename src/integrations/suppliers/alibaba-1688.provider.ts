import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupplierOffer } from '../types';
import { supplierSearchKeywords } from './search-keywords';

type OtapiItem = Record<string, unknown>;

function round2(n: number) {
  return Number(n.toFixed(2));
}

function isLikelyBranded(title: string) {
  return /\b(apple|samsung|sony|nike|adidas|dyson|lego|microsoft|bose|canon|nikon|hp|dell|lenovo|asus|macbook|iphone|ipad)\b/i.test(
    title,
  );
}

function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v.replace(/[^\d.]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractItems(payload: unknown): OtapiItem[] {
  if (!payload || typeof payload !== 'object') return [];
  const root = payload as Record<string, unknown>;
  const result = root.Result as Record<string, unknown> | undefined;
  const itemsWrap = result?.Items as Record<string, unknown> | undefined;
  const nested = itemsWrap?.Items as Record<string, unknown> | undefined;
  const content =
    nested?.Content ?? itemsWrap?.Content ?? result?.Content ?? root.Content;
  return Array.isArray(content) ? (content as OtapiItem[]) : [];
}

/**
 * Prefer factory CNY unit price; convert to EUR.
 * Otapi often floors DisplayedMoneys USD to $1 for cheap items — OriginalPrice is better.
 */
function pickUnitPriceEur(
  item: OtapiItem,
  cnyToEur: number,
  usdToEur: number,
): number | null {
  const price = item.Price as Record<string, unknown> | undefined;
  if (!price) return null;

  const one =
    (price.OneItemPriceWithoutDelivery as Record<string, unknown> | undefined) ??
    (price.PriceWithoutDelivery as Record<string, unknown> | undefined) ??
    price;

  const cny =
    asNumber(one.OriginalPrice) ??
    asNumber(price.OriginalPrice) ??
    asNumber(
      (one.ConvertedPriceList as Record<string, unknown> | undefined)?.Internal
        ? (
            (one.ConvertedPriceList as Record<string, unknown>)
              .Internal as Record<string, unknown>
          ).Price
        : null,
    );

  if (cny != null && cny > 0) {
    return round2(cny * cnyToEur);
  }

  const usd =
    asNumber(price.ConvertedPriceWithoutSign) ?? asNumber(price.ConvertedPrice);
  if (usd != null && usd > 0) return round2(usd * usdToEur);
  return null;
}

function pickTitle(item: OtapiItem): string {
  return String(item.Title ?? item.OriginalTitle ?? '1688').slice(0, 120);
}

function pickUrl(item: OtapiItem): string | null {
  const direct = item.ExternalItemUrl ?? item.TaobaoItemUrl ?? item.ItemUrl;
  if (typeof direct === 'string' && direct.startsWith('http')) return direct;
  const id = String(item.Id ?? '').replace(/^abb-/, '');
  if (/^\d+$/.test(id)) return `https://detail.1688.com/offer/${id}.html`;
  return null;
}

/** Prefer a clean Amazon CDN URL Otapi can fetch. */
function normalizeImageUrl(url?: string | null): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.trim());
    if (!/^https?:$/i.test(u.protocol)) return null;
    // Strip Amazon size transforms: I/abc._AC_SL1500_.jpg → I/abc.jpg
    u.pathname = u.pathname.replace(/\._[A-Z0-9,_]+_(?=\.)/i, '');
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Live 1688 via RapidAPI Otapi 1688 (BatchSearchItemsFrame).
 * Prefers ImageUrl (Amazon photo) when available; falls back to keyword.
 *
 * Env:
 *   ALIBABA_1688_RAPIDAPI_KEY (falls back to ALIEXPRESS_RAPIDAPI_KEY)
 *   ALIBABA_1688_RAPIDAPI_HOST (default otapi-1688.p.rapidapi.com)
 *   ALIBABA_1688_MAX_CALLS_PER_RUN (default 15)
 *   ALIBABA_1688_CNY_EUR (default 0.13)
 */
@Injectable()
export class Alibaba1688SupplierProvider {
  private readonly logger = new Logger(Alibaba1688SupplierProvider.name);
  readonly name = 'otapi_1688_rapidapi';

  private callsThisRun = 0;
  private circuitOpen = false;
  private lastCallAt = 0;

  constructor(private readonly config: ConfigService) {}

  enabled() {
    return Boolean(this.apiKey());
  }

  private apiKey() {
    return (
      this.config.get<string>('ALIBABA_1688_RAPIDAPI_KEY')?.trim() ||
      this.config.get<string>('ALIEXPRESS_RAPIDAPI_KEY')?.trim() ||
      ''
    );
  }

  private host() {
    return (
      this.config.get<string>('ALIBABA_1688_RAPIDAPI_HOST')?.trim() ||
      'otapi-1688.p.rapidapi.com'
    );
  }

  private maxCalls() {
    const n = Number(this.config.get('ALIBABA_1688_MAX_CALLS_PER_RUN') ?? 15);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 15;
  }

  private cnyToEur() {
    const n = Number(this.config.get('ALIBABA_1688_CNY_EUR') ?? 0.13);
    return Number.isFinite(n) && n > 0 ? n : 0.13;
  }

  resetRunBudget() {
    this.callsThisRun = 0;
    this.circuitOpen = false;
  }

  async findRelated(
    productTitle: string,
    limit = 5,
    salePriceEur?: number,
    imageUrl?: string | null,
  ): Promise<SupplierOffer[]> {
    if (!this.enabled()) return [];
    if (this.circuitOpen) return [];
    if (isLikelyBranded(productTitle)) return [];

    const img = normalizeImageUrl(imageUrl);
    const keywords = supplierSearchKeywords(productTitle);

    // 1) Image search (best match) — Otapi accepts ImageUrl alone.
    if (img) {
      const byImage = await this.search({
        imageUrl: img,
        limit,
        salePriceEur,
        matchNote:
          'Precio 1688 (Otapi). Match por imagen Amazon — verificá el listing.',
        logLabel: `img ${img.slice(-40)}`,
      });
      if (byImage.length) return byImage;
    }

    // 2) Keyword fallback
    if (!keywords) return [];
    return this.search({
      keywords,
      limit,
      salePriceEur,
      matchNote:
        'Precio 1688 (Otapi). Match por keyword — verificá el listing.',
      logLabel: `kw "${keywords}"`,
    });
  }

  private async search(opts: {
    keywords?: string;
    imageUrl?: string;
    limit: number;
    salePriceEur?: number;
    matchNote: string;
    logLabel: string;
  }): Promise<SupplierOffer[]> {
    if (this.circuitOpen) return [];
    if (this.callsThisRun >= this.maxCalls()) {
      this.logger.debug(
        `1688 skip budget ${this.callsThisRun}/${this.maxCalls()}: ${opts.logLabel}`,
      );
      return [];
    }
    if (!opts.keywords && !opts.imageUrl) return [];

    const wait = 1100 - (Date.now() - this.lastCallAt);
    if (wait > 0) await sleep(wait);

    const params = new URLSearchParams({
      language: 'en',
      framePosition: '0',
      frameSize: String(Math.min(Math.max(opts.limit * 2, 5), 20)),
      OrderBy: 'Price:Asc',
    });
    if (opts.imageUrl) params.set('ImageUrl', opts.imageUrl);
    if (opts.keywords) params.set('ItemTitle', opts.keywords);
    if (opts.salePriceEur != null && opts.salePriceEur > 0) {
      params.set('MaxPrice', String(round2(opts.salePriceEur * 1.1)));
    }

    const host = this.host();
    const url = `https://${host}/BatchSearchItemsFrame?${params.toString()}`;

    try {
      this.lastCallAt = Date.now();
      this.callsThisRun += 1;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': this.apiKey(),
          'X-RapidAPI-Host': host,
        },
      });

      if (res.status === 403 || res.status === 429) {
        this.circuitOpen = true;
        this.logger.warn(
          `1688 quota/auth HTTP ${res.status} — circuit open, fallback to search links`,
        );
        return [];
      }
      if (!res.ok) {
        this.logger.warn(`1688 HTTP ${res.status}: ${res.statusText}`);
        return [];
      }

      const json = (await res.json()) as Record<string, unknown>;
      const err = String(json.ErrorCode ?? 'Ok');
      if (err !== 'Ok' && err !== 'ok') {
        this.logger.warn(
          `1688 ErrorCode=${err} ${JSON.stringify(json.SubErrorCode ?? {}).slice(0, 120)}`,
        );
        if (
          /quota|limit|credit|balance|subscribe/i.test(
            err + JSON.stringify(json),
          )
        ) {
          this.circuitOpen = true;
        }
        return [];
      }

      const list = extractItems(json);
      const cnyEur = this.cnyToEur();
      const usdEur = 0.92;
      const offers: SupplierOffer[] = [];
      const seen = new Set<string>();

      for (const raw of list) {
        const listingUrl = pickUrl(raw);
        const unit = pickUnitPriceEur(raw, cnyEur, usdEur);
        if (!listingUrl || unit == null || unit <= 0.05) continue;
        if (
          opts.salePriceEur != null &&
          unit >= opts.salePriceEur * 0.9
        ) {
          continue;
        }
        if (seen.has(listingUrl)) continue;
        seen.add(listingUrl);

        offers.push({
          source: '1688',
          name: pickTitle(raw),
          listingUrl,
          unitPriceEur: unit,
          shippingEstimateEur: undefined,
          leadTimeDays: 14,
          reliabilityScore: opts.imageUrl ? 80 : 65,
          region: '1688 / China',
          kind: 'live',
          note: opts.matchNote,
        });
        if (offers.length >= opts.limit) break;
      }

      this.logger.log(
        `1688 ${opts.logLabel} → ${offers.length} live (from ${list.length} raw) · calls ${this.callsThisRun}/${this.maxCalls()}`,
      );
      return offers;
    } catch (err) {
      this.logger.warn(`1688 search failed: ${err}`);
      return [];
    }
  }
}

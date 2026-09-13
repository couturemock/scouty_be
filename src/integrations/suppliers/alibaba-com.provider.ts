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

function pickUnitPriceEur(item: OtapiItem, usdToEur: number): number | null {
  const price = item.Price as Record<string, unknown> | undefined;
  if (!price) return null;

  const one =
    (price.OneItemPriceWithoutDelivery as Record<string, unknown> | undefined) ??
    (price.PriceWithoutDelivery as Record<string, unknown> | undefined) ??
    price;

  const currency = String(
    one.OriginalCurrencyCode ??
      price.OriginalCurrencyCode ??
      price.CurrencyName ??
      'USD',
  ).toUpperCase();

  const original =
    asNumber(one.OriginalPrice) ?? asNumber(price.OriginalPrice);
  const converted =
    asNumber(price.ConvertedPriceWithoutSign) ?? asNumber(price.ConvertedPrice);

  // Alibaba Otapi usually quotes USD
  if (currency === 'EUR' && original != null && original > 0) {
    return round2(original);
  }
  if (
    (currency === 'USD' || currency === '$') &&
    original != null &&
    original > 0
  ) {
    return round2(original * usdToEur);
  }
  if (converted != null && converted > 0) {
    return round2(converted * usdToEur);
  }
  if (original != null && original > 0) {
    return round2(original * usdToEur);
  }
  return null;
}

function pickTitle(item: OtapiItem): string {
  return String(item.Title ?? item.OriginalTitle ?? 'Alibaba').slice(0, 120);
}

function pickUrl(item: OtapiItem): string | null {
  const direct = item.ExternalItemUrl ?? item.TaobaoItemUrl ?? item.ItemUrl;
  if (typeof direct === 'string' && direct.startsWith('http')) return direct;
  // No inventar URLs `_id.html` — Alibaba suele marcarlas "unavailable".
  return null;
}

function normalizeImageUrl(url?: string | null): string | null {
  if (!url?.trim()) return null;
  try {
    const u = new URL(url.trim());
    if (!/^https?:$/i.test(u.protocol)) return null;
    u.pathname = u.pathname.replace(/\._[A-Z0-9,_]+_(?=\.)/i, '');
    return u.toString();
  } catch {
    return null;
  }
}

const TITLE_STOP = new Set([
  'for',
  'the',
  'and',
  'with',
  'from',
  'pcs',
  'oem',
  'new',
  'hot',
  'sale',
  'wholesale',
  'ml',
  'oz',
  'set',
  'pack',
  'private',
  'label',
]);

/** Floor so $0.01–$0.10 packaging junk no entra al margen. */
function minCrediblePriceEur(salePriceEur?: number): number {
  if (salePriceEur != null && salePriceEur > 0) {
    return Math.max(0.45, round2(salePriceEur * 0.04));
  }
  return 0.45;
}

/** Imagen Amazon de un aceite/serum a menudo matchea botellas vacías. */
function isPackagingMismatch(title: string, keywords: string): boolean {
  const queryIsPackaging =
    /\b(bottle|packaging|container|pump|jar|pouch|vial)\b/i.test(keywords);
  if (queryIsPackaging) return false;
  return /\b(empty\s+bottle|pump\s+bottle|pet\s+(clear\s+)?plastic|plastic\s+pump|cosmetic\s+packagin|packaging\s+material|flip\s+cap\s+bottle|shampoo\s+conditioner\s+body\s+wash\s+shower\s+gel\s+container)\b/i.test(
    title,
  );
}

function titleLooksRelated(keywords: string, title: string): boolean {
  const tokens = keywords
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !TITLE_STOP.has(t));
  if (tokens.length === 0) return true;
  const hay = title.toLowerCase();
  const hits = tokens.filter((t) => hay.includes(t));
  if (tokens.length >= 3) return hits.length >= 2;
  return hits.length >= 1;
}

/**
 * Live Alibaba.com prices via RapidAPI Otapi Alibaba (BatchSearchItemsFrame).
 * Prefiere imagen+keyword juntos; evita basura barata / packaging / URLs inventadas.
 *
 * Env:
 *   ALIBABA_COM_RAPIDAPI_KEY (falls back to ALIEXPRESS / 1688 key)
 *   ALIBABA_COM_RAPIDAPI_HOST (default otapi-alibaba.p.rapidapi.com)
 *   ALIBABA_COM_MAX_CALLS_PER_RUN (default 15)
 */
@Injectable()
export class AlibabaComSupplierProvider {
  private readonly logger = new Logger(AlibabaComSupplierProvider.name);
  readonly name = 'otapi_alibaba_rapidapi';

  private callsThisRun = 0;
  private circuitOpen = false;
  private lastCallAt = 0;

  constructor(private readonly config: ConfigService) {}

  enabled() {
    return Boolean(this.apiKey());
  }

  private apiKey() {
    return (
      this.config.get<string>('ALIBABA_COM_RAPIDAPI_KEY')?.trim() ||
      this.config.get<string>('ALIBABA_1688_RAPIDAPI_KEY')?.trim() ||
      this.config.get<string>('ALIEXPRESS_RAPIDAPI_KEY')?.trim() ||
      ''
    );
  }

  private host() {
    return (
      this.config.get<string>('ALIBABA_COM_RAPIDAPI_HOST')?.trim() ||
      'otapi-alibaba.p.rapidapi.com'
    );
  }

  private maxCalls() {
    const n = Number(this.config.get('ALIBABA_COM_MAX_CALLS_PER_RUN') ?? 15);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 15;
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
    if (!img && !keywords) return [];

    const noteBase =
      'Precio Otapi Alibaba. El listing puede no estar disponible en tu país — verificá MOQ y stock.';

    // Imagen sola matchea packaging; preferir imagen+keyword.
    if (img && keywords) {
      const both = await this.search({
        imageUrl: img,
        keywords,
        limit,
        salePriceEur,
        matchNote: `${noteBase} Match imagen+keyword.`,
        logLabel: `img+kw "${keywords}"`,
      });
      if (both.length) return both;
    }

    if (keywords) {
      const byKw = await this.search({
        keywords,
        limit,
        salePriceEur,
        matchNote: `${noteBase} Match por keyword.`,
        logLabel: `kw "${keywords}"`,
      });
      if (byKw.length) return byKw;
    }

    if (img) {
      return this.search({
        imageUrl: img,
        limit,
        salePriceEur,
        matchNote: `${noteBase} Match solo imagen — revisá bien el título.`,
        logLabel: `img ${img.slice(-40)}`,
      });
    }

    return [];
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
        `Alibaba.com skip budget ${this.callsThisRun}/${this.maxCalls()}: ${opts.logLabel}`,
      );
      return [];
    }
    if (!opts.keywords && !opts.imageUrl) return [];

    const wait = 1100 - (Date.now() - this.lastCallAt);
    if (wait > 0) await sleep(wait);

    const minEur = minCrediblePriceEur(opts.salePriceEur);
    // Otapi Alibaba prices are typically USD
    const minUsd = round2(minEur / 0.92);

    const params = new URLSearchParams({
      language: 'en',
      framePosition: '0',
      frameSize: String(Math.min(Math.max(opts.limit * 4, 10), 20)),
      // Popularity evita el $0.01 basura de Price:Asc
      OrderBy: 'Popularity:Desc',
      MinPrice: String(minUsd),
    });
    if (opts.imageUrl) params.set('ImageUrl', opts.imageUrl);
    if (opts.keywords) params.set('ItemTitle', opts.keywords);
    if (opts.salePriceEur != null && opts.salePriceEur > 0) {
      params.set('MaxPrice', String(round2(opts.salePriceEur * 1.2)));
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
          `Alibaba.com quota/auth HTTP ${res.status} — circuit open`,
        );
        return [];
      }
      if (!res.ok) {
        this.logger.warn(`Alibaba.com HTTP ${res.status}: ${res.statusText}`);
        return [];
      }

      const json = (await res.json()) as Record<string, unknown>;
      const err = String(json.ErrorCode ?? 'Ok');
      if (err !== 'Ok' && err !== 'ok') {
        this.logger.warn(`Alibaba.com ErrorCode=${err}`);
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
      const usdEur = 0.92;
      const keywords = opts.keywords ?? '';
      type Cand = {
        listingUrl: string;
        unit: number;
        title: string;
        volume: number;
      };
      const cands: Cand[] = [];
      const seen = new Set<string>();

      for (const raw of list) {
        const listingUrl = pickUrl(raw);
        const unit = pickUnitPriceEur(raw, usdEur);
        const title = pickTitle(raw);
        if (!listingUrl || unit == null || unit < minEur) continue;
        if (
          opts.salePriceEur != null &&
          unit >= opts.salePriceEur * 0.9
        ) {
          continue;
        }
        if (isPackagingMismatch(title, keywords)) continue;
        if (keywords && !titleLooksRelated(keywords, title)) continue;
        if (seen.has(listingUrl)) continue;
        seen.add(listingUrl);

        cands.push({
          listingUrl,
          unit,
          title,
          volume: asNumber(raw.Volume) ?? 0,
        });
      }

      cands.sort((a, b) => {
        if (b.volume !== a.volume) return b.volume - a.volume;
        return a.unit - b.unit;
      });

      const offers: SupplierOffer[] = cands.slice(0, opts.limit).map((c) => ({
        source: 'alibaba' as const,
        name: c.title,
        listingUrl: c.listingUrl,
        unitPriceEur: c.unit,
        shippingEstimateEur: undefined,
        leadTimeDays: 18,
        reliabilityScore: opts.imageUrl && opts.keywords ? 72 : 58,
        region: 'Alibaba.com',
        kind: 'live' as const,
        note: opts.matchNote,
      }));

      this.logger.log(
        `Alibaba.com ${opts.logLabel} → ${offers.length} live (from ${list.length} raw, ${cands.length} ok) · calls ${this.callsThisRun}/${this.maxCalls()}`,
      );
      return offers;
    } catch (err) {
      this.logger.warn(`Alibaba.com search failed: ${err}`);
      return [];
    }
  }
}

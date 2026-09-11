/**
 * Amazon marketplaces selectable in the user profile.
 * Keepa domain IDs: https://keepa.com/#!discuss/t/api/100
 */

export interface AmazonMarket {
  code: string;
  name: string;
  amazonHost: string;
  keepaDomain: number;
  /** ISO country used for TikTok/Meta targeting hints */
  countryCode: string;
  currency: string;
}

export const AMAZON_MARKETS: AmazonMarket[] = [
  {
    code: 'US',
    name: 'Estados Unidos',
    amazonHost: 'amazon.com',
    keepaDomain: 1,
    countryCode: 'US',
    currency: 'USD',
  },
  {
    code: 'ES',
    name: 'España',
    amazonHost: 'amazon.es',
    keepaDomain: 9,
    countryCode: 'ES',
    currency: 'EUR',
  },
  {
    code: 'DE',
    name: 'Alemania',
    amazonHost: 'amazon.de',
    keepaDomain: 3,
    countryCode: 'DE',
    currency: 'EUR',
  },
  {
    code: 'FR',
    name: 'Francia',
    amazonHost: 'amazon.fr',
    keepaDomain: 4,
    countryCode: 'FR',
    currency: 'EUR',
  },
  {
    code: 'IT',
    name: 'Italia',
    amazonHost: 'amazon.it',
    keepaDomain: 8,
    countryCode: 'IT',
    currency: 'EUR',
  },
  {
    code: 'UK',
    name: 'Reino Unido',
    amazonHost: 'amazon.co.uk',
    keepaDomain: 2,
    countryCode: 'GB',
    currency: 'GBP',
  },
  {
    code: 'CA',
    name: 'Canadá',
    amazonHost: 'amazon.ca',
    keepaDomain: 6,
    countryCode: 'CA',
    currency: 'CAD',
  },
  {
    code: 'MX',
    name: 'México',
    amazonHost: 'amazon.com.mx',
    keepaDomain: 11,
    countryCode: 'MX',
    currency: 'MXN',
  },
];

const BY_CODE = new Map(AMAZON_MARKETS.map((m) => [m.code, m]));

export function amazonMarket(code: string | null | undefined): AmazonMarket {
  return BY_CODE.get(code ?? 'ES') ?? AMAZON_MARKETS.find((m) => m.code === 'ES')!;
}

export function isAmazonMarketCode(code: string): boolean {
  return BY_CODE.has(code);
}

/** Parse KEEPA_MARKETS env (e.g. "ES,US,MX,UK") into known market codes. */
export function parseKeepaMarketCodes(
  envValue: string | null | undefined,
  fallback: string[] = ['ES', 'US'],
): string[] {
  const codes = (envValue ?? '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter((code) => isAmazonMarketCode(code));
  return codes.length ? codes : fallback.filter((c) => isAmazonMarketCode(c));
}

/** Markets enabled for ingest / UI filters, driven by KEEPA_MARKETS. */
export function configuredAmazonMarkets(
  envValue: string | null | undefined,
): AmazonMarket[] {
  return parseKeepaMarketCodes(envValue).map((code) => amazonMarket(code));
}

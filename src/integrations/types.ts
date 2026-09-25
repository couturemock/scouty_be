import { MetricKind } from '../products/product.entity';

export interface CommercialSignal {
  source: 'amazon' | 'tiktok_shop';
  externalId: string;
  title: string;
  imageUrl?: string;
  category: string;
  /** Keepa browse-node allowlist label(s) this ASIN was pulled from (e.g. Belleza). */
  ingestCategories?: string[];
  country: string;
  price?: number;
  rank?: number;
  demand?: number;
  demandKind: MetricKind;
  estimatedSales?: number;
  estimatedSalesKind: MetricKind;
  gmv?: number;
  gmvKind: MetricKind;
  growthPct?: number;
  growthPct7?: number;
  growthPct30?: number;
  brand?: string;
  rating?: number;
  reviewCount?: number;
  description?: string;
  amazonUrl?: string;
  raw?: Record<string, unknown>;
}

export interface SupplierOffer {
  source: 'alibaba' | '1688' | 'aliexpress';
  name: string;
  listingUrl: string;
  unitPriceEur?: number;
  moq?: number;
  shippingEstimateEur?: number;
  leadTimeDays?: number;
  reliabilityScore?: number;
  region?: string;
  /** estimated = fixture / heuristic; live = from real API */
  kind?: 'estimated' | 'live';
  note?: string;
  /** Orders / sold / Otapi Volume — estimated marketplace activity, never invented. */
  soldCount?: number;
  popularity?: number;
}

export interface CreativeAd {
  platform: 'tiktok' | 'facebook' | 'instagram';
  title: string;
  thumbnailUrl?: string;
  sourceUrl?: string;
  publicSignals?: Record<string, unknown>;
  aiAnalysis?: {
    label: 'Análisis/estimación de Scout-ly AI';
    hook: 'Fuerte' | 'Medio' | 'Débil';
    cta: 'Fuerte' | 'Medio' | 'Débil';
    ctrPotential: 'Alto' | 'Medio' | 'Bajo';
    conversionPotential: 'Alto' | 'Medio' | 'Bajo';
    structure?: string;
    format?: string;
    angle?: string;
    notes?: string;
  };
}

export interface AmazonProvider {
  name: string;
  collectWeeklyCandidates(
    countries?: string[],
    options?: { productsPerCategory?: number },
  ): Promise<CommercialSignal[]>;
  lookupByAsinOrUrl(
    query: string,
    marketCode?: string,
  ): Promise<CommercialSignal | null>;
  /** Free-text/keyword product search (e.g. a candidate title found via image search). */
  searchByKeyword?(
    term: string,
    marketCode?: string,
    limit?: number,
  ): Promise<CommercialSignal[]>;
}

export interface TikTokShopProvider {
  name: string;
  collectWeeklyCandidates(countries?: string[]): Promise<CommercialSignal[]>;
  lookupByProductIdOrUrl(query: string): Promise<CommercialSignal | null>;
}

export interface SupplierProvider {
  name: string;
  findRelated(
    productTitle: string,
    limit?: number,
    salePriceEur?: number,
  ): Promise<SupplierOffer[]>;
}

export interface AdsProvider {
  name: string;
  findRelatedAds(
    productTitle: string,
    limit?: number,
    country?: string,
  ): Promise<CreativeAd[]>;
}

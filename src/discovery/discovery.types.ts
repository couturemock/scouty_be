import { CreativeAd, SupplierOffer } from '../integrations/types';

export type DiscoveryPass = 'new' | 'sustained' | 'seed';

/** Product info PipiAds attaches to an ad (`/adspy/detail`, 1 credit). */
export type AdProductDetail = {
  productId: string | null;
  productTitle: string | null;
  productPrice: number | null;
  productCurrency: string | null;
  productImage: string | null;
  storeName: string | null;
  storeDomain: string | null;
  landingUrl: string | null;
};

export type DiscoveredAd = {
  videoId: string;
  platform: CreativeAd['platform'];
  copy: string;
  advertiser: string | null;
  advertiserId: string | null;
  storeId: string | null;
  shopType: string | null;
  dataTypes: number[];
  buttonText: string | null;
  putDays: number;
  plays: number;
  likes: number;
  comments: number;
  shares: number;
  /** Unix seconds — when PipiAds first saw the ad (found_time / ad_create_time). */
  firstSeenAt: number | null;
  /** Unix seconds — last delivery PipiAds saw. */
  lastSeenAt: number | null;
  aiTags: string[];
  pass: DiscoveryPass;
  seed?: string;
  creative: CreativeAd;
  detail?: AdProductDetail;
};

export type StoreProductInfo = {
  title: string;
  priceEur: number | null;
  compareAtEur: number | null;
  imageUrl: string | null;
  productType: string | null;
  vendor: string | null;
  tags: string[];
  /** False when no variant ships (digital download, service, gift card). */
  requiresShipping: boolean | null;
};

export type ProductCluster = {
  key: string;
  title: string;
  handle: string | null;
  ads: DiscoveredAd[];
  stores: string[];
  advertisers: string[];
  platforms: CreativeAd['platform'][];
  firstSeenAt: number | null;
  lastSeenAt: number | null;
  maxPutDays: number;
  plays: number;
  likes: number;
  comments: number;
  shares: number;
  aiTags: string[];
  seeds: string[];
  /** Representative store landing (first detailed ad with a URL). */
  landingUrl: string | null;
  storeDomain: string | null;
  imageUrl: string | null;
  priceEur: number | null;
  priceSource: 'store' | 'pipiads' | null;
  store?: StoreProductInfo | null;
  suppliers?: SupplierOffer[];
};

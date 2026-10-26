import { isNonProductAd } from '../integrations/ads/ad-content-filters';
import {
  FilterReason,
  productRejectReason,
} from '../integrations/amazon/product-filters';
import { BIG_BRANDS, wordBoundary } from '../integrations/shared/brand-denylist';
import { DiscoveredAd } from './discovery.types';

export type DropshipRejectReason =
  | FilterReason
  | 'app_or_game'
  | 'creator_content'
  | 'non_product'
  | 'entertainment'
  | 'no_store'
  | 'marketplace_store'
  | 'brand_store'
  | 'price_out_of_band'
  | 'digital_or_service'
  | 'ingestible'
  | 'personalized'
  | 'bulk_supplies'
  | 'fine_jewelry'
  | 'apparel';

/** data_type 5 game, 6 app, 7 AI, 8 short drama. */
const NON_STORE_DATA_TYPES = new Set([5, 6, 7, 8]);
/** data_type 4: Spark Ad, an organic post boosted as an ad. */
const SPARK_DATA_TYPE = 4;

/**
 * Big retailers/marketplaces and platform-owned shops — an ad pointing here is
 * the platform's own catalogue, not a product a dropshipper can copy.
 */
const MARKETPLACE_DOMAIN =
  /(^|\.)(amazon|walmart|target|temu|shein|aliexpress|alibaba|ebay|etsy|wish|shopee|lazada|mercadolibre|mercadolivre|zalando|asos|ikea|bestbuy|costco|homedepot|lowes|wayfair|carrefour|elcorteingles|decathlon|primark|hm|zara|tiktok|apple|samsung|google|microsoft)\.[a-z.]+$/i;

/** Official/registered-brand stores. Weak signal, but dropship stores rarely brand themselves this way. */
const BRAND_STORE_NAME = /official|oficial|™|®/i;

/** Music, events, media and sponsored creator posts surfaced by "Shop now" CTAs (seen live in the spike). */
const ENTERTAINMENT = wordBoundary(
  'album|vinyl|vinilo|world\\s+tour|concert|concierto|tickets?|entradas|pre[- ]?order\\s+now|merch|movie|pel[ií]cula|streaming|podcast|webinar|course|curso|masterclass|ebook',
);

const SPONSORED_CREATOR =
  /#(?:ad|sponsored|partner|nativepartner|publicidad|patrocinado)\b|sponsoredby|discount\s+code|c[oó]digo\s+de\s+descuento/i;

/** Nothing to ship: software, trading tools, downloads, services, made-to-order songs. */
const DIGITAL_OR_SERVICE = wordBoundary(
  'software|(?:software|lifetime)\\s+licen[cs]e|licencia\\s+de\\s+software|subscription|suscripci[oó]n|membership|membres[ií]a|tradingview|trading\\s+(?:indicator|bot|signals?)|indicador\\s+de\\s+trading|expert\\s+advisor|template|plantilla|presets?|luts?|printable|imprimible|digital\\s+(?:download|product|file|planner|guide)|descarga\\s+digital|pdf|e-?book|course|curso|coaching|consultation|gift\\s*card|tarjeta\\s+regalo|voucher|songs?|canci[oó]n|custom\\s+video',
);

/** Swallowed or applied as treatment: food, supplements, wellness pills. Regulated in the EU. */
const INGESTIBLE = wordBoundary(
  'gumm(?:y|ies)|gominolas?|gomitas?|chews|masticables|capsules?|c[aá]psulas?|comprimidos|pastillas|softgels?|supplements?|suplementos?|probiotics?|probi[oó]ticos?|collagen|col[aá]geno|creatine|creatina|magnesium|magnesio|ashwagandha|nad\\+?|nmn|melatonin|melatonina|biotin|biotina|electrolytes?|protein\\s+powder|prote[ií]na\\s+en\\s+polvo|detox|keto|weight\\s+loss|p[eé]rdida\\s+de\\s+peso|fat\\s+burn(?:er|ing)?|quemagrasas|appetite\\s+suppressant|herbal\\s+tea|t[eé]\\s+adelgazante|tinctures?|cbd|hemp\\s+oil|kratom|nicotine|nicotina|vapes?|shilajit|sea\\s+moss|greens\\s+powder|superfoods?',
);

/** Made to order with the buyer's names/photos — print-on-demand, not stock a supplier holds. */
const PERSONALIZED = wordBoundary(
  "personali[sz]ed|personali[sz]able|personalizad[oa]s?|personnalis[ée]e?s?|personalisiert|custom(?:ized|ised)?\\s+(?:name|names|photo|portrait|text|engraving|initials?|pet|map|star\\s+map)|with\\s+(?:your|their|kids'?|children'?s?|family)\\s+names?|con\\s+(?:tu|su|sus)\\s+nombres?|con\\s+nombres?|name\\s+(?:necklace|bracelet|ring|sign)|engraved|engraving|grabad[oa]s?|grabado\\s+l[aá]ser|your\\s+photo|tu\\s+foto|photo\\s+(?:blanket|pillow|lamp|necklace)|birthstones?|made\\s+to\\s+order|hecho\\s+a\\s+medida",
);

/** Wholesale packs of craft/making supplies (e.g. "172 Pcs Bezels"). */
const BULK_SUPPLIES = /(?<![\p{L}\p{N}])(?:[5-9]\d|\d{3,})\s*(?:pcs|pieces|piezas|unidades|uds|pack|count|ct)(?![\p{L}\p{N}])|\b(?:wholesale|bulk|al\s+por\s+mayor|mayorista|lote\s+de)\b/iu;

/**
 * Precious metals/stones: real cost is far above CJ/AliExpress alloy pieces.
 * "18K gold plated" is the typical dropship piece and must pass.
 */
const FINE_JEWELRY = wordBoundary(
  'solid\\s+(?:gold|silver)|oro\\s+macizo|real\\s+gold|oro\\s+de\\s+ley|(?:9|10|14|18|22|24)\\s*k(?:t|arat)?\\s+(?:solid\\s+|real\\s+)?gold(?!\\s+(?:plated|filled|vermeil|tone))|(?:9|10|14|18|22|24)\\s*quilates|diamonds?(?!\\s+(?:painting|art|dotz|cut|pattern))|diamantes?(?!\\s+(?:pintura|art))|lab[- ]grown|platinum|platino',
);

/**
 * Plain fashion garments (dresses, hoodies, jeans…): thin margins once
 * returns/exchanges from sizing are factored in, and no functional "wow"
 * that cold traffic can't already get from any clothing store — a known
 * weak category for cold-traffic dropshipping. Deliberately excludes shoes
 * (too ambiguous with pet/costume gear, e.g. "cat claw shoes") and anything
 * matching `FUNCTIONAL_WEARABLE` below, which still earns its place.
 */
const GENERIC_APPAREL = wordBoundary(
  'dress(?:es)?|maxi\\s+dress|vestido[s]?|gown|blouse|blusa|skirt|falda|jeans|denim|trousers?|pantal[oó]n(?:es)?|shorts?|jumpsuit|romper|bodysuit|mono\\s+(?:corto|largo)|overalls?|tunic|t[uú]nica|poncho|cardigan|sweater|su[eé]ter|jumper|pullover|hoodie|sudadera|sweatshirt|blazer|\\bsuit\\b|traje|\\bcoat\\b|abrigo|\\bjacket\\b|chaqueta|\\bshirt\\b|camisa|t-?shirt|camiseta|leggings?|skort|culottes?',
);

/** A garment earns a pass when it's actually a functional gadget, not plain fashion. */
const FUNCTIONAL_WEARABLE = wordBoundary(
  'heated|heating|calefact\\w*|cooling|enfriamiento|compression|compresi[oó]n|posture|postura|weighted|con\\s+peso|\\bled\\b|magnetic|magn[eé]tico|massag(?:e|ing)|masaje|thermal|t[eé]rmic[oa]|electric|el[eé]ctric[oa]|slimming|reductor|shapewear|faja|costume|disfraz|cosplay|anti-?static|waterproof|impermeable|reflective|reflectante|led\\s+light|light[- ]up',
);

/**
 * Discovery-only fit for dropshipping: something physical that a CJ/AliExpress
 * supplier can hold in stock and ship as-is. Title and Shopify product type
 * decide; store tags only for personalised/digital (merchants tag those reliably).
 */
export function dropshipFitReason(input: {
  title: string;
  productType?: string | null;
  tags?: string[] | null;
  requiresShipping?: boolean | null;
}): DropshipRejectReason | null {
  const main = `${input.title} ${input.productType ?? ''}`;
  const tags = (input.tags ?? []).join(' ');
  if (input.requiresShipping === false) return 'digital_or_service';
  if (DIGITAL_OR_SERVICE.test(main) || /\b(?:digital|download)\b/i.test(tags)) {
    return 'digital_or_service';
  }
  if (INGESTIBLE.test(main)) return 'ingestible';
  if (PERSONALIZED.test(main) || /\b(?:personali[sz]ed|custom\s+name|engraved)\b/i.test(tags)) {
    return 'personalized';
  }
  if (BULK_SUPPLIES.test(input.title)) return 'bulk_supplies';
  if (FINE_JEWELRY.test(main)) return 'fine_jewelry';
  if (GENERIC_APPAREL.test(main) && !FUNCTIONAL_WEARABLE.test(main)) return 'apparel';
  return null;
}

export type PriceBand = { minEur: number; maxEur: number };

export const DEFAULT_PRICE_BAND: PriceBand = { minEur: 12, maxEur: 90 };

/**
 * Ad-level gate, before spending a detail credit: drops app/game content,
 * creator posts that sell nothing, and obvious non-product or big-brand ads
 * using only list fields. Spark Ads that point to a store are kept — that is
 * how many dropshipping stores advertise on TikTok, and they carry the most
 * engagement; the product gate after detail still checks the store itself.
 */
export function adRejectReason(ad: DiscoveredAd): DropshipRejectReason | null {
  if (ad.dataTypes.some((t) => NON_STORE_DATA_TYPES.has(t))) return 'app_or_game';
  const hasStore = Boolean(ad.storeId || ad.shopType);
  if (!hasStore && ad.dataTypes.includes(SPARK_DATA_TYPE)) return 'creator_content';
  const copy = ad.copy ?? '';
  if (isNonProductAd({ title: copy })) return 'non_product';
  if (ENTERTAINMENT.test(copy)) return 'entertainment';
  if (!hasStore && SPONSORED_CREATOR.test(copy)) return 'creator_content';
  if (BIG_BRANDS.test(copy) || BIG_BRANDS.test(ad.advertiser ?? '')) return 'brand';
  return null;
}

export function isMarketplaceDomain(domain: string | null | undefined): boolean {
  if (!domain) return false;
  return MARKETPLACE_DOMAIN.test(domain.replace(/^www\./, ''));
}

/**
 * Product-level gate, after PipiAds detail (+ store scrape): the product must
 * live in an independent store, not be a big brand, pass the shared
 * consumable/regulated/heavy filters, and sit in an impulse-buy price band.
 * A missing price is not a rejection here (margin then decides TOP 10).
 */
export function dropshipRejectReason(
  input: {
    title: string;
    storeDomain: string | null;
    storeName?: string | null;
    advertiser?: string | null;
    priceEur?: number | null;
    productType?: string | null;
    tags?: string[] | null;
    requiresShipping?: boolean | null;
  },
  band: PriceBand = DEFAULT_PRICE_BAND,
): DropshipRejectReason | null {
  if (!input.storeDomain) return 'no_store';
  if (isMarketplaceDomain(input.storeDomain)) return 'marketplace_store';
  const storeLabel = `${input.storeName ?? ''} ${input.storeDomain}`;
  if (BIG_BRANDS.test(storeLabel) || BIG_BRANDS.test(input.advertiser ?? '')) {
    return 'brand';
  }
  if (input.storeName && BRAND_STORE_NAME.test(input.storeName)) return 'brand_store';
  // AI tags are noisy (#baby, #beauty…) — only the product title feeds the
  // consumable/regulated/heavy filters, not the tags as a category path.
  const base = productRejectReason({ title: input.title });
  if (base) return base;
  if (ENTERTAINMENT.test(input.title)) return 'entertainment';
  const fit = dropshipFitReason(input);
  if (fit) return fit;
  const price = input.priceEur;
  if (price != null && (price < band.minEur || price > band.maxEur)) {
    return 'price_out_of_band';
  }
  return null;
}

/**
 * Amazon ingest filters: skip consumables, big brands, generic junk.
 * Applied after Keepa map, before supplier calls.
 */

const BIG_BRANDS =
  /\b(apple|samsung|sony|nike|adidas|dyson|lego|microsoft|bose|canon|nikon|hp|dell|lenovo|asus|macbook|iphone|ipad|google|amazon\s*basics|philips|braun|oral[- ]?b|pampers|huggies|nestle|nestlé|coca[- ]?cola|pepsi|lays|kellogg|danone|nivea|loreal|l'oréal|gillette|duracell|energizer)\b/i;

const CONSUMABLE_TITLE =
  /\b(batter(?:y|ies)|pilas?|pañales?|diapers?|formula\b|leche\s+en\s+polvo|grocery|alimentaci[oó]n|snack|chips|cereal|coffee\s+pods?|c[aá]psulas?\s+de\s+caf[eé]|vitamin|suplemento|protein\s+powder|comida\s+para\s+(perros?|gatos?)|dog\s+food|cat\s+food|wet\s+food|litter|arena\s+para\s+gatos?)\b/i;

const GENERIC_JUNK =
  /\b(usb[- ]?c?\s*cable|cable\s+usb|phone\s+case|funda\s+(para\s+)?(m[oó]vil|iphone|samsung)|screen\s+protector|protector\s+de\s+pantalla|hdmi\s+cable|charging\s+cable|cable\s+de\s+carga)\b/i;

/** Category path / label denylist (ES + EN). */
const CONSUMABLE_CATEGORY =
  /\b(grocery|alimentaci[oó]n|despensa|baby|beb[eé]|pañal|diaper|battery|pilas?|health\s*&\s*personal\s*care\s*·\s*vitamins|farmacia)\b/i;

export type FilterReason =
  | 'brand'
  | 'consumable_title'
  | 'consumable_category'
  | 'generic'
  | 'no_title';

export function amazonIngestRejectReason(input: {
  title?: string;
  brand?: string | null;
  category?: string;
}): FilterReason | null {
  const title = (input.title ?? '').trim();
  if (!title) return 'no_title';
  const brand = input.brand ?? '';
  const category = input.category ?? '';

  if (BIG_BRANDS.test(brand) || BIG_BRANDS.test(title)) return 'brand';
  if (CONSUMABLE_TITLE.test(title)) return 'consumable_title';
  if (CONSUMABLE_CATEGORY.test(category)) return 'consumable_category';
  if (GENERIC_JUNK.test(title)) return 'generic';
  return null;
}

export function passesAmazonIngestFilters(input: {
  title?: string;
  brand?: string | null;
  category?: string;
}): boolean {
  return amazonIngestRejectReason(input) == null;
}

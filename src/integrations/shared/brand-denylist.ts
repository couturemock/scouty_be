/**
 * Shared big-brand denylist — single source of truth.
 * Previously duplicated (with drifting brand lists) across product-filters.ts,
 * aliexpress.provider.ts and alibaba-com.provider.ts.
 */

/**
 * JS `\b` only treats ASCII [A-Za-z0-9_] as "word" characters — a plain
 * `\b(...)\b` wrapper silently fails to match whenever an alternative ends
 * right on an accented letter (café, nestlé, biberón…), because the boundary
 * check at that edge sees two "non-word" characters and never fires. Found
 * live: "Cápsulas de café" sailed straight through the old `\bcaf[eé]\b`
 * pattern during a real ingest. This builds boundaries from Unicode letter/
 * number categories instead, so accents never break the match.
 */
export function wordBoundary(alternation: string): RegExp {
  return new RegExp(
    `(?<![\\p{L}\\p{N}_])(?:${alternation})(?![\\p{L}\\p{N}_])`,
    'iu',
  );
}

const BRAND_ALTERNATION =
  "apple|samsung|sony|nike|adidas|dyson|lego|microsoft|bose|canon|nikon|hp|dell|lenovo|asus|macbook|iphone|ipad|google|amazon\\s*basics|philips|braun|oral[- ]?b|pampers|huggies|nestle|nestlé|coca[- ]?cola|pepsi|lays|kellogg|danone|nivea|loreal|l'oréal|gillette|duracell|energizer|" +
  // Mobile/wearables — leak into sports/home/electronics-adjacent listings
  'xiaomi|huawei|oneplus|oppo|vivo|realme|garmin|fitbit|jbl|beats|logitech|razer|xbox|playstation|nintendo|' +
  // Toys
  'playmobil|hasbro|mattel|fisher[- ]?price|' +
  // Home/kitchen appliances
  'shark|irobot|roomba|ninja|kitchenaid|tefal|moulinex|bosch|siemens|whirlpool|vorwerk|thermomix|' +
  // Beauty
  'medicube|olaplex|' +
  // Luggage / automotive / pets
  'samsonite|american\\s*tourister|thule|michelin|kong';

export const BIG_BRANDS = wordBoundary(BRAND_ALTERNATION);

export function isLikelyBranded(title: string): boolean {
  return BIG_BRANDS.test(title ?? '');
}

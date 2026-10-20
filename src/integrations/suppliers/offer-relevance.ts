/**
 * Filter Otapi/AliExpress noise when the query was poisoned (ad thumbnails,
 * marketing copy instead of a product seed).
 */
export function offerMatchesSeed(offerName: string, seed: string): boolean {
  const tokens = seed
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3);
  if (!tokens.length) return true;
  const hay = offerName.toLowerCase();
  const hits = tokens.filter((t) => hay.includes(t));
  if (tokens.length >= 2) {
    return (
      hits.length >= 2 || hits.includes(tokens[tokens.length - 1]!)
    );
  }
  return hits.length >= 1;
}

/** Words that say nothing about which product it is. */
const GENERIC_TOKENS = new Set(
  (
    'the and for with from new best top pro max plus ultra premium advanced original upgraded ' +
    'set kit pack pcs piece pieces mini size color colour style edition version model series ' +
    'women woman men man unisex kids girl boy gift gifts sale hot free shipping official store ' +
    'gold silver black white rose blue red pink green 2024 2025 2026 para con del las los una uno por ' +
    'led smart portable wireless electric rechargeable automatic touch control usb waterproof ' +
    'adjustable foldable magnetic multifunctional professional household home'
  ).split(' '),
);

/** Product-identifying words of a title: brand-free, lowercase, deduplicated. */
export function distinctiveTokens(title: string): string[] {
  return [
    ...new Set(
      title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 3 && !/^\d+$/.test(t) && !GENERIC_TOKENS.has(t)),
    ),
  ];
}

/**
 * Stricter than `offerMatchesSeed`, for the weekly snapshot: a keyword offer
 * must share at least half of the product's distinctive words (min. 2), so a
 * "V4 Pro" or "Gold" coincidence no longer counts as the same product. Image
 * matches already look alike, so one shared distinctive word is enough.
 */
export function offerIsSameProduct(
  offer: { name: string; matchedBy?: 'keyword' | 'image' },
  productTitle: string,
): boolean {
  const tokens = distinctiveTokens(productTitle);
  if (!tokens.length) return false;
  const hay = offer.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const hits = tokens.filter((t) => hay.includes(t.length > 4 ? t.replace(/s$/, '') : t)).length;
  if (offer.matchedBy === 'image') return hits >= 1;
  const need = Math.min(tokens.length, Math.max(2, Math.ceil(tokens.length / 2)));
  return hits >= need;
}

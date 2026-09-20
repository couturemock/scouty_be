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

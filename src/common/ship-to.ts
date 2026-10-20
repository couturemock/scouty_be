/** Destination country for supplier shipping quotes (CJ/AliExpress) and ad lookups. */
export function shipToCountry(env: Record<string, string | undefined> = process.env): string {
  return env.SHIP_TO_COUNTRY?.trim().toUpperCase() || 'ES';
}

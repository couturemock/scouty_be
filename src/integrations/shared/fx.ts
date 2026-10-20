/**
 * Approximate EUR conversion for store/supplier prices. Static reference
 * rates (override per currency with FX_<CODE>_EUR, e.g. FX_USD_EUR=0.93) —
 * good enough to rank margins, not for invoicing.
 */
const DEFAULT_TO_EUR: Record<string, number> = {
  EUR: 1,
  USD: 0.92,
  GBP: 1.17,
  CAD: 0.67,
  AUD: 0.6,
  NZD: 0.55,
  MXN: 0.05,
  CHF: 1.05,
  SEK: 0.088,
  NOK: 0.086,
  DKK: 0.134,
  PLN: 0.23,
  JPY: 0.0061,
  BRL: 0.17,
};

export function toEur(
  amount: number | null | undefined,
  currency: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): number | null {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return null;
  const code = (currency || 'USD').trim().toUpperCase();
  const override = Number(env[`FX_${code}_EUR`]);
  const rate =
    Number.isFinite(override) && override > 0 ? override : DEFAULT_TO_EUR[code];
  if (!rate) return null;
  return Number((amount * rate).toFixed(2));
}

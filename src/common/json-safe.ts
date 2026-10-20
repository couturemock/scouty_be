/**
 * Postgres jsonb rejects NUL bytes, and a lone UTF-16 surrogate (an emoji
 * truncated mid-codepoint by PipiAds) still round-trips through
 * JSON.stringify/parse as "valid" JSON text but can't be encoded as UTF-8 —
 * pg then rejects the insert with "invalid input syntax for type json".
 * Strip both before saving.
 */
const LONE_SURROGATE =
  /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g;

export function jsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (typeof v === 'bigint') return Number(v);
      if (typeof v === 'number' && !Number.isFinite(v)) return null;
      if (typeof v === 'string') {
        return v.replace(/\u0000/g, '').replace(LONE_SURROGATE, '');
      }
      if (v === undefined) return null;
      return v;
    }),
  ) as T;
}

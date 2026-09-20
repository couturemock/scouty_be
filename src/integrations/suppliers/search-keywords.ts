/**
 * Build a marketplace search query from an Amazon title.
 * Drops brand-ish prefixes, sizes, and Spanish filler so AliExpress/Alibaba match better.
 */
const STOP = new Set([
  'en',
  'de',
  'para',
  'y',
  'con',
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'del',
  'al',
  'the',
  'and',
  'for',
  'with',
  'a',
  'an',
  'of',
  'to',
  'unidad',
  'unidades',
  'pack',
  'pcs',
  'pc',
  'negro',
  'negra',
  'blanco',
  'blanca',
  'black',
  'white',
  'set',
]);

/** Common ES product words → EN (AliExpress/Alibaba search better in English). */
const ES_EN: Record<string, string> = {
  pulverizador: 'sprayer',
  spray: 'spray',
  aceite: 'oil',
  cocina: 'kitchen',
  freidora: 'fryer',
  aire: 'air',
  masajeador: 'massager',
  cuello: 'neck',
  cervical: 'cervical',
  serum: 'serum',
  sérum: 'serum',
  crema: 'cream',
  facial: 'facial',
  botella: 'bottle',
  dispensador: 'dispenser',
  dispensadora: 'dispenser',
  vinagre: 'vinegar',
  ensaladas: 'salad',
  portatil: 'portable',
  portátil: 'portable',
  recargable: 'rechargeable',
  electrico: 'electric',
  eléctrico: 'electric',
  mini: 'mini',
  inalambrico: 'wireless',
  inalámbrico: 'wireless',
};

function isBrandToken(w: string) {
  // TrendPlain, GoPro, Xiaomi-like CamelCase / glued brands
  if (/^[A-ZÁÉÍÓÚ][a-zà-ú]+[A-ZÁÉÍÓÚ]/.test(w)) return true;
  if (/^[A-Z]{3,}$/.test(w) && w.length <= 12) return true;
  return false;
}

export function supplierSearchKeywords(title: string, maxWords = 5): string {
  let t = title
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b\d+([.,]\d+)?\s*(ml|mL|l|L|g|kg|oz|pcs?|pack|unidad(?:es)?)\b/gi, ' ')
    .replace(/\b\d+\s*en\s*\d+\b/gi, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ');

  let words = t
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOP.has(w.toLowerCase()) && !/^\d+$/.test(w));

  while (words.length > 1 && isBrandToken(words[0])) {
    words = words.slice(1);
  }

  const mapped = words.map((w) => ES_EN[w.toLowerCase()] ?? w);
  const hasEsMap = words.some((w) => ES_EN[w.toLowerCase()]);

  // If we translated ES terms, prefer the English mapped phrase (better AE/Alibaba recall).
  const chosen = hasEsMap
    ? mapped.map((w) => w.toLowerCase())
    : mapped;

  const out: string[] = [];
  const seen = new Set<string>();
  for (const w of chosen) {
    const k = w.toLowerCase();
    if (seen.has(k)) continue;
    // Prefer "sprayer" over bare "spray" when both appear
    if (k === 'spray' && (seen.has('sprayer') || chosen.some((x) => x.toLowerCase() === 'sprayer'))) {
      continue;
    }
    seen.add(k);
    out.push(w);
  }

  // Prefer "oil sprayer …" word order when both present
  const oilIdx = out.findIndex((w) => w.toLowerCase() === 'oil');
  const sprayerIdx = out.findIndex((w) => w.toLowerCase() === 'sprayer');
  if (oilIdx >= 0 && sprayerIdx >= 0 && oilIdx > sprayerIdx) {
    const oil = out.splice(oilIdx, 1)[0];
    out.splice(sprayerIdx, 0, oil);
  }

  return out.slice(0, maxWords).join(' ').slice(0, 60);
}

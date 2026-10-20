import { wordBoundary } from '../integrations/shared/brand-denylist';

export type DiscoveryCategory = {
  key: string;
  es: string;
  en: string;
  /** Keyword passes (PipiAds extend_keywords) — coverage backstop per vertical. */
  seeds: string[];
  /** Matches product title, AI tags, store product_type. */
  match: RegExp;
};

export const DISCOVERY_CATEGORIES: DiscoveryCategory[] = [
  {
    key: 'home_kitchen',
    es: 'Hogar y cocina',
    en: 'Home & Kitchen',
    seeds: ['kitchen gadget', 'cleaning tool'],
    match: wordBoundary(
      'kitchen|cocina|cook(?:ing|ware)?|blender|batidora|knife\\s+sharpener|cutting\\s+board|clean(?:ing|er)?|limpieza|mop|fregona|vacuum|aspirador[a]?|laundry|lavander[ií]a|bathroom|ba[nñ]o|shower|ducha|towel|toalla|home|hogar|homedecor|homegoods',
    ),
  },
  {
    key: 'storage_organization',
    es: 'Organización',
    en: 'Storage & Organization',
    seeds: ['closet organizer'],
    match: wordBoundary('organi[sz]er|organizador|storage|almacenaje|closet|armario|drawer|caj[oó]n|rack|shelf|estanter[ií]a'),
  },
  {
    key: 'beauty',
    es: 'Belleza y cuidado',
    en: 'Beauty & Personal Care',
    seeds: ['facial massager', 'hair styling tool'],
    match: wordBoundary(
      'beauty|belleza|skincare|skin\\s*care|facial|face|cara|hair|cabello|pelo|nail|u[nñ]as|makeup|maquillaje|teeth|dientes|whitening|blanqueador|massager|masajeador|lash|pesta[nñ]as|razor|depiladora|epilator',
    ),
  },
  {
    key: 'health_fitness',
    es: 'Fitness y bienestar',
    en: 'Fitness & Wellness',
    seeds: ['posture corrector', 'resistance bands'],
    match: wordBoundary(
      'fitness|gym|workout|entrenamiento|yoga|pilates|posture|postura|massage\\s+gun|pistola\\s+de\\s+masaje|resistance\\s+band|bandas?\\s+de\\s+resistencia|knee|rodilla|back\\s+pain|dolor\\s+de\\s+espalda|neck|cuello|sleep|dormir|wellness|bienestar',
    ),
  },
  {
    key: 'pets',
    es: 'Mascotas',
    en: 'Pets',
    seeds: ['dog accessories', 'cat toy'],
    match: wordBoundary('pet|pets|mascotas?|dog|dogs|perro|perros|puppy|cachorro|cat|cats|gato|gatos|kitten|leash|correa|harness|arn[eé]s|grooming'),
  },
  {
    key: 'baby_kids',
    es: 'Bebés y niños',
    en: 'Baby & Kids',
    seeds: ['toddler toy'],
    match: wordBoundary('baby|beb[eé]|toddler|kids?|ni[nñ]os?|infant|montessori|nursery'),
  },
  {
    key: 'toys',
    es: 'Juguetes y hobbies',
    en: 'Toys & Hobbies',
    seeds: ['fidget toy'],
    match: wordBoundary('toy|toys|juguete|juguetes|puzzle|rompecabezas|lego-like|building\\s+blocks|fidget|craft|manualidades|diy\\s+kit|hobby'),
  },
  {
    key: 'automotive',
    es: 'Coche y moto',
    en: 'Car Accessories',
    seeds: ['car accessories'],
    match: wordBoundary('car|cars|coche|auto|automotive|vehicle|veh[ií]culo|dashboard|salpicadero|steering|volante|carplay|moto|motorcycle'),
  },
  {
    key: 'electronics_gadgets',
    es: 'Gadgets y tecnología',
    en: 'Gadgets & Tech',
    seeds: ['phone accessories', 'smart gadget'],
    match: wordBoundary(
      'gadget|gadgets|tech|wireless|inal[aá]mbrico|charger|cargador|phone|m[oó]vil|bluetooth|speaker|altavoz|earbuds|auriculares|projector|proyector|camera|c[aá]mara|smart|usb|power\\s*bank',
    ),
  },
  {
    key: 'lighting',
    es: 'Iluminación',
    en: 'Lighting',
    seeds: ['led lamp'],
    match: wordBoundary('led|lamp|l[aá]mpara|light|lights|luz|luces|night\\s*light|sunset\\s*lamp|neon'),
  },
  {
    key: 'outdoor_garden',
    es: 'Jardín y aire libre',
    en: 'Outdoor & Garden',
    seeds: ['camping gear', 'garden tool'],
    match: wordBoundary('garden|jard[ií]n|plant|plantas?|outdoor|aire\\s+libre|camping|hiking|senderismo|fishing|pesca|bbq|barbacoa|pool|piscina'),
  },
  {
    key: 'fashion_accessories',
    es: 'Moda y accesorios',
    en: 'Fashion & Accessories',
    seeds: ['jewelry', 'bag'],
    match: wordBoundary('jewelry|joyer[ií]a|necklace|collar|bracelet|pulsera|ring|anillo|earrings?|pendientes|bag|bolso|wallet|cartera|watch|reloj|sunglasses|gafas|hat|gorra|scarf|bufanda'),
  },
  {
    key: 'office',
    es: 'Oficina y escritorio',
    en: 'Office & Desk',
    seeds: ['desk accessories'],
    match: wordBoundary('desk|escritorio|office|oficina|laptop\\s+stand|monitor|keyboard|teclado|mouse\\s*pad|alfombrilla|stationery|papeler[ií]a|notebook|planner'),
  },
  {
    key: 'travel',
    es: 'Viaje',
    en: 'Travel',
    seeds: ['travel accessories'],
    match: wordBoundary('travel|viaje|luggage|maleta|suitcase|backpack|mochila|neck\\s+pillow|almohada\\s+de\\s+viaje|packing\\s+cubes'),
  },
];

export const OTHER_CATEGORY = { key: 'other', es: 'Otros', en: 'Other' };

const SPANISH_MARKETS = new Set(['ES', 'MX']);

export function categoryLabel(key: string, market: string): string {
  const cat = DISCOVERY_CATEGORIES.find((c) => c.key === key) ?? OTHER_CATEGORY;
  return SPANISH_MARKETS.has(market.toUpperCase()) ? cat.es : cat.en;
}

export function categoryLabelsForMarket(market: string): string[] {
  return DISCOVERY_CATEGORIES.map((c) => categoryLabel(c.key, market));
}

/**
 * Best category for a product: title hits weigh 3, store product_type 2,
 * each AI tag / seed 1. Ties keep list order (more specific verticals first).
 */
export function categorize(input: {
  title: string;
  tags?: string[];
  productType?: string | null;
  seeds?: string[];
}): string {
  let best: { key: string; score: number } | null = null;
  for (const cat of DISCOVERY_CATEGORIES) {
    let score = 0;
    const flags = cat.match.flags.includes('g') ? cat.match.flags : `${cat.match.flags}g`;
    score += 3 * (input.title.match(new RegExp(cat.match.source, flags))?.length ?? 0);
    if (input.productType && cat.match.test(input.productType)) score += 2;
    for (const t of input.tags ?? []) if (cat.match.test(t.replace(/^#/, ''))) score += 1;
    for (const s of input.seeds ?? []) if (cat.seeds.includes(s)) score += 1;
    if (score > 0 && (!best || score > best.score)) best = { key: cat.key, score };
  }
  return best?.key ?? OTHER_CATEGORY.key;
}

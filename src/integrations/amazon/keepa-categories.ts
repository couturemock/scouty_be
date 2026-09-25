/**
 * Dropshipping-valid Keepa browse nodes (never category=0 / Amazon all-departments).
 * Canonical keys are stable; labels are local. Missing marketplace nodes are omitted.
 *
 * IDs: Keepa-proven nodes already in production stay; new nodes from Amazon browse trees
 * (browsenodes.com). Invalid IDs are skipped at ingest with a warning.
 *
 * `CANONICAL_CATEGORY_KEYS` is the full reference set (kept for typing/backward
 * compatibility and as a denylist cross-check — e.g. `health` matters for catching
 * stray medical items even though it's not an ingest priority). Only
 * `PRIORITY_CATEGORY_KEYS` is actually swept at ingest time — see
 * `keepaCategoriesForMarket()`. Big-brand-electronics/computers/clothing/jewelry/
 * watches were dropped as ingest priorities (Drop Sniper is dropshipping-focused,
 * not general Amazon bestsellers) but keys stay typed in case they're needed again.
 *
 * `home_decor`, `storage_organization` and `hobbies_crafts` are priority categories
 * from the product spec that have NO confirmed Keepa browse-node id yet in any
 * market — Amazon nests these under home_kitchen's own sub-tree rather than
 * exposing a distinct top-level bestseller node. They stay in the type as
 * documented gaps (omitted from every market in BY_MARKET) pending research;
 * until then, matching products can only be recovered client-side via each
 * product's own `categoryTree` breadcrumb, not via bestseller-list discovery.
 */

export const CANONICAL_CATEGORY_KEYS = [
  'electronics',
  'computers',
  'home_kitchen',
  'beauty',
  'health',
  'sports',
  'pets',
  'toys',
  'clothing',
  'shoes',
  'accessories',
  'garden',
  'diy',
  'automotive',
  'office',
  'jewelry',
  'watches',
  'luggage',
  'lighting',
  'home_decor',
  'storage_organization',
  'hobbies_crafts',
] as const;

export type CanonicalCategoryKey = (typeof CANONICAL_CATEGORY_KEYS)[number];

/**
 * Priority categories actually used to drive ingest (Drop Sniper's dropshipping
 * focus): home, kitchen, beauty tools/devices, pets accessories, sports/fitness
 * accessories, car accessories, garden, DIY, office, travel (luggage), lighting,
 * toys/hobby-adjacent generic gadgets. `health` is intentionally excluded here
 * (stays only as a denylist cross-check) — big-brand electronics/computers/
 * clothing/shoes/jewelry/watches/accessories are excluded entirely.
 */
export const PRIORITY_CATEGORY_KEYS = [
  'home_kitchen',
  'beauty',
  'pets',
  'sports',
  'automotive',
  'garden',
  'diy',
  'office',
  'luggage',
  'lighting',
  'toys',
] as const satisfies readonly CanonicalCategoryKey[];

export type KeepaCategoryNode = {
  id: number;
  label: string;
  key: CanonicalCategoryKey;
};

type MarketCats = Partial<
  Record<CanonicalCategoryKey, { id: number; label: string }>
>;

const BY_MARKET: Record<string, MarketCats> = {
  ES: {
    electronics: { id: 599370031, label: 'Electrónica' },
    computers: { id: 667049031, label: 'Informática' },
    home_kitchen: { id: 599391031, label: 'Hogar y cocina' },
    beauty: { id: 6198054031, label: 'Belleza' },
    health: { id: 3677431031, label: 'Salud y cuidado personal' },
    sports: { id: 2454136031, label: 'Deportes y aire libre' },
    pets: { id: 6198072031, label: 'Productos para mascotas' },
    toys: { id: 599386031, label: 'Juguetes y juegos' },
    clothing: { id: 2846221031, label: 'Ropa' },
    shoes: { id: 1571263031, label: 'Zapatos' },
    garden: { id: 6198082031, label: 'Jardín' },
    diy: { id: 2454134031, label: 'Bricolaje' },
    automotive: { id: 1951052031, label: 'Coche y moto' },
    office: { id: 3628729031, label: 'Oficina' },
    jewelry: { id: 2454127031, label: 'Joyería' },
    watches: { id: 599389031, label: 'Relojes' },
    luggage: { id: 2454130031, label: 'Equipaje' },
    lighting: { id: 3564290031, label: 'Iluminación' },
  },
  US: {
    electronics: { id: 172282, label: 'Electronics' },
    computers: { id: 541966, label: 'Computers' },
    home_kitchen: { id: 1055398, label: 'Home & Kitchen' },
    beauty: { id: 3760911, label: 'Beauty & Personal Care' },
    health: { id: 3760901, label: 'Health & Personal Care' },
    sports: { id: 3375251, label: 'Sports & Outdoors' },
    pets: { id: 2619533011, label: 'Pet Supplies' },
    toys: { id: 165795011, label: 'Toys & Games' },
    clothing: { id: 7147440011, label: 'Clothing' },
    shoes: { id: 679337011, label: 'Shoes' },
    accessories: { id: 2474937011, label: 'Accessories' },
    garden: { id: 2617941011, label: 'Patio Lawn & Garden' },
    diy: { id: 228013, label: 'Tools & Home Improvement' },
    automotive: { id: 15690151, label: 'Automotive' },
    office: { id: 1084128, label: 'Office Products' },
    jewelry: { id: 7192394011, label: 'Jewelry' },
    watches: { id: 377110011, label: 'Watches' },
    luggage: { id: 9479199011, label: 'Luggage' },
    lighting: { id: 495224, label: 'Lighting' },
  },
  UK: {
    electronics: { id: 560798, label: 'Electronics & Photo' },
    computers: { id: 340831031, label: 'Computers & Accessories' },
    home_kitchen: { id: 11052591, label: 'Home & Kitchen' },
    beauty: { id: 117332031, label: 'Beauty' },
    health: { id: 65801031, label: 'Health & Personal Care' },
    sports: { id: 318949011, label: 'Sports & Outdoors' },
    pets: { id: 340840031, label: 'Pet Supplies' },
    toys: { id: 468292, label: 'Toys & Games' },
    clothing: { id: 83451031, label: 'Clothing' },
    shoes: { id: 1760249031, label: 'Shoes' },
    garden: { id: 314741013, label: 'Garden & Outdoors' },
    diy: { id: 79903031, label: 'DIY & Tools' },
    automotive: { id: 248877031, label: 'Car & Motorbike' },
    office: { id: 192413031, label: 'Stationery & Office' },
    jewelry: { id: 193716031, label: 'Jewellery' },
    watches: { id: 328229011, label: 'Watches' },
    luggage: { id: 2454160031, label: 'Luggage' },
    lighting: { id: 213077031, label: 'Lighting' },
  },
  MX: {
    electronics: { id: 9482650011, label: 'Electrónicos' },
    computers: { id: 9482630011, label: 'Computadoras' },
    home_kitchen: { id: 9482610011, label: 'Hogar y Cocina' },
    beauty: { id: 11260452011, label: 'Belleza' },
    health: { id: 17724509011, label: 'Salud y Cuidado Personal' },
    sports: { id: 9482590011, label: 'Deportes y Aire libre' },
    pets: { id: 11712336011, label: 'Mascotas' },
    toys: { id: 11260431011, label: 'Juguetes' },
    clothing: { id: 11260435011, label: 'Ropa' },
    shoes: { id: 11260436011, label: 'Zapatos' },
    garden: { id: 9482600011, label: 'Jardín' },
    diy: { id: 9482660011, label: 'Herramientas' },
    automotive: { id: 9482570011, label: 'Automotriz' },
    office: { id: 9482640011, label: 'Oficina' },
    jewelry: { id: 11260433011, label: 'Joyería' },
    watches: { id: 11260437011, label: 'Relojes' },
    luggage: { id: 11260432011, label: 'Equipaje' },
  },
  DE: {
    electronics: { id: 562066, label: 'Elektronik & Foto' },
    computers: { id: 340843031, label: 'Computer & Zubehör' },
    home_kitchen: { id: 3167641, label: 'Küche, Haushalt & Wohnen' },
    beauty: { id: 84230031, label: 'Beauty' },
    health: { id: 64187031, label: 'Drogerie & Körperpflege' },
    sports: { id: 16435121, label: 'Sport & Freizeit' },
    pets: { id: 340852031, label: 'Haustier' },
    toys: { id: 12950651, label: 'Spielzeug' },
    clothing: { id: 78689031, label: 'Bekleidung' },
    shoes: { id: 355531011, label: 'Schuhe' },
    garden: { id: 10925031, label: 'Garten' },
    diy: { id: 80084031, label: 'Baumarkt' },
    automotive: { id: 78191031, label: 'Auto & Motorrad' },
    office: { id: 192416031, label: 'Bürobedarf' },
    jewelry: { id: 327472011, label: 'Schmuck' },
    watches: { id: 193707031, label: 'Uhren' },
    luggage: { id: 2454119031, label: 'Koffer & Reisegepäck' },
    lighting: { id: 206398031, label: 'Beleuchtung' },
  },
  FR: {
    electronics: { id: 13921051, label: 'High-Tech' },
    computers: { id: 340858031, label: 'Informatique' },
    home_kitchen: { id: 57004031, label: 'Cuisine & Maison' },
    beauty: { id: 197858031, label: 'Beauté et Parfum' },
    health: { id: 197861031, label: 'Hygiène et Santé' },
    sports: { id: 325606031, label: 'Sports et Loisirs' },
    pets: { id: 1571265031, label: 'Animalerie' },
    toys: { id: 322086011, label: 'Jeux et Jouets' },
    clothing: { id: 340855031, label: 'Vêtements' },
    garden: { id: 355655011, label: 'Jardin' },
    diy: { id: 590748031, label: 'Bricolage' },
    automotive: { id: 1571268031, label: 'Auto et Moto' },
    office: { id: 192414031, label: 'Fournitures de bureau' },
    jewelry: { id: 193709031, label: 'Bijoux' },
    watches: { id: 193716031, label: 'Montres' },
    luggage: { id: 2454124031, label: 'Bagages' },
    lighting: { id: 213077031, label: 'Luminaires' },
  },
  IT: {
    electronics: { id: 412609031, label: 'Elettronica' },
    computers: { id: 425167031, label: 'Informatica' },
    home_kitchen: { id: 524015031, label: 'Casa e cucina' },
    beauty: { id: 6198092031, label: 'Bellezza' },
    health: { id: 1571280031, label: 'Salute e cura della persona' },
    sports: { id: 524012031, label: 'Sport e tempo libero' },
    pets: { id: 1571279031, label: 'Prodotti per animali' },
    toys: { id: 523997031, label: 'Giochi e giocattoli' },
    clothing: { id: 2844434031, label: 'Abbigliamento' },
    shoes: { id: 524006031, label: 'Scarpe' },
    garden: { id: 635016031, label: 'Giardino e giardinaggio' },
    diy: { id: 1571283031, label: 'Fai da te' },
    automotive: { id: 1571282031, label: 'Auto e moto' },
    office: { id: 1571284031, label: 'Cancelleria e prodotti per ufficio' },
    jewelry: { id: 2454130031, label: 'Gioielli' },
    watches: { id: 524009031, label: 'Orologi' },
    luggage: { id: 2454131031, label: 'Valigeria' },
    lighting: { id: 1571286031, label: 'Illuminazione' },
  },
};

export function keepaCategoriesForMarket(marketCode?: string): KeepaCategoryNode[] {
  const code = (marketCode ?? 'ES').toUpperCase();
  const map = BY_MARKET[code] ?? BY_MARKET.ES ?? {};
  const nodes: KeepaCategoryNode[] = [];
  for (const key of PRIORITY_CATEGORY_KEYS) {
    const node = map[key];
    if (node) nodes.push({ ...node, key });
  }
  return nodes;
}

export function keepaCategoryLabels(marketCode?: string): string[] {
  return keepaCategoriesForMarket(marketCode).map((c) => c.label);
}

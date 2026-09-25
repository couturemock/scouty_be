/**
 * Amazon ingest filters: skip consumables, big brands, generic junk, and
 * anything unsuitable for dropshipping (regulated/dangerous, medical,
 * likely-counterfeit, heavy/fragile-to-ship).
 * Applied after Keepa map, before supplier calls.
 */
import { BIG_BRANDS, wordBoundary } from '../shared/brand-denylist';

export { BIG_BRANDS };

const CONSUMABLE_TITLE = wordBoundary(
  'batter(?:y|ies)|pilas?|pañales?|diapers?|formula|leche\\s+en\\s+polvo|grocery|alimentaci[oó]n|snack|chips|cereal|coffee\\s+pods?|c[aá]psulas?\\s+de\\s+caf[eé]|vitaminas?|vitam[ií]nico|suplementos?|protein\\s+powder|comida\\s+para\\s+(perros?|gatos?)|dog\\s+food|cat\\s+food|wet\\s+food|litter|arena\\s+para\\s+gatos?',
);

/**
 * "Alimentación y bebidas" — beverages, incl. alcohol. Found live: a beer
 * pack ("Mahou Clásica, Cerveza Lager Dorada") sailed through ingest
 * because the old list only covered narrow specific consumables.
 */
const BEVERAGE_TITLE = wordBoundary(
  'bebidas?|beverage|cerveza(?:s)?|beer|vino(?:s)?|wine|licor(?:es)?|liquor|whisky|whiskey|vodka|ron\\b|rum\\b|ginebra|gin\\b|tequila|refresco(?:s)?|soda|zumo(?:s)?|jugo(?:s)?|juice',
);

const GENERIC_JUNK = wordBoundary(
  'usb[- ]?c?\\s*cable|cable\\s+usb|phone\\s+case|funda\\s+(?:para\\s+)?(?:m[oó]vil|iphone|samsung)|screen\\s+protector|protector\\s+de\\s+pantalla|hdmi\\s+cable|charging\\s+cable|cable\\s+de\\s+carga',
);

/** Category path / label denylist (ES + EN). */
const CONSUMABLE_CATEGORY = wordBoundary(
  'grocery|alimentaci[oó]n|despensa|baby|beb[eé]|pañal|diaper|battery|pilas?|bebidas?|beverage|health\\s*&\\s*personal\\s*care\\s*·\\s*vitamins|farmacia',
);

/** Weapons, ammunition and other regulated/dangerous items — never dropshippable. */
export const REGULATED_DANGEROUS = wordBoundary(
  'weapon|firearm|rifle|pistol|handgun|ammo|ammunition|munici[oó]n|arma(?:s)?\\s+de\\s+fuego|arma(?:s)?|cuchillo(?:s)?|knife|knives|machete|taser|stun\\s*gun|pepper\\s*spray|gas\\s*pimienta|firework|fuegos?\\s+artificiales|petardo|explosive|explosivo',
);

/** Medical devices / prescription-adjacent claims, beyond basic consumable food/vitamins. */
export const MEDICAL_SUPPLEMENT = wordBoundary(
  'blood\\s*pressure\\s*monitor|glucose\\s*monitor|glucometer|thermometer\\s*medical|term[oó]metro\\s*m[eé]dico|orthopedic|ortop[eé]dico|prescription|receta\\s*m[eé]dica|tratamiento\\s*m[eé]dico|medical\\s*device|dispositivo\\s*m[eé]dico|insulin|ins[uú]lina|hearing\\s*aid|aud[ií]fono\\s*m[eé]dico',
);

/**
 * Weak heuristic only — no authoritative counterfeit signal is available from
 * Keepa/supplier data. Flags obvious replica-marketing language, nothing more.
 */
export const COUNTERFEIT_SIGNAL = wordBoundary(
  'replica|r[eé]plica|fake|imitation|imitaci[oó]n|aaa\\s*quality|1:1\\s*(?:copy|quality)?',
);

/**
 * Keyword-only heuristic — no weight/dimension field exists anywhere in this
 * codebase's data model today (Keepa product mapping doesn't request/map
 * packageWeight/itemWeight/packageDimensions). Catches obvious
 * furniture/appliance/glass categories that are impractical to dropship.
 */
export const HEAVY_FRAGILE_KEYWORD = wordBoundary(
  'sofa|sof[aá]|mattress|colch[oó]n|refrigerator|nevera|frigor[ií]fico|washing\\s*machine|lavadora|wardrobe|armario\\s+ropero|glass\\s+table|mesa\\s+de\\s+cristal|treadmill|cinta\\s+de\\s+correr|piano|freezer|congelador|dishwasher|lavavajillas',
);

export type FilterReason =
  | 'brand'
  | 'consumable_title'
  | 'beverage'
  | 'consumable_category'
  | 'generic'
  | 'regulated_dangerous'
  | 'medical'
  | 'counterfeit'
  | 'heavy_fragile'
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
  if (REGULATED_DANGEROUS.test(title) || REGULATED_DANGEROUS.test(category))
    return 'regulated_dangerous';
  if (MEDICAL_SUPPLEMENT.test(title) || MEDICAL_SUPPLEMENT.test(category))
    return 'medical';
  if (CONSUMABLE_TITLE.test(title)) return 'consumable_title';
  if (BEVERAGE_TITLE.test(title)) return 'beverage';
  if (CONSUMABLE_CATEGORY.test(category)) return 'consumable_category';
  if (COUNTERFEIT_SIGNAL.test(title)) return 'counterfeit';
  if (HEAVY_FRAGILE_KEYWORD.test(title) || HEAVY_FRAGILE_KEYWORD.test(category))
    return 'heavy_fragile';
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

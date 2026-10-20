export type PlanId = 'basic' | 'pro';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /** Charged once per billing period. */
  priceEur: number;
  billingMonths: number;
  /** Analyses by URL or photo. */
  analysesPerMonth: number | null;
  /** Analyses by free-text product search. */
  searchesPerMonth: number | null;
  /** Ad analyses (Meta and TikTok creatives). */
  creativeIntelligencePerMonth: number | null;
  /** Products in the watchlist at once. */
  savedProductsLimit: number | null;
  /** null = unlimited rankings access */
  rankingsViewsLifetime: number | null;
  top10General: boolean;
  top10ByCategory: boolean;
  creativeProposal: boolean;
  features: string[];
}

/**
 * Básico y Pro comparten el TOP 10 completo. Básico tiene cupos mensuales
 * (análisis, búsquedas, anuncios) y un máximo de productos guardados; Pro no.
 */
export const PLANS: Record<PlanId, PlanDefinition> = {
  basic: {
    id: 'basic',
    name: 'Básico',
    priceEur: 59.99,
    billingMonths: 6,
    analysesPerMonth: 15,
    searchesPerMonth: 30,
    creativeIntelligencePerMonth: 20,
    savedProductsLimit: 20,
    rankingsViewsLifetime: null,
    top10General: true,
    top10ByCategory: true,
    creativeProposal: true,
    features: [
      'TOP 10 productos semanal completo',
      '15 análisis de productos al mes, por URL o imagen',
      '30 búsquedas de productos al mes',
      '20 análisis de anuncios de Meta y TikTok al mes',
      'Proveedores verificados incluidos en cada análisis',
      'Comparación de precios y envíos',
      'Calculadora de rentabilidad ilimitada',
      'Hasta 20 productos guardados',
      'Actualizaciones incluidas',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceEur: 99.99,
    billingMonths: 12,
    analysesPerMonth: null,
    searchesPerMonth: null,
    creativeIntelligencePerMonth: null,
    savedProductsLimit: null,
    rankingsViewsLifetime: null,
    top10General: true,
    top10ByCategory: true,
    creativeProposal: true,
    features: [
      'TOP 10 productos semanal completo',
      'Análisis de productos ilimitados, por URL o imagen',
      'Búsquedas de productos ilimitadas',
      'Análisis de anuncios de Meta y TikTok ilimitados',
      'Proveedores verificados ilimitados',
      'Comparación de precios y envíos',
      'Calculadora de rentabilidad ilimitada',
      'Productos guardados ilimitados',
      'Actualizaciones incluidas',
    ],
  },
};

export function planById(id: PlanId | string | null | undefined): PlanDefinition {
  if (id === 'pro') return PLANS.pro;
  return PLANS.basic;
}

export type PlanId = 'basic' | 'pro';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  monthlyEur: number;
  analysesPerMonth: number | null;
  creativeIntelligencePerMonth: number | null;
  /** null = unlimited rankings access */
  rankingsViewsLifetime: number | null;
  top10General: boolean;
  top10ByCategory: boolean;
  top10ByCountry: boolean;
  countrySelection: boolean;
  creativeProposal: boolean;
  features: string[];
}

/**
 * Básico y Pro son casi iguales (tops semanales, rankings, mercados, CI).
 * La diferencia principal: cupo de análisis por URL.
 */
export const PLANS: Record<PlanId, PlanDefinition> = {
  basic: {
    id: 'basic',
    name: 'Básico',
    monthlyEur: 39.99,
    analysesPerMonth: 5,
    creativeIntelligencePerMonth: null,
    rankingsViewsLifetime: null,
    top10General: true,
    top10ByCategory: true,
    top10ByCountry: true,
    countrySelection: true,
    creativeProposal: true,
    features: [
      'Tops semanales y rankings (general, en alza, margen, ganancia)',
      'Todos los marketplaces configurados',
      '5 análisis de producto por URL al mes',
      'Creative Intelligence',
      'Calculadora, watchlist y proveedores',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyEur: 59.99,
    analysesPerMonth: null,
    creativeIntelligencePerMonth: null,
    rankingsViewsLifetime: null,
    top10General: true,
    top10ByCategory: true,
    top10ByCountry: true,
    countrySelection: true,
    creativeProposal: true,
    features: [
      'Tops semanales y rankings (general, en alza, margen, ganancia)',
      'Todos los marketplaces configurados',
      'Análisis URL ilimitados',
      'Creative Intelligence',
      'Calculadora, watchlist y proveedores',
    ],
  },
};

export function planById(id: PlanId | string | null | undefined): PlanDefinition {
  if (id === 'pro') return PLANS.pro;
  return PLANS.basic;
}

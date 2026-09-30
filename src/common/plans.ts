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
 * Básico y Pro comparten el TOP 10 completo (ilimitado en ambos).
 * La diferencia: cupo de análisis de productos propios por URL/imagen
 * (20/mes en Básico, ilimitado en Pro).
 */
export const PLANS: Record<PlanId, PlanDefinition> = {
  basic: {
    id: 'basic',
    name: 'Básico',
    monthlyEur: 39.99,
    analysesPerMonth: 20,
    creativeIntelligencePerMonth: null,
    rankingsViewsLifetime: null,
    top10General: true,
    top10ByCategory: true,
    top10ByCountry: true,
    countrySelection: true,
    creativeProposal: true,
    features: [
      'Acceso completo al TOP 10 de cada país: ventas, precio, BSR, valoraciones y más',
      'Proveedores de AliExpress y Alibaba, con comparación de precios y envíos',
      'Anuncios y creatividades de TikTok y Meta del TOP 10',
      'Hasta 20 análisis de tus propios productos al mes, por URL o imagen',
      'Calculadora de rentabilidad y productos guardados',
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
      'Todo lo del plan Básico, pero ilimitado',
      'TOP 10 completo de cada país sin límites',
      'Análisis ilimitados de tus propios productos, por URL o imagen',
      'Proveedores, comparaciones de precios y anuncios ilimitados',
      'Calculadora de rentabilidad y productos guardados ilimitados',
    ],
  },
};

export function planById(id: PlanId | string | null | undefined): PlanDefinition {
  if (id === 'pro') return PLANS.pro;
  return PLANS.basic;
}

import { Injectable } from '@nestjs/common';

export interface CalculatorInput {
  salePrice: number;
  supplierCost: number;
  shipping: number;
  fees: number;
  otherCosts?: number;
}

@Injectable()
export class CalculatorService {
  compute(input: CalculatorInput) {
    const other = input.otherCosts ?? 0;
    const estimatedProfit =
      input.salePrice - input.supplierCost - input.shipping - input.fees - other;
    const marginPct =
      input.salePrice > 0 ? (estimatedProfit / input.salePrice) * 100 : 0;

    return {
      formula:
        'Beneficio estimado = precio de venta − coste proveedor − envío − comisiones − otros costes',
      inputs: { ...input, otherCosts: other },
      estimatedProfit: Number(estimatedProfit.toFixed(2)),
      marginPct: Number(marginPct.toFixed(2)),
      labels: {
        estimatedProfit: 'Beneficio estimado',
        marginPct: 'Margen estimado (%)',
      },
      notes: [
        'No se incluye CPA publicitario automático si no se conoce el CPA real.',
        'Las cifras son estimaciones operativas del usuario, no ventas reales.',
      ],
    };
  }
}

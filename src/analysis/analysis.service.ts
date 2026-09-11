import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreativeIntelligenceService } from '../creative/creative-intelligence.service';
import { KeepaAmazonProvider } from '../integrations/amazon/keepa.provider';
import { AlibabaSupplierProvider } from '../integrations/suppliers/alibaba.provider';
import { ProductsService } from '../products/products.service';
import { UsageService } from '../usage/usage.service';
import { User } from '../users/user.entity';
import { Analysis, AnalysisInputType } from './analysis.entity';

@Injectable()
export class AnalysisService {
  constructor(
    @InjectRepository(Analysis) private readonly analyses: Repository<Analysis>,
    private readonly usage: UsageService,
    private readonly products: ProductsService,
    private readonly amazon: KeepaAmazonProvider,
    private readonly suppliers: AlibabaSupplierProvider,
    private readonly ci: CreativeIntelligenceService,
  ) {}

  private extractTitle(input: string, type: AnalysisInputType) {
    if (type === 'url') {
      try {
        const url = new URL(input);
        const last = decodeURIComponent(
          url.pathname.split('/').filter(Boolean).pop() ?? '',
        );
        return last.replace(/[-_]/g, ' ').slice(0, 80) || 'Producto analizado';
      } catch {
        return input.slice(0, 80);
      }
    }
    if (type === 'photo') return 'Producto detectado por imagen';
    return input.slice(0, 80);
  }

  async analyze(
    user: User,
    input: { type: AnalysisInputType; value: string; findCheaper?: boolean },
  ) {
    await this.usage.assertAndIncrement(user, 'analysis');

    const titleHint = this.extractTitle(input.value, input.type);
    const market = user.targetMarket || 'ES';

    if (input.type === 'photo') {
      return {
        id: null,
        productId: null,
        identifiedAs: titleHint,
        message:
          'Análisis por imagen estará disponible próximamente. Usa enlace Amazon por ahora.',
        sources: { amazon: null },
        alternatives: [],
        profitability: null,
        creativeIntelligence: { ads: [], paused: true },
      };
    }

    const amazonSignal = await this.amazon
      .lookupByAsinOrUrl(input.value, market)
      .catch(() => null);

    let productId: string | null = null;
    let productTitle = titleHint;
    let savedProduct = null;

    if (amazonSignal) {
      const saved = await this.products.upsertFromSignals([amazonSignal]);
      productId = saved[0]?.id ?? null;
      productTitle = saved[0]?.title ?? titleHint;
      savedProduct = saved[0] ?? null;
    }

    const salePrice = amazonSignal?.price ?? 39.9;
    const supplierOffers = await this.suppliers.findRelated(
      productTitle,
      5,
      salePrice,
    );
    const cost = supplierOffers[0]?.unitPriceEur ?? 8;
    const shipping = supplierOffers[0]?.shippingEstimateEur ?? 2;
    const fees = salePrice * 0.15;
    const profit = salePrice - cost - shipping - fees;

    const cheaper =
      input.type === 'url' || input.findCheaper
        ? [...supplierOffers].sort(
            (a, b) => (a.unitPriceEur ?? 999) - (b.unitPriceEur ?? 999),
          )
        : supplierOffers;

    let creativeBlock;
    if (savedProduct) {
      const stored = this.ci.getStored(savedProduct);
      if (stored) {
        creativeBlock = {
          ads: stored.ads,
          provider: stored.provider,
          cached: true,
          disclaimer: stored.disclaimer,
        };
      }
    }
    if (!creativeBlock) {
      creativeBlock = await this.ci.fetchForAnalysis(
        productTitle,
        market,
        savedProduct,
      );
    }

    const result = {
      identifiedAs: productTitle,
      sources: {
        amazon: amazonSignal
          ? {
              ...amazonSignal,
              labels: {
                estimatedSales: 'Ventas estimadas',
                rank: 'Best Sellers Rank (BSR)',
              },
            }
          : null,
      },
      alternatives: cheaper,
      profitability: {
        formula:
          'Beneficio estimado = precio de venta − coste proveedor − envío − comisiones (15%)',
        salePrice,
        supplierCost: cost,
        shipping,
        fees,
        estimatedProfit: Number(profit.toFixed(2)),
        marginPct: Number(((profit / salePrice) * 100).toFixed(1)),
        labels: {
          estimatedProfit: 'Beneficio estimado',
          marginPct: 'Margen estimado',
        },
      },
      creativeIntelligence: creativeBlock,
    };

    const row = await this.analyses.save(
      this.analyses.create({
        userId: user.id,
        inputType: input.type,
        inputValue: input.value,
        productId,
        result,
      }),
    );

    return { id: row.id, productId, ...result };
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreativeIntelligenceService } from '../creative/creative-intelligence.service';
import { productQueryTokens } from '../integrations/ads/ad-engagement';
import { KeepaAmazonProvider } from '../integrations/amazon/keepa.provider';
import { SupabaseStorageProvider } from '../integrations/storage/supabase-storage.provider';
import { CommercialSignal, CreativeAd, SupplierOffer } from '../integrations/types';
import { SuppliersService } from '../integrations/suppliers/suppliers.service';
import { ProductsService } from '../products/products.service';
import { UsageService } from '../usage/usage.service';
import { User } from '../users/user.entity';
import { Analysis, AnalysisInputType } from './analysis.entity';

const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

@Injectable()
export class AnalysisService {
  constructor(
    @InjectRepository(Analysis) private readonly analyses: Repository<Analysis>,
    private readonly usage: UsageService,
    private readonly products: ProductsService,
    private readonly amazon: KeepaAmazonProvider,
    private readonly suppliers: SuppliersService,
    private readonly storage: SupabaseStorageProvider,
    private readonly ci: CreativeIntelligenceService,
  ) {}

  /** User history — newest first. Does not consume quota. */
  async listHistory(user: User, limit = 30) {
    const take = Math.min(Math.max(limit, 1), 100);
    const rows = await this.analyses.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      take,
    });

    return rows.map((row) => this.toHistoryItem(row));
  }

  /** Reopen a saved analysis (snapshot at run time). Does not consume quota. */
  async getById(user: User, id: string) {
    const row = await this.analyses.findOne({
      where: { id, userId: user.id },
    });
    if (!row) throw new NotFoundException('Análisis no encontrado');
    return this.toDetail(row);
  }

  private toHistoryItem(row: Analysis) {
    const result = row.result ?? {};
    const amazon = (result.sources as { amazon?: Record<string, unknown> } | undefined)
      ?.amazon;
    const identifiedAs =
      (typeof result.identifiedAs === 'string' && result.identifiedAs) ||
      row.inputValue?.slice(0, 80) ||
      'Análisis';
    const price =
      typeof amazon?.price === 'number' ? (amazon.price as number) : null;
    const imageUrl =
      typeof amazon?.imageUrl === 'string'
        ? (amazon.imageUrl as string)
        : null;
    const found = result.found !== false && Boolean(amazon || row.productId);

    return {
      id: row.id,
      createdAt: row.createdAt,
      inputType: row.inputType,
      inputValue: row.inputValue,
      productId: row.productId,
      identifiedAs,
      price,
      imageUrl,
      found,
      hasLiveSupplier: Array.isArray(result.alternatives)
        ? (result.alternatives as Array<{ kind?: string }>).some(
            (a) => a.kind === 'live',
          )
        : false,
    };
  }

  private toDetail(row: Analysis) {
    const result = row.result ?? {};
    return {
      id: row.id,
      productId: row.productId,
      createdAt: row.createdAt,
      inputType: row.inputType,
      inputValue: row.inputValue,
      identifiedAs:
        (typeof result.identifiedAs === 'string' && result.identifiedAs) ||
        'Producto analizado',
      message: typeof result.message === 'string' ? result.message : undefined,
      sources: result.sources ?? { amazon: null },
      alternatives: Array.isArray(result.alternatives) ? result.alternatives : [],
      profitability: result.profitability ?? null,
      creativeIntelligence: result.creativeIntelligence ?? {
        ads: [],
        paused: true,
      },
    };
  }

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

  private decodePhotoDataUri(value: string): { buffer: Buffer; contentType: string } {
    const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/.exec(value.trim());
    if (!match) {
      throw new BadRequestException(
        'Formato de imagen inválido. Se espera un data URI base64 (data:image/...;base64,...).',
      );
    }
    const [, contentType, base64] = match;
    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) throw new BadRequestException('Imagen vacía.');
    if (buffer.length > MAX_PHOTO_BYTES) {
      throw new BadRequestException('Imagen demasiado grande (máx 8MB).');
    }
    return { buffer, contentType };
  }

  /** Candidate supplier title -> Amazon search term. Keeps brand tokens
   * (unlike supplierSearchKeywords, which drops them for AE/Alibaba search) —
   * a brand name is exactly what makes a Keepa keyword search land on the
   * right product instead of a same-category competitor. */
  private amazonSearchTermFromCandidate(title: string, maxWords = 6): string {
    const tokens = productQueryTokens(title).slice(0, maxWords);
    return (tokens.length ? tokens.join(' ') : title).slice(0, 80);
  }

  /** Try each image-search candidate (already popularity-sorted) against
   * Keepa until one resolves to a real Amazon product. */
  private async identifyAmazonProductFromImage(
    imageMatches: SupplierOffer[],
    market: string,
  ): Promise<{ signal: CommercialSignal; candidateTitle: string } | null> {
    for (const candidate of imageMatches.slice(0, 3)) {
      const term = this.amazonSearchTermFromCandidate(candidate.name);
      if (!term) continue;
      const found = await this.amazon
        .searchByKeyword(term, market, 3)
        .catch(() => [] as CommercialSignal[]);
      if (found.length) {
        return { signal: found[0], candidateTitle: candidate.name };
      }
    }
    return null;
  }

  /** Drop invented creatives (fixture / search-only placeholders). */
  private realAdsOnly(ads: CreativeAd[] | undefined, provider?: string) {
    if (!ads?.length || provider === 'fixture') return [];
    return ads.filter((ad) => {
      const kind = String(ad.publicSignals?.linkKind ?? '');
      const plays = Number(ad.publicSignals?.playCount ?? 0);
      if (kind === 'search' && !(plays > 0)) return false;
      return true;
    });
  }

  async analyze(
    user: User,
    input: { type: AnalysisInputType; value: string; findCheaper?: boolean },
  ) {
    await this.usage.assertAndIncrement(user, 'analysis');

    let titleHint = this.extractTitle(input.value, input.type);
    const market = user.targetMarket || 'ES';

    let amazonSignal: CommercialSignal | null = null;
    let imageMatches: SupplierOffer[] = [];
    /** What we persist as inputValue — the base64 photo itself is too big/opaque to store. */
    let storedInputValue = input.value;

    if (input.type === 'photo') {
      const { buffer, contentType } = this.decodePhotoDataUri(input.value);
      const uploadedUrl = await this.storage
        .uploadPublic(buffer, contentType, `analysis/${user.id}`)
        .catch((err) => {
          throw new BadRequestException(
            `No pudimos subir la foto: ${err instanceof Error ? err.message : err}`,
          );
        });
      storedInputValue = uploadedUrl;

      imageMatches = await this.suppliers.identifyByImage(uploadedUrl, 5);
      const identified = await this.identifyAmazonProductFromImage(imageMatches, market);
      if (identified) {
        amazonSignal = identified.signal;
        titleHint = identified.candidateTitle;
      }
    } else {
      amazonSignal = await this.amazon
        .lookupByAsinOrUrl(input.value, market)
        .catch(() => null);
    }

    if (!amazonSignal) {
      const row = await this.analyses.save(
        this.analyses.create({
          userId: user.id,
          inputType: input.type,
          inputValue: storedInputValue,
          productId: null,
          result: {
            identifiedAs: titleHint,
            found: false,
            alternatives: imageMatches,
          },
        }),
      );
      return {
        id: row.id,
        productId: null,
        createdAt: row.createdAt,
        inputValue: row.inputValue,
        identifiedAs: titleHint,
        message:
          input.type === 'photo'
            ? imageMatches.length
              ? 'No lo identificamos en Amazon, pero esto es lo más parecido que encontramos por imagen en proveedores. Verificá bien antes de usarlo.'
              : 'No pudimos identificar el producto en la foto. Probá con una imagen más clara o de frente.'
            : 'No encontramos datos de Amazon/Keepa para esa URL. Revisá el enlace o el mercado del perfil.',
        sources: { amazon: null },
        alternatives: imageMatches,
        profitability: null,
        creativeIntelligence: { ads: [], paused: true, provider: null },
      };
    }

    let productId: string | null = null;
    let productTitle = amazonSignal.title || titleHint;
    let savedProduct = null;

    const saved = await this.products.upsertFromSignals([amazonSignal]);
    productId = saved[0]?.id ?? null;
    productTitle = saved[0]?.title ?? productTitle;
    savedProduct = saved[0] ?? null;

    const salePrice =
      amazonSignal.price != null && amazonSignal.price > 0
        ? amazonSignal.price
        : null;

    let supplierOffers: Awaited<
      ReturnType<SuppliersService['findRelated']>
    > = [];
    try {
      supplierOffers = await this.suppliers.findRelated(
        productTitle,
        6,
        salePrice ?? undefined,
        market,
        amazonSignal.imageUrl ?? savedProduct?.imageUrl,
      );
    } catch (err) {
      // Soft-fail: keep search-link UX if RapidAPI quota/network blows up
      supplierOffers = [];
    }
    const live = [...supplierOffers]
      .filter((s) => s.kind === 'live' && s.unitPriceEur != null)
      .sort((a, b) => (a.unitPriceEur ?? 0) - (b.unitPriceEur ?? 0))[0];

    const profitability =
      salePrice != null && live
        ? {
            available: true,
            salePrice,
            supplierCost: live.unitPriceEur!,
            shipping: live.shippingEstimateEur ?? 0,
            fees: Number((salePrice * 0.15).toFixed(2)),
            estimatedProfit: Number(
              (
                salePrice -
                live.unitPriceEur! -
                (live.shippingEstimateEur ?? 0) -
                salePrice * 0.15
              ).toFixed(2),
            ),
            marginPct: Number(
              (
                ((salePrice -
                  live.unitPriceEur! -
                  (live.shippingEstimateEur ?? 0) -
                  salePrice * 0.15) /
                  salePrice) *
                100
              ).toFixed(1),
            ),
            formula:
              'Beneficio = PVP Amazon − coste AliExpress − envío − comisiones (~15%)',
            basis:
              'Coste AliExpress (spike RapidAPI). Match por keyword — verificá el listing.',
            labels: {
              estimatedProfit: 'Beneficio estimado',
              marginPct: 'Margen estimado',
            },
          }
        : salePrice != null
          ? {
              available: false,
              salePrice,
              supplierCost: null,
              shipping: null,
              fees: Number((salePrice * 0.15).toFixed(2)),
              estimatedProfit: null,
              marginPct: null,
              formula:
                'Beneficio = PVP − coste proveedor − envío − comisiones (~15%)',
              basis: live
                ? 'Solo PVP Amazon. Margen oculto.'
                : 'Solo PVP Amazon (Keepa). Sin precio AliExpress live (falta ALIEXPRESS_RAPIDAPI_KEY o sin match).',
              labels: {
                estimatedProfit: 'Beneficio estimado',
                marginPct: 'Margen estimado',
              },
            }
          : null;

    let creativeBlock: {
      ads: CreativeAd[];
      provider?: string;
      cached?: boolean;
      disclaimer?: string;
      paused?: boolean;
      message?: string;
    } | null = null;

    if (savedProduct) {
      const stored = this.ci.getStored(savedProduct);
      if (stored) {
        const ads = this.realAdsOnly(stored.ads, stored.provider);
        creativeBlock = {
          ads,
          provider: stored.provider,
          cached: true,
          disclaimer: stored.disclaimer,
          paused: ads.length === 0,
          message:
            ads.length === 0
              ? 'Sin anuncios reales de PipiAds para este producto.'
              : undefined,
        };
      }
    }

    if (!creativeBlock) {
      const fetched = await this.ci.fetchForAnalysis(
        productTitle,
        market,
        savedProduct,
      );
      const ads = this.realAdsOnly(fetched.ads, fetched.provider);
      creativeBlock = {
        ads,
        provider: fetched.provider,
        cached: fetched.cached,
        disclaimer: fetched.disclaimer,
        paused: ads.length === 0,
        message:
          ads.length === 0
            ? 'Sin anuncios reales de PipiAds para este producto.'
            : undefined,
      };
    }

    const result = {
      identifiedAs: productTitle,
      sources: {
        amazon: {
          ...amazonSignal,
          labels: {
            estimatedSales: 'Ventas estimadas',
            rank: 'Best Sellers Rank (BSR)',
          },
        },
      },
      alternatives: supplierOffers,
      profitability,
      creativeIntelligence: creativeBlock,
    };

    const row = await this.analyses.save(
      this.analyses.create({
        userId: user.id,
        inputType: input.type,
        inputValue: storedInputValue,
        productId,
        result,
      }),
    );

    return {
      id: row.id,
      productId,
      createdAt: row.createdAt,
      inputValue: row.inputValue,
      ...result,
    };
  }
}

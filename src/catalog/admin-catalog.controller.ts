import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../common/decorators';
import { BUCKET_SHARES } from '../discovery/credit-budget';
import {
  MAX_PRODUCTS_TARGET,
  TrendDiscoveryService,
} from '../discovery/trend-discovery.service';
import { PipiAdsProvider } from '../integrations/pipiads/pipiads.provider';
import { SuppliersService } from '../integrations/suppliers/suppliers.service';
import { IngestionQueueService } from '../jobs/ingestion-queue.service';
import { ProductsService } from '../products/products.service';
import { User } from '../users/user.entity';
import { CatalogService } from './catalog.service';
import { PublishCatalogDto } from './dto/publish-catalog.dto';

@Controller('admin/catalog')
@UseGuards(AdminGuard)
export class AdminCatalogController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly products: ProductsService,
    private readonly pipiads: PipiAdsProvider,
    private readonly suppliers: SuppliersService,
    private readonly discovery: TrendDiscoveryService,
    private readonly ingestQueue: IngestionQueueService,
  ) {}

  @Get('status')
  async status() {
    const state = await this.catalog.status();
    const pipiads = await this.pipiads.getStatus();
    const publishedCount = state.publishedWeekKey
      ? await this.products.countForWeek(state.publishedWeekKey)
      : 0;
    const draftCount = state.draftWeekKey
      ? await this.products.countForWeek(state.draftWeekKey)
      : 0;
    return {
      ...state,
      pipiads,
      suppliers: this.suppliers.status(),
      defaults: {
        productsTarget: this.discovery.productsTarget(),
        maxProductsTarget: MAX_PRODUCTS_TARGET,
        creditBudget: this.discovery.creditBudget(),
        regions: this.discovery.regions(),
        shipTo: this.discovery.shipTo(),
        creditShares: BUCKET_SHARES,
      },
      publishedCount,
      draftCount,
    };
  }

  /** Historial de snapshots, más reciente primero. */
  @Get('snapshots')
  snapshots() {
    return this.catalog.listSnapshots();
  }

  /**
   * Encola el snapshot semanal (PipiAds → filtro dropshipping → tienda →
   * CJ/AliExpress) → borrador; corre en el worker de background
   * (Redis/BullMQ), no bloquea esta request. Seguí el progreso con
   * GET ingest-status.
   * Query: productsTarget (productos del snapshot, máx. 200),
   * creditBudget (créditos PipiAds del run).
   */
  @Post('ingest')
  async ingest(
    @Query('productsTarget') productsTarget?: string,
    @Query('creditBudget') creditBudget?: string,
  ) {
    const target = productsTarget ? Number(productsTarget) : undefined;
    const budget = creditBudget ? Number(creditBudget) : undefined;
    const { jobId, alreadyRunning } = await this.ingestQueue.enqueue({
      productsTarget:
        target != null && Number.isFinite(target) && target > 0
          ? Math.min(Math.floor(target), MAX_PRODUCTS_TARGET)
          : undefined,
      creditBudget:
        budget != null && Number.isFinite(budget) && budget > 0
          ? Math.floor(budget)
          : undefined,
    });
    return {
      queued: true,
      jobId,
      alreadyRunning,
      message: alreadyRunning
        ? 'Ya hay una ingesta en curso — se está siguiendo esa.'
        : 'Ingesta encolada. Corre en segundo plano; seguí el progreso en esta misma pantalla.',
    };
  }

  /** Progreso de la ingesta en curso (si hay una corriendo en el worker). */
  @Get('ingest-status')
  ingestStatus() {
    return this.ingestQueue.status();
  }

  /** Publica el borrador (o weekKey indicado) como catálogo activo en la web. */
  @Post('publish')
  async publish(@CurrentUser() user: User, @Body() body: PublishCatalogDto) {
    const state = await this.catalog.publish(body.weekKey, user.email);
    return {
      ok: true,
      publishedWeekKey: state.publishedWeekKey,
      message:
        'Snapshot publicado. Los usuarios con suscripción activa verán este catálogo.',
    };
  }

  /** Vista previa del borrador antes de publicar. */
  @Get('preview')
  preview(@Query('limit') limit?: string) {
    return this.products.listBestsellers(limit ? Number(limit) : 20, 'draft');
  }
}

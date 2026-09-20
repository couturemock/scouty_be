import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminGuard } from '../auth/admin.guard';
import { CurrentUser } from '../common/decorators';
import { KeepaAmazonProvider } from '../integrations/amazon/keepa.provider';
import { PipiAdsProvider } from '../integrations/pipiads/pipiads.provider';
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
    private readonly keepa: KeepaAmazonProvider,
    private readonly pipiads: PipiAdsProvider,
    private readonly config: ConfigService,
    private readonly ingestQueue: IngestionQueueService,
  ) {}

  @Get('status')
  async status() {
    const state = await this.catalog.status();
    const [keepa, pipiads] = await Promise.all([
      this.keepa.getStatus(),
      this.pipiads.getStatus(),
    ]);
    const publishedCount = state.publishedWeekKey
      ? await this.products.countForWeek(state.publishedWeekKey)
      : 0;
    const draftCount = state.draftWeekKey
      ? await this.products.countForWeek(state.draftWeekKey)
      : 0;
    return {
      ...state,
      keepa,
      pipiads,
      defaults: {
        productsPerCategory: Number(
          this.config.get('KEEPA_PRODUCTS_PER_CATEGORY') ?? 15,
        ),
        ciTopN: Number(this.config.get('CI_SNAPSHOT_TOP_N') ?? 30),
        markets: keepa.markets ?? [],
      },
      publishedCount,
      draftCount,
    };
  }

  /** Historial de snapshots, más reciente primero. */
  @Get('snapshots')
  async snapshots() {
    const rows = await this.catalog.listSnapshots();
    const withAdWinners = await this.products.weekKeysWithAdWinners(
      rows.map((r) => r.weekKey),
    );
    return rows.map((row) => ({
      ...row,
      hasAdWinners: withAdWinners.has(row.weekKey),
    }));
  }

  /**
   * Reintenta solo Ad Winners (PipiAds → Ad Score) para un weekKey ya
   * ingerido, sin repetir Keepa/CI. Si no se pasan markets, usa los de ese
   * snapshot.
   */
  @Post('rerun-ad-winners')
  async rerunAdWinners(
    @Query('weekKey') weekKey: string,
    @Query('markets') markets?: string,
  ) {
    const explicit = markets
      ?.split(',')
      .map((m) => m.trim().toUpperCase())
      .filter(Boolean);
    let list = explicit ?? [];
    if (!list.length) {
      const rows = await this.catalog.listSnapshots();
      list = rows.find((r) => r.weekKey === weekKey)?.markets ?? [];
    }
    return this.products.rerunAdWinners(weekKey, list);
  }

  /**
   * Encola una ingesta Keepa → borrador; corre en el worker de background
   * (Redis/BullMQ), no bloquea esta request. Seguí el progreso con
   * GET ingest-status.
   * Query: markets, productsPerCategory (ASINs por categoría Keepa), ciTopN (CI PipiAds).
   */
  @Post('ingest')
  async ingest(
    @Query('markets') markets?: string,
    @Query('productsPerCategory') productsPerCategory?: string,
    @Query('ciTopN') ciTopN?: string,
  ) {
    const list = markets
      ?.split(',')
      .map((m) => m.trim().toUpperCase())
      .filter(Boolean);
    const perCat = productsPerCategory ? Number(productsPerCategory) : undefined;
    const topN = ciTopN ? Number(ciTopN) : undefined;
    const { jobId, alreadyRunning } = await this.ingestQueue.enqueue({
      markets: list,
      productsPerCategory:
        perCat != null && Number.isFinite(perCat) ? perCat : undefined,
      ciTopN: topN != null && Number.isFinite(topN) ? topN : undefined,
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
  preview(
    @Query('market') market?: string,
    @Query('limit') limit?: string,
  ) {
    return this.products.listBestsellers(
      market,
      limit ? Number(limit) : 20,
      'draft',
    );
  }
}

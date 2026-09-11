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
  snapshots() {
    return this.catalog.listSnapshots();
  }

  /**
   * Ejecuta ingesta Keepa → borrador.
   * Query: markets, productsPerCategory (ASINs por categoría Keepa), ciTopN (CI PipiAds).
   */
  @Post('ingest')
  ingest(
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
    return this.products.runWeeklyIngestion(list, {
      productsPerCategory:
        perCat != null && Number.isFinite(perCat) ? perCat : undefined,
      ciTopN: topN != null && Number.isFinite(topN) ? topN : undefined,
    });
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

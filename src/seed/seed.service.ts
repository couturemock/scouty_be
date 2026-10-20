import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogService } from '../catalog/catalog.service';
import { Product } from '../products/product.entity';
import { ProductsService } from '../products/products.service';

/**
 * No auto-ingest on boot (gasta créditos PipiAds).
 * Si la DB está vacía y PipiAds está off, carga fixtures y publica automáticamente.
 * Con PipiAds on, el admin llama POST /api/admin/catalog/ingest y luego /publish.
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly products: ProductsService,
    private readonly catalog: CatalogService,
    @InjectRepository(Product) private readonly productRepo: Repository<Product>,
  ) {}

  async onModuleInit() {
    const state = await this.catalog.getState();
    if (state.publishedWeekKey) {
      const count = await this.productRepo.count({
        where: { catalogWeekKey: state.publishedWeekKey },
      });
      this.logger.log(`Catálogo publicado ${state.publishedWeekKey}: ${count} productos`);
      return;
    }

    const count = await this.productRepo.count();
    if (count > 0) {
      this.logger.log(
        `Hay ${count} productos sin publicar. Admin: POST /api/admin/catalog/publish`,
      );
      return;
    }

    if (this.products.discoveryEnabled()) {
      this.logger.log(
        'DB vacía + PipiAds activo. Admin: POST /api/admin/catalog/ingest?markets=ES&productsTarget=50',
      );
      return;
    }
    this.logger.log('Seeding fixtures (PipiAds desactivado) + auto-publish');
    const result = await this.products.seedFixtures();
    await this.catalog.publish(result.weekKey, 'seed@system');
  }
}

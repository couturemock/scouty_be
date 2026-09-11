import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { CreativeModule } from '../creative/creative.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { RankingEntry } from '../rankings/ranking-entry.entity';
import { ProductSnapshot } from '../snapshots/product-snapshot.entity';
import { Product } from './product.entity';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductSnapshot, RankingEntry]),
    IntegrationsModule,
    forwardRef(() => CatalogModule),
    forwardRef(() => CreativeModule),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

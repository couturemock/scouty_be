import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { Product } from '../products/product.entity';
import { ProductsModule } from '../products/products.module';
import { RankingEntry } from '../rankings/ranking-entry.entity';
import { UsageModule } from '../usage/usage.module';
import { AdWinnersService } from './ad-winners.service';
import { CreativeController } from './creative.controller';
import { CreativeIntelligenceService } from './creative-intelligence.service';
import { CreativeService } from './creative.service';

@Module({
  imports: [
    IntegrationsModule,
    UsageModule,
    TypeOrmModule.forFeature([Product, RankingEntry]),
    forwardRef(() => CatalogModule),
    forwardRef(() => ProductsModule),
  ],
  controllers: [CreativeController],
  providers: [CreativeService, CreativeIntelligenceService, AdWinnersService],
  exports: [CreativeIntelligenceService, CreativeService, AdWinnersService],
})
export class CreativeModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogModule } from '../catalog/catalog.module';
import { ProductsModule } from '../products/products.module';
import { UsageModule } from '../usage/usage.module';
import { RankingEntry } from './ranking-entry.entity';
import { RankingsController } from './rankings.controller';
import { RankingsService } from './rankings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([RankingEntry]),
    ProductsModule,
    CatalogModule,
    UsageModule,
  ],
  controllers: [RankingsController],
  providers: [RankingsService],
})
export class RankingsModule {}

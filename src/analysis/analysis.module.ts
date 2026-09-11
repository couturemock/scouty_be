import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreativeModule } from '../creative/creative.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { ProductsModule } from '../products/products.module';
import { UsageModule } from '../usage/usage.module';
import { Analysis } from './analysis.entity';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Analysis]),
    UsageModule,
    ProductsModule,
    IntegrationsModule,
    CreativeModule,
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService],
})
export class AnalysisModule {}

import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { WeeklyIngestionJob } from './weekly-ingestion.job';

@Module({
  imports: [ProductsModule],
  providers: [WeeklyIngestionJob],
})
export class JobsModule {}

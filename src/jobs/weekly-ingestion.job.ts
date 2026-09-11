import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ProductsService } from '../products/products.service';

@Injectable()
export class WeeklyIngestionJob {
  private readonly logger = new Logger(WeeklyIngestionJob.name);

  constructor(private readonly products: ProductsService) {}

  /** Every Monday 06:00 UTC */
  @Cron(CronExpression.EVERY_WEEK)
  async handle() {
    this.logger.log('Starting weekly product ingestion');
    const result = await this.products.runWeeklyIngestion();
    this.logger.log(`Weekly ingestion done: ${JSON.stringify(result)}`);
  }
}

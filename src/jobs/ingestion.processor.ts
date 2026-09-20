import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ProductsService } from '../products/products.service';
import { INGESTION_QUEUE } from '../queue/queue.constants';
import { IngestionJobData, IngestionJobResult } from './ingestion.types';

/** Worker-only — registered by WorkerModule, never by the web AppModule. */
@Processor(INGESTION_QUEUE, { concurrency: 1 })
export class IngestionProcessor extends WorkerHost {
  private readonly logger = new Logger(IngestionProcessor.name);

  constructor(private readonly products: ProductsService) {
    super();
  }

  async process(job: Job<IngestionJobData>): Promise<IngestionJobResult> {
    const { markets, productsPerCategory, ciTopN } = job.data ?? {};
    this.logger.log(
      `Ingestion job ${job.id} started markets=${markets?.join(',') ?? 'default'}`,
    );
    const result = await this.products.runWeeklyIngestion(markets, {
      productsPerCategory,
      ciTopN,
      onProgress: (progress) => {
        void job.updateProgress(progress);
      },
    });
    this.logger.log(
      `Ingestion job ${job.id} done weekKey=${result.weekKey} count=${result.count}`,
    );
    return { weekKey: result.weekKey, count: result.count };
  }
}

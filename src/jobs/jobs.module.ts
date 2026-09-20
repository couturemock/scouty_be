import { Module } from '@nestjs/common';
import { QueueModule } from '../queue/queue.module';
import { IngestionQueueService } from './ingestion-queue.service';

/**
 * Producer-facing only. The web process imports this to enqueue/read
 * ingestion jobs; the actual processing (IngestionProcessor) is wired up
 * only in WorkerModule, so the web process never runs an ingestion itself.
 */
@Module({
  imports: [QueueModule],
  providers: [IngestionQueueService],
  exports: [IngestionQueueService],
})
export class JobsModule {}

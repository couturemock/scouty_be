import { Module } from '@nestjs/common';
import { AppModule } from '../app.module';
import { ProductsModule } from '../products/products.module';
import { WaitlistModule } from '../waitlist/waitlist.module';
import { QueueModule } from '../queue/queue.module';
import { IngestionProcessor } from '../jobs/ingestion.processor';
import { WaitlistProcessor } from '../waitlist/waitlist.processor';

/**
 * Everything that actually PROCESSES a queued job lives here, not in
 * AppModule — so the web process (main.ts → AppModule) only ever enqueues
 * jobs, never picks them up. worker.ts boots this module standalone (no
 * HTTP listener); it shares the same Postgres/Redis and every other
 * provider via AppModule, plus the two `@Processor` workers.
 */
@Module({
  imports: [AppModule, ProductsModule, WaitlistModule, QueueModule],
  providers: [IngestionProcessor, WaitlistProcessor],
})
export class WorkerModule {}

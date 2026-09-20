import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { buildRedisConnection } from './redis-connection';
import { INGESTION_QUEUE, WAITLIST_QUEUE } from './queue.constants';

/**
 * Redis/BullMQ producers — safe to import from the web process (it only
 * enqueues/reads job state here, never processes). Actual processing lives
 * in `WorkerModule`, which only the worker entrypoint (`worker.ts`) loads.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: buildRedisConnection(config),
      }),
    }),
    BullModule.registerQueue(
      { name: INGESTION_QUEUE },
      { name: WAITLIST_QUEUE },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}

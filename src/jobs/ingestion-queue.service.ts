import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  INGESTION_JOB,
  INGESTION_QUEUE,
  WEEKLY_INGESTION_REPEAT_ID,
} from '../queue/queue.constants';
import { IngestionJobData, IngestionJobProgress } from './ingestion.types';

export type IngestionStatus =
  | { running: false }
  | {
      running: true;
      jobId: string;
      state: string;
      data: IngestionJobData;
      progress: IngestionJobProgress | null;
      startedAt: number | null;
      queuedAt: number | null;
    };

/**
 * Producer side — safe to inject from the web process. It only enqueues
 * jobs and reads their state from Redis; the actual ingestion runs in the
 * worker process (see `IngestionProcessor` / `worker.ts`).
 */
@Injectable()
export class IngestionQueueService implements OnModuleInit {
  private readonly logger = new Logger(IngestionQueueService.name);

  constructor(@InjectQueue(INGESTION_QUEUE) private readonly queue: Queue) {}

  /** Same schedule the old @Cron(EVERY_WEEK) used: Sunday 00:00 UTC. Idempotent — safe to call from every process on boot. */
  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      WEEKLY_INGESTION_REPEAT_ID,
      { pattern: '0 0 * * 0' },
      {
        name: INGESTION_JOB,
        data: {},
        opts: { removeOnComplete: { count: 20 }, removeOnFail: { count: 20 } },
      },
    );
  }

  /** Enqueues an ingestion run; refuses a second one while one is already active/queued. */
  async enqueue(
    data: IngestionJobData,
  ): Promise<{ jobId: string; alreadyRunning: boolean }> {
    const inFlight = await this.findInFlightJob();
    if (inFlight) {
      this.logger.warn(
        `Ingesta ya en curso (job ${inFlight.id}) — se ignora el nuevo pedido`,
      );
      return { jobId: String(inFlight.id), alreadyRunning: true };
    }
    const job = await this.queue.add(INGESTION_JOB, data, {
      removeOnComplete: { count: 20 },
      removeOnFail: { count: 20 },
    });
    return { jobId: String(job.id), alreadyRunning: false };
  }

  async status(): Promise<IngestionStatus> {
    const job = await this.findInFlightJob();
    if (!job) return { running: false };
    const state = await job.getState();
    // BullMQ defaults `job.progress` to the number 0 until the first
    // `updateProgress()` call — only trust it once it's our real payload.
    const progress =
      job.progress && typeof job.progress === 'object'
        ? (job.progress as IngestionJobProgress)
        : null;
    return {
      running: true,
      jobId: String(job.id),
      state,
      data: job.data as IngestionJobData,
      progress,
      startedAt: job.processedOn ?? null,
      queuedAt: job.timestamp ?? null,
    };
  }

  /**
   * Only `active`/`waiting` — NOT `delayed`. The weekly repeatable schedule
   * always has a "next occurrence" sitting as a delayed placeholder job in
   * BullMQ; including it here would make this permanently report "already
   * running" the moment the repeatable job is registered.
   */
  private async findInFlightJob() {
    const [active, waiting] = await Promise.all([
      this.queue.getActive(),
      this.queue.getWaiting(),
    ]);
    return (
      [...active, ...waiting].find((job) => job.name === INGESTION_JOB) ??
      null
    );
  }
}

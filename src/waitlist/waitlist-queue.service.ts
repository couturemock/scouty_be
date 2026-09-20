import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  WAITLIST_EXPIRE_JOB,
  WAITLIST_EXPIRE_REPEAT_ID,
  WAITLIST_QUEUE,
} from '../queue/queue.constants';

/**
 * Registers the "expire waitlist invites" cron as a BullMQ repeatable job —
 * same cadence the old @Cron(EVERY_10_MINUTES) used. Safe to call from every
 * process on boot: BullMQ dedupes by jobId, it won't double-schedule.
 * Processing itself happens in WaitlistProcessor (worker-only).
 */
@Injectable()
export class WaitlistQueueService implements OnModuleInit {
  constructor(@InjectQueue(WAITLIST_QUEUE) private readonly queue: Queue) {}

  async onModuleInit() {
    await this.queue.upsertJobScheduler(
      WAITLIST_EXPIRE_REPEAT_ID,
      { pattern: '0 */10 * * * *' },
      {
        name: WAITLIST_EXPIRE_JOB,
        data: {},
        opts: { removeOnComplete: { count: 20 }, removeOnFail: { count: 20 } },
      },
    );
  }
}

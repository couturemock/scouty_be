import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { WAITLIST_QUEUE } from '../queue/queue.constants';
import { WaitlistService } from './waitlist.service';

/** Worker-only — registered by WorkerModule, never by the web AppModule. */
@Processor(WAITLIST_QUEUE)
export class WaitlistProcessor extends WorkerHost {
  private readonly logger = new Logger(WaitlistProcessor.name);

  constructor(private readonly waitlist: WaitlistService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const result = await this.waitlist.processExpiredInvites();
    if (result.expired > 0) {
      this.logger.log(
        `Invites caducados: ${result.expired} · reasignados: ${result.reassigned}`,
      );
    }
  }
}

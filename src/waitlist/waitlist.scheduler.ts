import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WaitlistService } from './waitlist.service';

@Injectable()
export class WaitlistScheduler {
  private readonly logger = new Logger(WaitlistScheduler.name);

  constructor(private readonly waitlist: WaitlistService) {}

  @Cron(CronExpression.EVERY_10_MINUTES)
  async expireAndReassign() {
    const result = await this.waitlist.processExpiredInvites();
    if (result.expired > 0) {
      this.logger.log(
        `Invites caducados: ${result.expired} · reasignados: ${result.reassigned}`,
      );
    }
  }
}

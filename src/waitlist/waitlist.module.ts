import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminGuard } from '../auth/admin.guard';
import { AdminWaitlistController } from './admin-waitlist.controller';
import { WaitlistController } from './waitlist.controller';
import { WaitlistEntry } from './waitlist-entry.entity';
import { WaitlistScheduler } from './waitlist.scheduler';
import { WaitlistService } from './waitlist.service';
import { WaitlistSettings } from './waitlist-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WaitlistSettings, WaitlistEntry])],
  controllers: [WaitlistController, AdminWaitlistController],
  providers: [WaitlistService, WaitlistScheduler, AdminGuard],
  exports: [WaitlistService],
})
export class WaitlistModule implements OnModuleInit {
  constructor(private readonly waitlist: WaitlistService) {}

  async onModuleInit() {
    await this.waitlist.ensureSeed();
  }
}

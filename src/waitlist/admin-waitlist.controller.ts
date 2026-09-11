import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { ReleaseSeatsDto, UpdateSettingsDto } from './dto/waitlist.dto';
import { WaitlistService } from './waitlist.service';

@Controller('admin/waitlist')
@UseGuards(AdminGuard)
export class AdminWaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Get('summary')
  summary() {
    return this.waitlist.adminSummary();
  }

  @Patch('settings')
  settings(@Body() body: UpdateSettingsDto) {
    return this.waitlist.updateSettings(body);
  }

  @Get('entries')
  entries(@Query('status') status?: string) {
    return this.waitlist.listEntries(status);
  }

  @Post('release')
  release(@Body() body: ReleaseSeatsDto) {
    return this.waitlist.releaseSeats(body);
  }

  @Post('process-expired')
  processExpired() {
    return this.waitlist.processExpiredInvites();
  }
}

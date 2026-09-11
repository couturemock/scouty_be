import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Public } from '../common/decorators';
import { ReserveWaitlistDto } from './dto/waitlist.dto';
import { WaitlistService } from './waitlist.service';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlist: WaitlistService) {}

  @Public()
  @Get('campaign')
  status() {
    return this.waitlist.getPublicStatus();
  }

  @Public()
  @Get('invite/:token')
  invitePreview(@Param('token') token: string) {
    return this.waitlist.getInvitePreview(token);
  }

  @Public()
  @Post('reserve')
  reserve(@Body() body: ReserveWaitlistDto) {
    return this.waitlist.reserve(body);
  }
}

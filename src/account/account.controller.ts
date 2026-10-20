import { Controller, Get } from '@nestjs/common';
import { CurrentUser, Public } from '../common/decorators';
import { PLANS, planById } from '../common/plans';
import { UsageService } from '../usage/usage.service';
import { User } from '../users/user.entity';

@Controller('account')
export class AccountController {
  constructor(private readonly usage: UsageService) {}

  @Get()
  async account(@CurrentUser() user: User) {
    const counts = await this.usage.getCounts(user.id);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
      ...this.usage.summaryForUser(user, counts),
      planDetails: planById(user.plan),
    };
  }
}

@Controller('plans')
export class PlansController {
  @Public()
  @Get()
  list() {
    return {
      billing: 'monthly_only',
      plans: Object.values(PLANS),
    };
  }
}

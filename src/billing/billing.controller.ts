import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, Public } from '../common/decorators';
import { User } from '../users/user.entity';
import { BillingService } from './billing.service';

class PlanBody {
  @IsIn(['basic', 'pro'])
  plan!: 'basic' | 'pro';
}

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('checkout')
  checkout(@CurrentUser() user: User, @Body() body: PlanBody) {
    return this.billing.createCheckoutSession(user, body.plan);
  }

  @Post('portal')
  portal(@CurrentUser() user: User) {
    return this.billing.createPortalSession(user);
  }

  @Post('change-plan')
  changePlan(@CurrentUser() user: User, @Body() body: PlanBody) {
    return this.billing.changePlan(user, body.plan);
  }

  @Post('cancel')
  cancel(@CurrentUser() user: User) {
    return this.billing.cancelSubscription(user);
  }

  @Post('dev-activate')
  devActivate(@CurrentUser() user: User, @Body() body: PlanBody) {
    return this.billing.activateDevSubscription(user, body.plan);
  }

  @Public()
  @Post('webhook')
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const raw = req.rawBody;
    if (!raw) throw new Error('Raw body required for Stripe webhook');
    return this.billing.handleWebhook(raw, signature);
  }
}

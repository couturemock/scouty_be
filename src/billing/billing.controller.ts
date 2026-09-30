import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser, Public } from '../common/decorators';
import { User } from '../users/user.entity';
import { BillingService } from './billing.service';
import { SubscribeDto } from './dto/subscribe.dto';

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

  /**
   * Cobro embebido (tarjeta directa en la app, sin redirigir a Stripe
   * Checkout). Devuelve clientSecret cuando el pago requiere confirmación
   * (3DS/SCA); el front llama a `stripe.confirmCardPayment` y luego a
   * POST /billing/subscribe/sync.
   */
  @Post('subscribe')
  subscribe(
    @CurrentUser() user: User,
    @Body(ValidationPipe) body: SubscribeDto,
  ) {
    return this.billing.createSubscription(user, body.plan, body.paymentMethodId);
  }

  @Post('subscribe/sync')
  syncSubscription(@CurrentUser() user: User) {
    return this.billing.syncSubscriptionFromStripeForUser(user);
  }

  @Get('payment-methods')
  paymentMethods(@CurrentUser() user: User) {
    return this.billing.listPaymentMethods(user);
  }

  @Delete('payment-methods/:id')
  async deletePaymentMethod(@Param('id') id: string) {
    await this.billing.deletePaymentMethod(id);
    return { ok: true };
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

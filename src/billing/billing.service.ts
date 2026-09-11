import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { PlanId, PLANS } from '../common/plans';
import { User } from '../users/user.entity';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe | null = null;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) this.stripe = new Stripe(key);
  }

  private requireStripe() {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Stripe no está configurado. Añade STRIPE_SECRET_KEY en .env',
      );
    }
    return this.stripe;
  }

  private priceId(plan: PlanId) {
    const id =
      plan === 'pro'
        ? this.config.get<string>('STRIPE_PRICE_PRO')
        : this.config.get<string>('STRIPE_PRICE_BASIC');
    if (!id) {
      throw new ServiceUnavailableException(
        `Falta STRIPE_PRICE_${plan.toUpperCase()} en .env`,
      );
    }
    return id;
  }

  async createCheckoutSession(user: User, plan: PlanId) {
    const stripe = this.requireStripe();
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await this.users.save(user);
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: this.priceId(plan), quantity: 1 }],
      success_url: `${appUrl}/cuenta?checkout=success`,
      cancel_url: `${appUrl}/app?checkout=cancel`,
      metadata: { userId: user.id, plan },
      subscription_data: { metadata: { userId: user.id, plan } },
      allow_promotion_codes: true,
    });

    return { url: session.url, plan: PLANS[plan] };
  }

  async createPortalSession(user: User) {
    const stripe = this.requireStripe();
    if (!user.stripeCustomerId) {
      throw new BadRequestException('No hay cliente de facturación asociado');
    }
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${appUrl}/cuenta`,
    });
    return { url: session.url };
  }

  async changePlan(user: User, plan: PlanId) {
    const stripe = this.requireStripe();
    if (!user.stripeSubscriptionId) {
      return this.createCheckoutSession(user, plan);
    }

    const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    const itemId = sub.items.data[0]?.id;
    if (!itemId) throw new BadRequestException('Suscripción sin ítems');

    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      items: [{ id: itemId, price: this.priceId(plan) }],
      proration_behavior: 'create_prorations',
      metadata: { userId: user.id, plan },
      cancel_at_period_end: false,
    });

    user.plan = plan;
    user.cancelAtPeriodEnd = false;
    user.subscriptionStatus = 'active';
    await this.users.save(user);
    return { ok: true, plan: PLANS[plan] };
  }

  async cancelSubscription(user: User) {
    const stripe = this.requireStripe();
    if (!user.stripeSubscriptionId) {
      throw new BadRequestException('No hay suscripción activa');
    }
    await stripe.subscriptions.update(user.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });
    user.cancelAtPeriodEnd = true;
    await this.users.save(user);
    return {
      ok: true,
      accessUntil: user.currentPeriodEnd,
      message:
        'Cancelación programada. Conservarás el acceso hasta el final del periodo pagado.',
    };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const stripe = this.requireStripe();
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException('Falta STRIPE_WEBHOOK_SECRET');
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await this.applyCheckout(session);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.applySubscription(sub);
        break;
      }
      default:
        this.logger.debug(`Stripe event ignored: ${event.type}`);
    }

    return { received: true };
  }

  private async applyCheckout(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const plan = (session.metadata?.plan as PlanId) || 'basic';
    if (!userId) return;
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) return;

    user.plan = plan;
    user.subscriptionStatus = 'active';
    user.stripeCustomerId = String(session.customer ?? user.stripeCustomerId);
    user.stripeSubscriptionId = String(
      session.subscription ?? user.stripeSubscriptionId,
    );
    user.cancelAtPeriodEnd = false;
    await this.users.save(user);

    if (session.subscription) {
      const stripe = this.requireStripe();
      const sub = await stripe.subscriptions.retrieve(String(session.subscription));
      await this.applySubscription(sub);
    }
  }

  private async applySubscription(sub: Stripe.Subscription) {
    const userId = sub.metadata?.userId;
    let user: User | null = null;
    if (userId) {
      user = await this.users.findOne({ where: { id: userId } });
    }
    if (!user && sub.customer) {
      user = await this.users.findOne({
        where: { stripeCustomerId: String(sub.customer) },
      });
    }
    if (!user) return;

    const plan = (sub.metadata?.plan as PlanId) || user.plan || 'basic';
    user.plan = plan;
    user.stripeSubscriptionId = sub.id;
    user.cancelAtPeriodEnd = Boolean(sub.cancel_at_period_end);
    const periodEnd =
      (sub as Stripe.Subscription & { current_period_end?: number })
        .current_period_end ?? 0;
    user.currentPeriodEnd = periodEnd
      ? new Date(periodEnd * 1000)
      : user.currentPeriodEnd;

    if (sub.status === 'active' || sub.status === 'trialing') {
      user.subscriptionStatus = sub.status === 'trialing' ? 'trialing' : 'active';
    } else if (sub.status === 'past_due') {
      user.subscriptionStatus = 'past_due';
    } else if (sub.status === 'canceled') {
      // Access until period end if still in paid window
      if (user.currentPeriodEnd && user.currentPeriodEnd.getTime() > Date.now()) {
        user.subscriptionStatus = 'canceled';
        user.cancelAtPeriodEnd = true;
      } else {
        user.subscriptionStatus = 'none';
      }
    }

    await this.users.save(user);
  }

  /** Dev helper when Stripe is not configured */
  async activateDevSubscription(user: User, plan: PlanId) {
    if (this.stripe) {
      throw new BadRequestException('Usa checkout de Stripe en este entorno');
    }
    user.plan = plan;
    user.subscriptionStatus = 'active';
    user.currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.cancelAtPeriodEnd = false;
    await this.users.save(user);
    return {
      ok: true,
      mode: 'dev',
      plan: PLANS[plan],
      message: 'Suscripción de desarrollo activada (sin Stripe).',
    };
  }
}

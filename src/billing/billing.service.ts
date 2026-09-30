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

  private async getOrCreateCustomer(
    stripe: Stripe,
    user: User,
  ): Promise<string> {
    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: user.id },
    });

    user.stripeCustomerId = customer.id;
    await this.users.save(user);

    return customer.id;
  }

  async createCheckoutSession(user: User, plan: PlanId) {
    const stripe = this.requireStripe();
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const customerId = await this.getOrCreateCustomer(stripe, user);

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

  /**
   * Crea (o reactiva) una suscripción cobrando directamente con una tarjeta
   * ya tokenizada en el cliente (Stripe Elements), en vez de redirigir a
   * Stripe Checkout. `payment_behavior: default_incomplete` no lanza 402:
   * devuelve la suscripción con latest_invoice.payment_intent para que el
   * front resuelva 3DS/SCA con `stripe.confirmCardPayment`.
   */
  async createSubscription(
    user: User,
    plan: PlanId,
    paymentMethodId: string,
  ): Promise<{
    subscriptionId: string;
    clientSecret?: string;
    status: string;
  }> {
    const stripe = this.requireStripe();
    const priceId = this.priceId(plan);
    const customerId = await this.getOrCreateCustomer(stripe, user);

    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('already been attached')) {
        throw error;
      }
    }

    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    let subscription: Stripe.Subscription;
    try {
      subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: paymentMethodId,
        payment_behavior: 'default_incomplete',
        payment_settings: {
          payment_method_types: ['card'],
          save_default_payment_method: 'on_subscription',
        },
        expand: ['latest_invoice.payment_intent'],
        metadata: { userId: user.id, plan },
      });
    } catch (err: unknown) {
      subscription = await this.recoverIncompleteSubscription(
        stripe,
        err,
        customerId,
        user.id,
      );
    }

    const clientSecret = this.extractClientSecret(subscription);

    this.applyLocalSubscriptionState(user, plan, subscription);
    await this.users.save(user);

    return {
      subscriptionId: subscription.id,
      clientSecret: clientSecret ?? undefined,
      status: subscription.status,
    };
  }

  private extractClientSecret(subscription: Stripe.Subscription): string | null {
    const invoice = subscription.latest_invoice;
    if (!invoice || typeof invoice === 'string') return null;
    const paymentIntent = (
      invoice as Stripe.Invoice & { payment_intent?: string | Stripe.PaymentIntent | null }
    ).payment_intent;
    if (!paymentIntent || typeof paymentIntent === 'string') return null;
    return paymentIntent.client_secret ?? null;
  }

  /**
   * En algunas versiones de la API, `subscriptions.create` con
   * `default_incomplete` igual lanza `subscription_payment_intent_requires_action`
   * sin devolver la suscripción creada. Stripe sí la creó del lado suyo: la
   * recuperamos por el id que viene en el error, o si no, la más reciente en
   * estado incomplete de ese cliente para este plan.
   */
  private async recoverIncompleteSubscription(
    stripe: Stripe,
    err: unknown,
    customerId: string,
    userId: string,
  ): Promise<Stripe.Subscription> {
    const raw = (err as { raw?: Record<string, unknown>; code?: string })?.raw ?? {};
    const code = (err as { code?: string })?.code ?? (raw as { code?: string })?.code;
    if (code !== 'subscription_payment_intent_requires_action') {
      throw err;
    }

    const nested = (raw as { error?: Record<string, unknown> }).error;
    const payload = nested && typeof nested === 'object' ? nested : raw;
    const subRef = (payload as { subscription?: string | { id: string } })
      .subscription;
    let subscriptionId =
      typeof subRef === 'string' ? subRef : (subRef?.id ?? null);

    if (!subscriptionId) {
      const list = await stripe.subscriptions.list({
        customer: customerId,
        status: 'incomplete',
        limit: 10,
      });
      const match =
        list.data.find((s) => s.metadata?.userId === userId) ?? list.data[0];
      subscriptionId = match?.id ?? null;
    }

    if (!subscriptionId) {
      throw new BadRequestException(
        'El pago requiere confirmación adicional pero no se pudo continuar. Probá de nuevo o usá otra tarjeta.',
      );
    }

    return stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['latest_invoice.payment_intent'],
    });
  }

  private applyLocalSubscriptionState(
    user: User,
    plan: PlanId,
    subscription: Stripe.Subscription,
  ) {
    user.plan = plan;
    user.stripeSubscriptionId = subscription.id;
    user.cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
    user.subscriptionStatus =
      subscription.status === 'trialing'
        ? 'trialing'
        : subscription.status === 'active'
          ? 'active'
          : subscription.status === 'past_due'
            ? 'past_due'
            : user.subscriptionStatus;

    const periodEnd = (
      subscription as Stripe.Subscription & { current_period_end?: number }
    ).current_period_end;
    if (periodEnd) {
      user.currentPeriodEnd = new Date(periodEnd * 1000);
    }
  }

  /**
   * Tras `stripe.confirmCardPayment` en el cliente (3DS): releemos Stripe y
   * persistimos el estado real por si el webhook todavía no llegó.
   */
  async syncSubscriptionFromStripeForUser(user: User): Promise<{
    status: string;
    stripeSubscriptionId: string | null;
    currentPeriodEnd: string | null;
  }> {
    if (!user.stripeSubscriptionId) {
      throw new BadRequestException(
        'No hay suscripción Stripe asociada al usuario',
      );
    }
    const stripe = this.requireStripe();
    const subscription = await stripe.subscriptions.retrieve(
      user.stripeSubscriptionId,
    );
    await this.applySubscription(subscription);

    const updated = await this.users.findOne({ where: { id: user.id } });
    return {
      status: updated?.subscriptionStatus ?? user.subscriptionStatus,
      stripeSubscriptionId: user.stripeSubscriptionId,
      currentPeriodEnd: updated?.currentPeriodEnd?.toISOString() ?? null,
    };
  }

  async listPaymentMethods(user: User) {
    const stripe = this.requireStripe();
    if (!user.stripeCustomerId) return [];

    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.stripeCustomerId,
      type: 'card',
    });

    return paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      expMonth: pm.card?.exp_month,
      expYear: pm.card?.exp_year,
    }));
  }

  async deletePaymentMethod(paymentMethodId: string) {
    const stripe = this.requireStripe();
    await stripe.paymentMethods.detach(paymentMethodId);
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
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await this.applySubscription(sub);
        break;
      }
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = this.extractSubscriptionIdFromInvoice(invoice);
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await this.applySubscription(sub);
        }
        break;
      }
      default:
        this.logger.debug(`Stripe event ignored: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * En algunas versiones recientes de la API, `invoice.subscription` no
   * viene en el nivel superior; hay que buscarlo en las líneas del invoice.
   */
  private extractSubscriptionIdFromInvoice(
    invoice: Stripe.Invoice,
  ): string | null {
    const inv = invoice as unknown as Record<string, unknown>;
    const top = inv.subscription as string | { id?: string } | null | undefined;
    if (typeof top === 'string') return top;
    if (top && typeof top === 'object' && typeof top.id === 'string') {
      return top.id;
    }

    const lines = inv.lines as { data?: Array<Record<string, unknown>> } | undefined;
    for (const line of lines?.data ?? []) {
      const ls = line.subscription as string | { id?: string } | null | undefined;
      if (typeof ls === 'string') return ls;
      if (ls && typeof ls === 'object' && typeof ls.id === 'string') return ls.id;
    }

    return null;
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
    if (!user) {
      user = await this.users.findOne({
        where: { stripeSubscriptionId: sub.id },
      });
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

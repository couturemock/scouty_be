import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { PlanId } from '../common/plans';
import { User } from '../users/user.entity';

/**
 * Crea usuarios de prueba en desarrollo (login email + password).
 * Idempotente: actualiza password y flags si ya existen.
 */
@Injectable()
export class DevUsersSeedService implements OnModuleInit {
  private readonly logger = new Logger(DevUsersSeedService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async onModuleInit() {
    const enabled =
      this.config.get<string>('SEED_DEV_USERS', 'true') === 'true';
    if (!enabled) return;

    if (this.config.get<string>('NODE_ENV') === 'production') {
      this.logger.warn('SEED_DEV_USERS ignorado en production');
      return;
    }

    const adminEmail = (
      this.config.get<string>('DEV_ADMIN_EMAIL') ?? 'admin@scoutly.dev'
    ).toLowerCase();
    const adminPassword =
      this.config.get<string>('DEV_ADMIN_PASSWORD') ?? 'Admin123!';
    const userEmail = (
      this.config.get<string>('DEV_USER_EMAIL') ?? 'user@scoutly.dev'
    ).toLowerCase();
    const userPassword =
      this.config.get<string>('DEV_USER_PASSWORD') ?? 'User123!';
    const userPlan = (this.config.get<string>('DEV_USER_PLAN') ??
      'pro') as PlanId;

    await this.upsertUser({
      email: adminEmail,
      password: adminPassword,
      name: 'Admin Scout-ly',
      plan: 'pro',
      isAdmin: true,
      subscriptionStatus: 'active',
    });

    await this.upsertUser({
      email: userEmail,
      password: userPassword,
      name: 'Usuario Pro',
      plan: userPlan,
      isAdmin: false,
      subscriptionStatus: 'active',
    });

    this.logger.log(
      `Usuarios dev listos → admin: ${adminEmail} · user: ${userEmail} (${userPlan}, activo)`,
    );
  }

  private async upsertUser(opts: {
    email: string;
    password: string;
    name: string;
    plan: PlanId;
    isAdmin: boolean;
    subscriptionStatus: User['subscriptionStatus'];
  }) {
    let user = await this.users.findOne({ where: { email: opts.email } });
    const passwordHash = await bcrypt.hash(opts.password, 10);
    const periodEnd = new Date();
    periodEnd.setDate(periodEnd.getDate() + 30);

    if (!user) {
      user = this.users.create({
        email: opts.email,
        name: opts.name,
        passwordHash,
        plan: opts.plan,
        isAdmin: opts.isAdmin,
        emailVerified: true,
        subscriptionStatus: opts.subscriptionStatus,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        targetMarket: 'ES',
      });
    } else {
      user.passwordHash = passwordHash;
      user.name = opts.name;
      user.plan = opts.plan;
      user.isAdmin = opts.isAdmin;
      user.emailVerified = true;
      user.subscriptionStatus = opts.subscriptionStatus;
      user.currentPeriodEnd = periodEnd;
      user.cancelAtPeriodEnd = false;
    }

    await this.users.save(user);
  }
}

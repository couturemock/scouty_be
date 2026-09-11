import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { planById } from '../common/plans';
import { currentPeriodKey } from '../common/week';
import { User } from '../users/user.entity';
import { UsageCounter, UsageKind } from './usage-counter.entity';

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(UsageCounter)
    private readonly usageRepo: Repository<UsageCounter>,
  ) {}

  async getCounts(userId: string, periodKey = currentPeriodKey()) {
    const rows = await this.usageRepo.find({ where: { userId, periodKey } });
    const analysis = rows.find((r) => r.kind === 'analysis')?.count ?? 0;
    const creative =
      rows.find((r) => r.kind === 'creative_intelligence')?.count ?? 0;
    const rankingsLifetime =
      (
        await this.usageRepo.findOne({
          where: { userId, kind: 'rankings_view', periodKey: 'lifetime' },
        })
      )?.count ?? 0;
    return {
      periodKey,
      analysis,
      creativeIntelligence: creative,
      rankingsViews: rankingsLifetime,
    };
  }

  private async getOrCreate(
    userId: string,
    kind: UsageKind,
    periodKey: string,
  ) {
    let counter = await this.usageRepo.findOne({
      where: { userId, kind, periodKey },
    });
    if (!counter) {
      counter = this.usageRepo.create({
        userId,
        kind,
        periodKey,
        count: 0,
      });
    }
    return counter;
  }

  async assertAndIncrement(user: User, kind: UsageKind) {
    const plan = planById(user.plan);
    const limit =
      kind === 'analysis'
        ? plan.analysesPerMonth
        : kind === 'creative_intelligence'
          ? plan.creativeIntelligencePerMonth
          : plan.rankingsViewsLifetime;

    // Plan does not include this feature (e.g. CI on Basic = 0).
    if (limit === 0) {
      if (kind === 'creative_intelligence') {
        throw new ForbiddenException(
          'Creative Intelligence no está incluido en el plan Básico. Mejora a Pro.',
        );
      }
      throw new ForbiddenException('Esta función no está incluida en tu plan.');
    }

    const periodKey =
      kind === 'rankings_view' ? 'lifetime' : currentPeriodKey();
    const counter = await this.getOrCreate(user.id, kind, periodKey);

    if (limit !== null && counter.count >= limit) {
      if (kind === 'analysis') {
        throw new ForbiddenException(
          limit === 1
            ? 'Ya usaste tu análisis del plan Básico. Mejora a Pro para analizar sin límite.'
            : `Has alcanzado el límite de ${limit} análisis este mes. Mejora a Pro para análisis ilimitados.`,
        );
      }
      if (kind === 'rankings_view') {
        throw new ForbiddenException(
          'Has alcanzado el límite de vistas de rankings de tu plan.',
        );
      }
      throw new ForbiddenException(
        `Has alcanzado el límite de Creative Intelligence este mes.`,
      );
    }

    counter.count += 1;
    await this.usageRepo.save(counter);
    return counter.count;
  }

  /**
   * Peek rankings quota without consuming.
   */
  async peekRankingsView(user: User): Promise<{
    allowed: boolean;
    used: number;
    limit: number | null;
  }> {
    const plan = planById(user.plan);
    const limit = plan.rankingsViewsLifetime;
    if (limit === null) {
      return { allowed: true, used: 0, limit: null };
    }
    const counter = await this.getOrCreate(user.id, 'rankings_view', 'lifetime');
    return {
      allowed: counter.count < limit,
      used: counter.count,
      limit,
    };
  }

  /**
   * Rankings preview for Basic: allow first view (increment), then lock.
   * Pro: always open.
   */
  async consumeRankingsView(user: User): Promise<{
    allowed: boolean;
    used: number;
    limit: number | null;
    justConsumed: boolean;
  }> {
    const plan = planById(user.plan);
    const limit = plan.rankingsViewsLifetime;
    if (limit === null) {
      return { allowed: true, used: 0, limit: null, justConsumed: false };
    }

    const counter = await this.getOrCreate(user.id, 'rankings_view', 'lifetime');
    if (counter.count >= limit) {
      return {
        allowed: false,
        used: counter.count,
        limit,
        justConsumed: false,
      };
    }

    counter.count += 1;
    await this.usageRepo.save(counter);
    return {
      allowed: true,
      used: counter.count,
      limit,
      justConsumed: true,
    };
  }

  summaryForUser(
    user: User,
    counts: {
      analysis: number;
      creativeIntelligence: number;
      rankingsViews?: number;
    },
  ) {
    const plan = planById(user.plan);
    return {
      plan: plan.id,
      planName: plan.name,
      analysis: {
        used: counts.analysis,
        limit: plan.analysesPerMonth,
      },
      creativeIntelligence: {
        used: counts.creativeIntelligence,
        limit: plan.creativeIntelligencePerMonth,
      },
      rankings: {
        used: counts.rankingsViews ?? 0,
        limit: plan.rankingsViewsLifetime,
      },
      nextBillingAt: user.currentPeriodEnd,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      subscriptionStatus: user.subscriptionStatus,
    };
  }
}

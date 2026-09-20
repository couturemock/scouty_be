import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { CurrentUser } from '../common/decorators';
import { planById } from '../common/plans';
import { UsageService } from '../usage/usage.service';
import { User } from '../users/user.entity';
import { RankingsService } from './rankings.service';
import { RankingScope } from './ranking-entry.entity';

type RankingScopeParam = RankingScope;

@Controller('rankings')
@UseGuards(SubscriptionGuard)
export class RankingsController {
  constructor(
    private readonly rankings: RankingsService,
    private readonly usage: UsageService,
  ) {}

  @Get('meta')
  async meta(
    @CurrentUser() user: User,
    @Query('market') market?: string,
  ) {
    const access = await this.usage.peekRankingsView(user);
    return {
      ...(await this.rankings.listAvailable(user, market)),
      rankingsAccess: {
        unlimited: planById(user.plan).rankingsViewsLifetime === null,
        used: access.used,
        limit: access.limit,
        allowed: access.allowed,
      },
    };
  }

  @Get()
  async board(
    @CurrentUser() user: User,
    @Query('scope') scope: RankingScopeParam = 'general',
    @Query('scopeKey') scopeKey = '*',
    @Query('market') market?: string,
    /** First open of Rankings in Basic — marks the one-time preview as used */
    @Query('consume') consume?: string,
  ) {
    const plan = planById(user.plan);
    const unlimited = plan.rankingsViewsLifetime === null;
    let access = await this.usage.peekRankingsView(user);

    if (!unlimited && consume === '1' && access.allowed) {
      access = await this.usage.consumeRankingsView(user);
    } else if (!unlimited && !access.allowed) {
      return {
        locked: true,
        unlockRequired: true,
        plan: user.plan,
        message:
          'Has alcanzado el límite de vistas de rankings de tu plan.',
        weekKey: null,
        scope,
        scopeKey,
        items: [],
        rankingsAccess: {
          used: access.used,
          limit: access.limit,
          unlimited: false,
        },
      };
    }

    const effectiveUser = {
      ...user,
      targetMarket: market || user.targetMarket || 'ES',
    } as User;
    const board = await this.rankings.getBoard(effectiveUser, scope, scopeKey);
    return {
      locked: false,
      unlockRequired: false,
      ...board,
      rankingsAccess: {
        used: access.used,
        limit: access.limit,
        unlimited,
      },
    };
  }
}

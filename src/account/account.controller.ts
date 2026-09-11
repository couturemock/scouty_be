import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsString } from 'class-validator';
import { Repository } from 'typeorm';
import {
  amazonMarket,
  configuredAmazonMarkets,
  isAmazonMarketCode,
} from '../common/amazon-markets';
import { CurrentUser, Public } from '../common/decorators';
import { PLANS, planById } from '../common/plans';
import { UsageService } from '../usage/usage.service';
import { User } from '../users/user.entity';

class UpdateMarketDto {
  @IsString()
  targetMarket!: string;
}

@Controller('account')
export class AccountController {
  constructor(
    private readonly usage: UsageService,
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  private available() {
    return configuredAmazonMarkets(this.config.get<string>('KEEPA_MARKETS'));
  }

  @Get()
  async account(@CurrentUser() user: User) {
    const counts = await this.usage.getCounts(user.id);
    const market = amazonMarket(user.targetMarket);
    const availableMarkets = this.available();
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        targetMarket: user.targetMarket,
      },
      targetMarket: market,
      availableMarkets,
      keepaMarkets: availableMarkets.map((m) => m.code),
      ...this.usage.summaryForUser(user, counts),
      planDetails: planById(user.plan),
    };
  }

  @Patch('market')
  async updateMarket(@CurrentUser() user: User, @Body() body: UpdateMarketDto) {
    const allowed = new Set(this.available().map((m) => m.code));
    if (!isAmazonMarketCode(body.targetMarket) || !allowed.has(body.targetMarket)) {
      throw new BadRequestException(
        `Mercado no habilitado. Configura KEEPA_MARKETS (activos: ${[...allowed].join(', ')}).`,
      );
    }
    user.targetMarket = body.targetMarket;
    await this.users.save(user);
    return {
      ok: true,
      targetMarket: amazonMarket(user.targetMarket),
      message: `Mercado objetivo: ${amazonMarket(user.targetMarket).name}. Rankings y análisis usarán datos de este marketplace.`,
    };
  }
}

@Controller('markets')
export class MarketsController {
  constructor(private readonly config: ConfigService) {}

  @Public()
  @Get('amazon')
  list() {
    const markets = configuredAmazonMarkets(
      this.config.get<string>('KEEPA_MARKETS'),
    );
    return {
      markets,
      codes: markets.map((m) => m.code),
      source: 'KEEPA_MARKETS',
      note: 'Lista filtrada por KEEPA_MARKETS del backend. Keepa usa el domain de cada marketplace.',
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

import { Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { User } from '../users/user.entity';
import { WatchlistService } from './watchlist.service';

@Controller('watchlist')
@UseGuards(SubscriptionGuard)
export class WatchlistController {
  constructor(private readonly watchlist: WatchlistService) {}

  @Get()
  list(@CurrentUser() user: User) {
    return this.watchlist.list(user);
  }

  @Post(':productId')
  add(@CurrentUser() user: User, @Param('productId') productId: string) {
    return this.watchlist.add(user, productId);
  }

  @Delete(':productId')
  remove(@CurrentUser() user: User, @Param('productId') productId: string) {
    return this.watchlist.remove(user, productId);
  }
}

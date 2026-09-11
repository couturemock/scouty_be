import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageModule } from '../usage/usage.module';
import { User } from '../users/user.entity';
import {
  AccountController,
  MarketsController,
  PlansController,
} from './account.controller';

@Module({
  imports: [UsageModule, TypeOrmModule.forFeature([User])],
  controllers: [AccountController, MarketsController, PlansController],
})
export class AccountModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageModule } from '../usage/usage.module';
import { User } from '../users/user.entity';
import { AccountController, PlansController } from './account.controller';

@Module({
  imports: [UsageModule, TypeOrmModule.forFeature([User])],
  controllers: [AccountController, PlansController],
})
export class AccountModule {}

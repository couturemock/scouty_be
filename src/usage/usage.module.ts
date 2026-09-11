import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsageCounter } from './usage-counter.entity';
import { UsageService } from './usage.service';

@Module({
  imports: [TypeOrmModule.forFeature([UsageCounter])],
  providers: [UsageService],
  exports: [UsageService],
})
export class UsageModule {}

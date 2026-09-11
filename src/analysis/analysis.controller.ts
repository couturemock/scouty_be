import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsBoolean, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { CurrentUser } from '../common/decorators';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { User } from '../users/user.entity';
import { AnalysisService } from './analysis.service';

class AnalyzeDto {
  @IsIn(['photo', 'url', 'text'])
  type!: 'photo' | 'url' | 'text';

  @IsString()
  @MinLength(1)
  value!: string;

  @IsOptional()
  @IsBoolean()
  findCheaper?: boolean;
}

@Controller('analysis')
@UseGuards(SubscriptionGuard)
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}

  @Post()
  analyze(@CurrentUser() user: User, @Body() body: AnalyzeDto) {
    return this.analysis.analyze(user, body);
  }
}

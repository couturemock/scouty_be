import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
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

class HistoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

@Controller('analysis')
@UseGuards(SubscriptionGuard)
export class AnalysisController {
  constructor(private readonly analysis: AnalysisService) {}

  @Get()
  history(@CurrentUser() user: User, @Query() query: HistoryQueryDto) {
    return this.analysis.listHistory(user, query.limit ?? 30);
  }

  @Get(':id')
  getOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.analysis.getById(user, id);
  }

  @Post()
  analyze(@CurrentUser() user: User, @Body() body: AnalyzeDto) {
    return this.analysis.analyze(user, body);
  }
}

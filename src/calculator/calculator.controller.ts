import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { SubscriptionGuard } from '../auth/subscription.guard';
import { CalculatorService } from './calculator.service';

class CalcDto {
  @IsNumber()
  @Min(0)
  salePrice!: number;

  @IsNumber()
  @Min(0)
  supplierCost!: number;

  @IsNumber()
  @Min(0)
  shipping!: number;

  @IsNumber()
  @Min(0)
  fees!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otherCosts?: number;
}

@Controller('calculator')
@UseGuards(SubscriptionGuard)
export class CalculatorController {
  constructor(private readonly calculator: CalculatorService) {}

  @Post()
  compute(@Body() body: CalcDto) {
    return this.calculator.compute(body);
  }
}

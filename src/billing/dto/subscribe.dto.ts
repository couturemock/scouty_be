import { IsIn, IsString, MinLength } from 'class-validator';
import type { PlanId } from '../../common/plans';

export class SubscribeDto {
  @IsIn(['basic', 'pro'])
  plan!: PlanId;

  @IsString()
  @MinLength(1)
  paymentMethodId!: string;
}

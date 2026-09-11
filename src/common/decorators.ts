import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { PlanId } from './plans';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const PLAN_KEY = 'requiredPlan';
export const RequirePlan = (...plans: PlanId[]) => SetMetadata(PLAN_KEY, plans);

export const ROLES_KEY = 'roles';
export const AdminOnly = () => SetMetadata(ROLES_KEY, ['admin']);

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

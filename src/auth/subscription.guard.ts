import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { User } from '../users/user.entity';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User | undefined;
    if (!user) {
      throw new ForbiddenException(
        'Inicia sesión y activa un plan para acceder al catálogo Scout-ly.',
      );
    }

    if (user.isAdmin) {
      return true;
    }

    const active =
      user.subscriptionStatus === 'active' ||
      user.subscriptionStatus === 'trialing' ||
      (user.cancelAtPeriodEnd &&
        user.currentPeriodEnd &&
        user.currentPeriodEnd.getTime() > Date.now());

    if (!active) {
      throw new ForbiddenException(
        'Necesitas una suscripción activa para usar Scout-ly. Elige un plan y completa el pago.',
      );
    }
    return true;
  }
}

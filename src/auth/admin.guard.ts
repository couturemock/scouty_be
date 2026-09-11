import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as User | undefined;
    if (!user) {
      throw new ForbiddenException('Autenticación requerida');
    }

    if (user.isAdmin) return true;

    const admins = (this.config.get<string>('ADMIN_EMAILS') ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (admins.includes(user.email.toLowerCase())) return true;

    throw new ForbiddenException('Solo administradores');
  }
}

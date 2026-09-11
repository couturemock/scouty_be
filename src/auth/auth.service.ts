import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { PlanId } from '../common/plans';
import { MailService } from '../mail/mail.service';
import { User } from '../users/user.entity';
import { WaitlistService } from '../waitlist/waitlist.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly waitlist: WaitlistService,
  ) {}

  private tokenFor(user: User) {
    return this.jwt.sign({ sub: user.id, email: user.email });
  }

  private publicUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      emailVerified: user.emailVerified,
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.currentPeriodEnd,
      cancelAtPeriodEnd: user.cancelAtPeriodEnd,
      targetMarket: user.targetMarket ?? 'ES',
      isAdmin: user.isAdmin,
      waitlistDiscountEligible: user.waitlistDiscountEligible,
    };
  }

  async register(dto: RegisterDto) {
    const blocked = await this.waitlist.isRegistrationBlocked();
    let waitlistEntryId: string | null = null;

    if (blocked) {
      if (!dto.invite?.trim()) {
        throw new ForbiddenException(
          'Las plazas están completas. Entra en la lista de espera o usa el enlace de tu invitación.',
        );
      }
      const entry = await this.waitlist.consumeInvite(dto.invite.trim());
      if (entry.email !== dto.email.toLowerCase()) {
        throw new BadRequestException(
          'El correo debe coincidir con el de tu invitación.',
        );
      }
      waitlistEntryId = entry.id;
    } else if (dto.invite?.trim()) {
      const entry = await this.waitlist.consumeInvite(dto.invite.trim());
      if (entry.email !== dto.email.toLowerCase()) {
        throw new BadRequestException(
          'El correo debe coincidir con el de tu invitación.',
        );
      }
      waitlistEntryId = entry.id;
    }

    const existing = await this.users.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('Este correo ya está registrado');

    const verifyToken = randomBytes(32).toString('hex');
    const user = this.users.create({
      email: dto.email.toLowerCase(),
      name: dto.name,
      passwordHash: await bcrypt.hash(dto.password, 10),
      plan: (dto.plan ?? 'basic') as PlanId,
      targetMarket: dto.targetMarket ?? 'ES',
      emailVerifyToken: verifyToken,
      emailVerified: false,
      subscriptionStatus: 'none',
      waitlistDiscountEligible: false,
      waitlistEntryId,
    });
    await this.users.save(user);

    if (waitlistEntryId) {
      await this.waitlist.markRegistered(waitlistEntryId, user.id);
    }

    await this.mail.sendVerification(user.email, verifyToken);

    return {
      accessToken: this.tokenFor(user),
      user: this.publicUser(user),
      next: 'checkout',
    };
  }

  async login(dto: LoginDto) {
    const user = await this.users.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user?.passwordHash)
      throw new UnauthorizedException('Credenciales inválidas');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');
    return { accessToken: this.tokenFor(user), user: this.publicUser(user) };
  }

  async verifyEmail(token: string) {
    const user = await this.users.findOne({
      where: { emailVerifyToken: token },
    });
    if (!user) throw new BadRequestException('Token inválido');
    user.emailVerified = true;
    user.emailVerifyToken = null;
    await this.users.save(user);
    return { ok: true };
  }

  async forgotPassword(email: string) {
    const user = await this.users.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!user) return { ok: true };
    user.passwordResetToken = randomBytes(32).toString('hex');
    user.passwordResetExpires = new Date(Date.now() + 1000 * 60 * 60);
    await this.users.save(user);
    await this.mail.sendPasswordReset(user.email, user.passwordResetToken);
    return { ok: true };
  }

  async resetPassword(token: string, password: string) {
    const user = await this.users.findOne({
      where: { passwordResetToken: token },
    });
    if (
      !user ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException('Token inválido o caducado');
    }
    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await this.users.save(user);
    return { ok: true };
  }

  async upsertGoogleUser(profile: {
    googleId: string;
    email: string;
    name: string;
  }) {
    let user = await this.users.findOne({
      where: [
        { googleId: profile.googleId },
        { email: profile.email.toLowerCase() },
      ],
    });

    if (!user) {
      const blocked = await this.waitlist.isRegistrationBlocked();
      if (blocked) {
        throw new ForbiddenException(
          'El registro está cerrado. Usa el enlace de invitación de tu correo o reserva plaza en la landing.',
        );
      }
      user = this.users.create({
        email: profile.email.toLowerCase(),
        name: profile.name,
        googleId: profile.googleId,
        emailVerified: true,
        passwordHash: null,
        plan: 'basic',
        subscriptionStatus: 'none',
      });
    } else {
      user.googleId = profile.googleId;
      user.emailVerified = true;
      if (!user.name) user.name = profile.name;
    }

    await this.users.save(user);
    return { accessToken: this.tokenFor(user), user: this.publicUser(user) };
  }

  me(user: User) {
    return this.publicUser(user);
  }
}

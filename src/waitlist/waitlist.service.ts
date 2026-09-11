import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { LessThan, Repository } from 'typeorm';
import { PLANS } from '../common/plans';
import { MailService } from '../mail/mail.service';
import {
  ReleaseSeatsDto,
  ReserveWaitlistDto,
  UpdateSettingsDto,
} from './dto/waitlist.dto';
import { WaitlistEntry } from './waitlist-entry.entity';
import { WaitlistSettings } from './waitlist-settings.entity';

const COOLDOWN_AFTER_EXPIRE_DAYS = (expireCount: number) =>
  expireCount <= 1 ? 15 : 30;

@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);

  constructor(
    @InjectRepository(WaitlistSettings)
    private readonly settingsRepo: Repository<WaitlistSettings>,
    @InjectRepository(WaitlistEntry)
    private readonly entries: Repository<WaitlistEntry>,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private planPrices() {
    return {
      basic: {
        id: 'basic' as const,
        name: PLANS.basic.name,
        monthly: PLANS.basic.monthlyEur,
      },
      pro: {
        id: 'pro' as const,
        name: PLANS.pro.name,
        monthly: PLANS.pro.monthlyEur,
      },
    };
  }

  async getSettings() {
    let row = await this.settingsRepo.findOne({ where: { id: 'default' } });
    if (!row) {
      row = await this.settingsRepo.save(
        this.settingsRepo.create({
          id: 'default',
          registrationOpen: false,
          accessWindowHours: 48,
        }),
      );
    }
    return row;
  }

  async getPublicStatus() {
    const settings = await this.getSettings();
    const waiting = await this.entries.count({ where: { status: 'waiting' } });
    const invited = await this.entries.count({ where: { status: 'invited' } });
    return {
      registrationOpen: settings.registrationOpen,
      accessWindowHours: settings.accessWindowHours,
      waitingCount: waiting,
      invitedCount: invited,
      plans: this.planPrices(),
      /** @deprecated alias for older clients */
      campaign: settings.registrationOpen
        ? null
        : {
            id: 'default',
            name: 'Lista de espera',
            status: 'full',
            accessWindowHours: settings.accessWindowHours,
            waitlistDiscountPct: 0,
            remaining: 0,
            quota: 0,
            reservedCount: waiting,
          },
    };
  }

  async isRegistrationBlocked() {
    const settings = await this.getSettings();
    return !settings.registrationOpen;
  }

  async updateSettings(dto: UpdateSettingsDto) {
    const settings = await this.getSettings();
    if (dto.registrationOpen != null) {
      settings.registrationOpen = dto.registrationOpen;
    }
    if (dto.accessWindowHours != null) {
      settings.accessWindowHours = dto.accessWindowHours;
    }
    await this.settingsRepo.save(settings);
    return this.getPublicStatus();
  }

  async reserve(dto: ReserveWaitlistDto) {
    const settings = await this.getSettings();
    if (settings.registrationOpen) {
      throw new BadRequestException(
        'El registro está abierto. Crea tu cuenta directamente; la lista de espera solo aplica cuando las plazas están completas.',
      );
    }

    const email = dto.email.trim().toLowerCase();
    const existing = await this.entries.findOne({ where: { email } });
    if (existing) {
      if (existing.status === 'removed') {
        existing.status = 'waiting';
        existing.name = dto.name.trim();
        existing.expireCount = 0;
        existing.cooldownUntil = null;
        existing.inviteToken = null;
        existing.inviteSentAt = null;
        existing.inviteExpiresAt = null;
        existing.source = dto.source?.trim() || existing.source;
        await this.entries.save(existing);
        const mailed = await this.mail.sendWaitlistConfirm({
          name: existing.name,
          email: existing.email,
          accessWindowHours: settings.accessWindowHours,
        });
        if (mailed) {
          this.logger.log(`Waitlist confirm email sent to ${existing.email}`);
        } else {
          this.logger.warn(
            `Waitlist re-join saved but confirm email failed for ${existing.email}`,
          );
        }
        return {
          ok: true,
          message:
            'Volviste a la lista de espera. Cuando haya una plaza libre te avisaremos por email.',
        };
      }
      if (existing.status === 'registered') {
        throw new ConflictException('Este correo ya tiene una cuenta en Scout-ly.');
      }
      throw new ConflictException(
        'Este correo ya está en la lista de espera. Te avisaremos cuando haya plaza.',
      );
    }

    const entry = await this.entries.save(
      this.entries.create({
        name: dto.name.trim(),
        email,
        status: 'waiting',
        source: dto.source?.trim() || null,
      }),
    );

    const mailed = await this.mail.sendWaitlistConfirm({
      name: entry.name,
      email: entry.email,
      accessWindowHours: settings.accessWindowHours,
    });
    if (mailed) {
      this.logger.log(`Waitlist confirm email sent to ${entry.email}`);
    } else {
      this.logger.warn(
        `Waitlist entry saved but confirm email failed for ${entry.email}`,
      );
    }

    return {
      ok: true,
      message: `Estás en la lista. Cuando liberemos una plaza te enviaremos un email: tendrás ${settings.accessWindowHours} horas para crear tu cuenta y suscribirte.`,
    };
  }

  async listEntries(status?: string) {
    const where = status ? { status: status as WaitlistEntry['status'] } : {};
    const rows = await this.entries.find({
      where,
      order: { createdAt: 'ASC' },
      take: 5000,
    });
    return rows.map((e) => ({
      id: e.id,
      name: e.name,
      email: e.email,
      status: e.status,
      expireCount: e.expireCount,
      cooldownUntil: e.cooldownUntil?.toISOString() ?? null,
      inviteSentAt: e.inviteSentAt?.toISOString() ?? null,
      inviteExpiresAt: e.inviteExpiresAt?.toISOString() ?? null,
      registeredUserId: e.registeredUserId,
      createdAt: e.createdAt.toISOString(),
      source: e.source,
      eligible: this.isEligibleNow(e),
    }));
  }

  private isEligibleNow(e: WaitlistEntry) {
    if (e.status !== 'waiting') return false;
    if (e.cooldownUntil && e.cooldownUntil > new Date()) return false;
    return true;
  }

  /** Next people in queue who can receive an invite. */
  private async nextEligible(limit: number) {
    const waiting = await this.entries.find({
      where: { status: 'waiting' },
      order: { createdAt: 'ASC' },
      take: Math.max(limit * 5, 50),
    });
    return waiting.filter((e) => this.isEligibleNow(e)).slice(0, limit);
  }

  async releaseSeats(dto: ReleaseSeatsDto) {
    const settings = await this.getSettings();
    const targets = await this.nextEligible(dto.count);
    if (!targets.length) {
      return {
        ok: true,
        sent: 0,
        requested: dto.count,
        errors: [] as string[],
        message: 'No hay personas elegibles en la cola.',
      };
    }

    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    const windowMs = settings.accessWindowHours * 60 * 60 * 1000;
    let sent = 0;
    const errors: string[] = [];

    for (const entry of targets) {
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + windowMs);
      const registerUrl = `${appUrl}/auth/register?invite=${token}`;

      // Mark invited only after the email succeeds; otherwise stay in queue.
      try {
        await this.mail.sendWaitlistAccess({
          name: entry.name,
          email: entry.email,
          registerUrl,
          expiresAt,
          accessWindowHours: settings.accessWindowHours,
        });
        entry.inviteToken = token;
        entry.inviteSentAt = new Date();
        entry.inviteExpiresAt = expiresAt;
        entry.status = 'invited';
        await this.entries.save(entry);
        sent += 1;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${entry.email}: ${msg}`);
        this.logger.warn(`Access email failed ${entry.email}: ${err}`);
      }
    }

    const message =
      sent === 0
        ? `No se envió ninguna invitación. ${errors[0] ?? 'Revisa la configuración de correo (Resend / dominio).'}`
        : `Se envió acceso a ${sent} persona(s). Tienen ${settings.accessWindowHours}h para registrarse.` +
          (errors.length ? ` Fallos: ${errors.length}.` : '');

    return {
      ok: sent > 0,
      sent,
      requested: dto.count,
      errors,
      message,
    };
  }

  /**
   * Expire overdue invites, apply cooldown, reassign freed seats.
   * 1ª caducidad → 15 días; 2ª y siguientes → 30 días (sigue en la lista).
   */
  async processExpiredInvites() {
    const overdue = await this.entries.find({
      where: {
        status: 'invited',
        inviteExpiresAt: LessThan(new Date()),
      },
    });
    if (!overdue.length) return { expired: 0, reassigned: 0 };

    let expired = 0;
    for (const entry of overdue) {
      entry.expireCount += 1;
      entry.inviteToken = null;
      entry.inviteSentAt = null;
      entry.inviteExpiresAt = null;
      entry.status = 'waiting';
      const days = COOLDOWN_AFTER_EXPIRE_DAYS(entry.expireCount);
      entry.cooldownUntil = new Date(
        Date.now() + days * 24 * 60 * 60 * 1000,
      );
      this.logger.log(
        `Waitlist cooldown ${entry.email}: ${days}d (expire #${entry.expireCount})`,
      );
      await this.entries.save(entry);
      expired += 1;
    }

    const reassign = await this.releaseSeats({ count: expired });
    return { expired, reassigned: reassign.sent };
  }

  async consumeInvite(token: string) {
    const entry = await this.entries.findOne({ where: { inviteToken: token } });
    if (!entry) throw new BadRequestException('Invitación inválida');
    if (entry.status === 'registered') {
      throw new BadRequestException('Esta invitación ya fue usada');
    }
    if (entry.status === 'removed') {
      throw new BadRequestException('Esta plaza ya no está disponible');
    }
    if (
      entry.status !== 'invited' ||
      !entry.inviteExpiresAt ||
      entry.inviteExpiresAt < new Date()
    ) {
      throw new BadRequestException(
        'La invitación caducó. Seguirás en la lista con el bloqueo correspondiente antes de la próxima plaza.',
      );
    }
    return entry;
  }

  /** Public preview for register form prefill (name + email). */
  async getInvitePreview(token: string) {
    const entry = await this.entries.findOne({ where: { inviteToken: token } });
    if (!entry) throw new BadRequestException('Invitación inválida');
    if (entry.status === 'registered') {
      throw new BadRequestException('Esta invitación ya fue usada');
    }
    if (entry.status === 'removed') {
      throw new BadRequestException('Esta plaza ya no está disponible');
    }
    if (
      entry.status !== 'invited' ||
      !entry.inviteExpiresAt ||
      entry.inviteExpiresAt < new Date()
    ) {
      throw new BadRequestException('La invitación caducó.');
    }
    return {
      name: entry.name,
      email: entry.email,
      expiresAt: entry.inviteExpiresAt.toISOString(),
    };
  }

  async markRegistered(entryId: string, userId: string) {
    const entry = await this.entries.findOne({ where: { id: entryId } });
    if (!entry) return;
    entry.status = 'registered';
    entry.registeredUserId = userId;
    entry.inviteToken = null;
    entry.cooldownUntil = null;
    await this.entries.save(entry);
  }

  async adminSummary() {
    const settings = await this.getSettings();
    const [waiting, invited, registered, removed, cooldown] = await Promise.all([
      this.entries.count({ where: { status: 'waiting' } }),
      this.entries.count({ where: { status: 'invited' } }),
      this.entries.count({ where: { status: 'registered' } }),
      this.entries.count({ where: { status: 'removed' } }),
      this.entries
        .createQueryBuilder('e')
        .where('e.status = :s', { s: 'waiting' })
        .andWhere('e.cooldownUntil IS NOT NULL')
        .andWhere('e.cooldownUntil > NOW()')
        .getCount(),
    ]);
    const eligible = await this.nextEligible(1000);
    return {
      settings: {
        registrationOpen: settings.registrationOpen,
        accessWindowHours: settings.accessWindowHours,
      },
      counts: {
        waiting,
        invited,
        registered,
        removed,
        inCooldown: cooldown,
        eligibleNow: eligible.length,
      },
    };
  }

  async ensureSeed() {
    await this.getSettings();
  }
}

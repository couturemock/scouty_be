import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync } from 'fs';
import * as nodemailer from 'nodemailer';
import { join } from 'path';

/** Matches the app's dark theme (frontend/app/globals.css :root tokens). */
const PAGE_BG = '#0b0c0e';
const CARD_BG = '#131416';
const CARD_BG_SOFT = '#1b1c1f';
const BORDER = '#222327';
const INK = '#f5f6f7';
const MUTED = '#898c91';
const BRAND_GRADIENT = 'linear-gradient(110deg, #3e80f6 0%, #6262fa 48%, #a952fa 100%)';
/** Solid fallback for clients that don't render CSS gradients (Outlook desktop). */
const BRAND_SOLID = '#6262fa';
const LOGO_CID = 'sniperdrop-logo';
/** Intrinsic ratio of the compressed lockup embedded below (480x149). */
const LOGO_SIZE = { width: 180, height: 56 };

/**
 * Remote logo URL for clients that prefer hosted images: the same lockup
 * the app itself serves, so it stays in sync automatically.
 * Note: we also embed a compressed copy as cid: when available, since large
 * hosted images often fail to load in Gmail.
 */
const EMAIL_LOGO_URL = 'https://sniperdrop.com/dropsniper-lockup-full.png';

export type MailLocale = 'es' | 'en';

function normalizeLocale(locale?: string | null): MailLocale {
  return locale === 'en' ? 'en' : 'es';
}

/** Chrome strings shared by every email (not specific to one template). */
const CHROME = {
  es: {
    linkFallback: 'Si el botón no funciona, copie y pegue este enlace en su navegador:',
    regards: 'Atentamente,',
    team: 'Equipo Drop Sniper',
    tagline: 'Drop Sniper · Descubra. Analice. Decida.',
  },
  en: {
    linkFallback: "If the button doesn't work, copy and paste this link into your browser:",
    regards: 'Best regards,',
    team: 'Drop Sniper Team',
    tagline: 'Drop Sniper · Discover. Analyze. Decide.',
  },
} as const;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly resendKey: string;
  private logoBytes: Buffer | null = null;

  constructor(private readonly config: ConfigService) {
    this.resendKey = this.config.get<string>('RESEND_API_KEY') ?? '';
    this.logoBytes = this.loadCompressedLogo();
    const host = this.config.get<string>('SMTP_HOST');
    if (host) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(this.config.get('SMTP_PORT') ?? 587),
        secure: false,
        auth: {
          user: this.config.get<string>('SMTP_USER'),
          pass: this.config.get<string>('SMTP_PASS'),
        },
      });
    }
  }

  private loadCompressedLogo(): Buffer | null {
    const candidates = [
      this.config.get<string>('MAIL_LOGO_PATH'),
      join(process.cwd(), 'assets', 'email-logo.png'),
      join(process.cwd(), 'backend', 'assets', 'email-logo.png'),
      join(__dirname, '..', '..', 'assets', 'email-logo.png'),
    ].filter(Boolean) as string[];

    for (const path of candidates) {
      if (!existsSync(path)) continue;
      try {
        const buf = readFileSync(path);
        this.logger.log(`Email logo loaded (${buf.length} bytes) from ${path}`);
        return buf;
      } catch {
        /* next */
      }
    }
    this.logger.warn('Compressed email logo not found; falling back to remote URL');
    return null;
  }

  private resolveFrom() {
    const raw = this.config.get<string>('MAIL_FROM')?.trim() || '';
    const cleaned = raw.replace(/^["']|["']$/g, '').trim();
    return cleaned || 'SniperDrop <noreply@sniperdrop.com>';
  }

  private useDevLogOnly() {
    return (this.config.get<string>('MAIL_DEV_LOG_ONLY') ?? '') === 'true';
  }

  private appUrl() {
    return this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
  }

  private remoteLogoUrl() {
    return this.config.get<string>('MAIL_LOGO_URL')?.trim() || EMAIL_LOGO_URL;
  }

  private logoImgHtml() {
    // Prefer CID (small embedded asset). Large hosted PNGs often fail in Gmail.
    const src = this.logoBytes
      ? `cid:${LOGO_CID}`
      : this.remoteLogoUrl();
    return `<img src="${src}" alt="Drop Sniper" width="${LOGO_SIZE.width}" height="${LOGO_SIZE.height}" style="display:block;width:${LOGO_SIZE.width}px;height:${LOGO_SIZE.height}px;border:0;outline:none;text-decoration:none;" />`;
  }

  private layout(opts: {
    locale: MailLocale;
    preheader: string;
    title: string;
    bodyHtml: string;
    cta?: { label: string; href: string };
    footerNote?: string;
  }) {
    const chrome = CHROME[opts.locale];

    // Gradients aren't supported by Outlook desktop; `background-color` is
    // the fallback those clients render instead of `background`.
    const cta = opts.cta
      ? `<tr>
          <td style="padding:8px 40px 8px;">
            <a href="${opts.cta.href}" style="display:inline-block;padding:14px 22px;background-color:${BRAND_SOLID};background:${BRAND_GRADIENT};color:#ffffff;border-radius:10px;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;letter-spacing:0.01em;">
              ${opts.cta.label}
            </a>
          </td>
        </tr>`
      : '';

    const linkFallback = opts.cta
      ? `<tr>
          <td style="padding:4px 40px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:${MUTED};">
            ${chrome.linkFallback}<br/>
            <a href="${opts.cta.href}" style="color:#8aa6fb;word-break:break-all;">${opts.cta.href}</a>
          </td>
        </tr>`
      : '';

    return `<!DOCTYPE html>
<html lang="${opts.locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark" />
  <meta name="supported-color-schemes" content="dark" />
  <title>${opts.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif&display=swap" rel="stylesheet" />
</head>
<body style="margin:0;padding:0;background:${PAGE_BG};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE_BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${CARD_BG};border:1px solid ${BORDER};border-radius:16px;overflow:hidden;">
          <tr>
            <td align="left" style="padding:20px 40px;background:${PAGE_BG};">
              ${this.logoImgHtml()}
            </td>
          </tr>
          <tr>
            <td style="height:3px;background-color:${BRAND_SOLID};background:${BRAND_GRADIENT};font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td style="padding:28px 40px 0;font-family:'Instrument Serif',Georgia,'Times New Roman',serif;font-size:26px;line-height:1.25;color:${INK};font-weight:normal;">
              ${opts.title}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:${INK};">
              ${opts.bodyHtml}
            </td>
          </tr>
          ${cta}
          ${linkFallback}
          <tr>
            <td style="padding:8px 40px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${MUTED};border-top:1px solid ${BORDER};">
              ${opts.footerNote ?? chrome.regards + '<br/><strong style="color:' + INK + ';">' + chrome.team + '</strong>'}
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:11px;color:${MUTED};">
          ${chrome.tagline}
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  private resendAttachments() {
    if (!this.logoBytes) return undefined;
    return [
      {
        filename: 'sniperdrop-logo.png',
        content: this.logoBytes.toString('base64'),
        content_id: LOGO_CID,
        content_type: 'image/png',
      },
    ];
  }

  async send(to: string, subject: string, html: string) {
    const from = this.resolveFrom();

    if (this.useDevLogOnly()) {
      this.logger.log(
        `[mail:dev-log-only] from=${from} to=${to} subject=${subject}\n${html}`,
      );
      return;
    }

    if (this.resendKey) {
      const body: Record<string, unknown> = {
        from,
        to: [to],
        subject,
        html,
      };
      const attachments = this.resendAttachments();
      if (attachments) body.attachments = attachments;

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        this.logger.error(
          `Resend failed from=${from} to=${to}: ${res.status} ${text}`,
        );
        let hint = '';
        if (
          text.includes('domain is not verified') ||
          text.includes('only send testing')
        ) {
          hint =
            ' Verifique el dominio en resend.com/domains y configure MAIL_FROM con ese dominio. En local puede usar MAIL_DEV_LOG_ONLY=true.';
        }
        throw new Error(`Resend HTTP ${res.status}: ${text}${hint}`);
      }
      return;
    }

    if (!this.transporter) {
      this.logger.log(`[mail:dev] to=${to} subject=${subject}\n${html}`);
      return;
    }
    await this.transporter.sendMail({
      from,
      to,
      subject,
      html,
      attachments: this.logoBytes
        ? [
            {
              filename: 'sniperdrop-logo.png',
              content: this.logoBytes,
              cid: LOGO_CID,
              contentType: 'image/png',
              contentDisposition: 'inline',
            },
          ]
        : undefined,
    });
  }

  private async sendSafe(to: string, subject: string, html: string) {
    try {
      await this.send(to, subject, html);
      return true;
    } catch (err) {
      this.logger.warn(`Email not delivered to=${to}: ${String(err)}`);
      return false;
    }
  }

  async sendVerification(email: string, token: string, locale?: string) {
    const loc = normalizeLocale(locale);
    const link = `${this.appUrl()}/auth/verificar?token=${token}`;
    const copy = {
      es: {
        preheader: 'Confirme su correo para activar Drop Sniper.',
        title: 'Verifique su correo',
        body: `<p style="margin:0 0 12px;">Estimado/a usuario/a,</p>
        <p style="margin:0;">Para activar su cuenta en Drop Sniper, confirme su dirección de correo electrónico.</p>`,
        cta: 'Verificar correo',
        subject: 'Verifique su correo — Drop Sniper',
      },
      en: {
        preheader: 'Confirm your email to activate Drop Sniper.',
        title: 'Verify your email',
        body: `<p style="margin:0 0 12px;">Hello,</p>
        <p style="margin:0;">To activate your Drop Sniper account, please confirm your email address.</p>`,
        cta: 'Verify email',
        subject: 'Verify your email — Drop Sniper',
      },
    }[loc];
    const html = this.layout({
      locale: loc,
      preheader: copy.preheader,
      title: copy.title,
      bodyHtml: copy.body,
      cta: { label: copy.cta, href: link },
    });
    await this.send(email, copy.subject, html);
  }

  async sendPasswordReset(email: string, token: string, locale?: string) {
    const loc = normalizeLocale(locale);
    const link = `${this.appUrl()}/auth/recuperar?token=${token}`;
    const copy = {
      es: {
        preheader: 'Restablezca su contraseña de Drop Sniper.',
        title: 'Restablecer contraseña',
        body: `<p style="margin:0 0 12px;">Estimado/a usuario/a,</p>
        <p style="margin:0;">Hemos recibido una solicitud para restablecer su contraseña. Si no la solicitó, ignore este mensaje.</p>`,
        cta: 'Restablecer contraseña',
        subject: 'Recupere su contraseña — Drop Sniper',
      },
      en: {
        preheader: 'Reset your Drop Sniper password.',
        title: 'Reset your password',
        body: `<p style="margin:0 0 12px;">Hello,</p>
        <p style="margin:0;">We received a request to reset your password. If you didn't request this, you can ignore this email.</p>`,
        cta: 'Reset password',
        subject: 'Reset your password — Drop Sniper',
      },
    }[loc];
    const html = this.layout({
      locale: loc,
      preheader: copy.preheader,
      title: copy.title,
      bodyHtml: copy.body,
      cta: { label: copy.cta, href: link },
    });
    await this.send(email, copy.subject, html);
  }

  async sendWaitlistConfirm(opts: {
    name: string;
    email: string;
    accessWindowHours: number;
    locale?: string;
  }) {
    const loc = normalizeLocale(opts.locale);
    const safeName = escapeHtml(opts.name);
    const copy = {
      es: {
        preheader: 'Está en la lista de espera de Drop Sniper. Le avisaremos cuando haya plaza.',
        title: 'Solicitud recibida',
        greeting: `Estimado/a ${safeName},`,
        full: 'Las plazas de Drop Sniper están completas en este momento. Hemos registrado su solicitud en la lista de espera.',
        box: `Cuando se libere una plaza, le enviaremos un correo. Dispondrá de <strong>${opts.accessWindowHours} horas</strong> para crear su cuenta y completar la suscripción.`,
        pricing: 'El precio es el mismo para todos los usuarios; no aplicamos descuentos por lista de espera.',
        subject: 'Lista de espera — Drop Sniper',
      },
      en: {
        preheader: "You're on the Drop Sniper waitlist. We'll let you know when a spot opens up.",
        title: 'Request received',
        greeting: `Hi ${safeName},`,
        full: 'Drop Sniper is at capacity right now. We\'ve added your request to the waitlist.',
        box: `We'll email you as soon as a spot opens up. You'll have <strong>${opts.accessWindowHours} hours</strong> to create your account and complete your subscription.`,
        pricing: "Pricing is the same for everyone; we don't offer waitlist discounts.",
        subject: 'Waitlist — Drop Sniper',
      },
    }[loc];
    const html = this.layout({
      locale: loc,
      preheader: copy.preheader,
      title: copy.title,
      bodyHtml: `
        <p style="margin:0 0 14px;">${copy.greeting}</p>
        <p style="margin:0 0 14px;">${copy.full}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;background:${CARD_BG_SOFT};border:1px solid ${BORDER};border-radius:12px;">
          <tr>
            <td style="padding:14px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55;color:${INK};">
              ${copy.box}
            </td>
          </tr>
        </table>
        <p style="margin:0;">${copy.pricing}</p>`,
    });

    return this.sendSafe(opts.email, copy.subject, html);
  }

  async sendWaitlistAccess(opts: {
    name: string;
    email: string;
    registerUrl: string;
    expiresAt: Date;
    accessWindowHours: number;
    locale?: string;
  }) {
    const loc = normalizeLocale(opts.locale);
    const safeName = escapeHtml(opts.name);
    const expires = opts.expiresAt.toLocaleString(
      loc === 'en' ? 'en-US' : 'es-ES',
      { dateStyle: 'long', timeStyle: 'short' },
    );
    const copy = {
      es: {
        preheader: `Su plaza en Drop Sniper está disponible. Tiene ${opts.accessWindowHours} horas para registrarse.`,
        title: 'Su plaza ya está disponible',
        greeting: `Estimado/a ${safeName},`,
        intro: 'Hay una plaza disponible para usted en Drop Sniper.',
        box: `Dispone de <strong>${opts.accessWindowHours} horas</strong> (hasta el <strong>${expires}</strong>) para crear su cuenta y suscribirse al precio habitual.`,
        expiry: 'Si no completa el proceso a tiempo, la plaza se asignará a la siguiente persona de la lista.',
        cta: 'Crear mi cuenta',
        subject: 'Su plaza en Drop Sniper ya está disponible',
      },
      en: {
        preheader: `Your Drop Sniper spot is ready. You have ${opts.accessWindowHours} hours to sign up.`,
        title: 'Your spot is ready',
        greeting: `Hi ${safeName},`,
        intro: 'A spot just opened up for you on Drop Sniper.',
        box: `You have <strong>${opts.accessWindowHours} hours</strong> (until <strong>${expires}</strong>) to create your account and subscribe at the regular price.`,
        expiry: "If you don't complete this in time, the spot will go to the next person on the list.",
        cta: 'Create my account',
        subject: 'Your Drop Sniper spot is ready',
      },
    }[loc];
    const html = this.layout({
      locale: loc,
      preheader: copy.preheader,
      title: copy.title,
      bodyHtml: `
        <p style="margin:0 0 14px;">${copy.greeting}</p>
        <p style="margin:0 0 14px;">${copy.intro}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px;background:${CARD_BG_SOFT};border:1px solid ${BORDER};border-radius:12px;">
          <tr>
            <td style="padding:14px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55;color:${INK};">
              ${copy.box}
            </td>
          </tr>
        </table>
        <p style="margin:0;">${copy.expiry}</p>`,
      cta: { label: copy.cta, href: opts.registerUrl },
    });

    await this.send(opts.email, copy.subject, html);
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

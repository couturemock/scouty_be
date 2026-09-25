import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

/**
 * Public image hosting for user-uploaded photos (e.g. "analizar por imagen").
 * Needed because supplier image search (Alibaba.com/Otapi `ImageUrl`) requires
 * a fetchable public URL, not raw bytes/base64.
 *
 * Env: SUPABASE_URL, SUPABASE_KEY (service role), SUPABASE_BUCKET
 */
@Injectable()
export class SupabaseStorageProvider {
  private readonly logger = new Logger(SupabaseStorageProvider.name);

  constructor(private readonly config: ConfigService) {}

  private url() {
    return this.config.get<string>('SUPABASE_URL')?.trim().replace(/\/$/, '') ?? '';
  }

  private key() {
    return this.config.get<string>('SUPABASE_KEY')?.trim() ?? '';
  }

  private bucket() {
    return this.config.get<string>('SUPABASE_BUCKET')?.trim() ?? '';
  }

  enabled() {
    return Boolean(this.url() && this.key() && this.bucket());
  }

  /** Uploads a buffer to the configured bucket and returns its public URL. */
  async uploadPublic(
    buffer: Buffer,
    contentType: string,
    pathPrefix = 'analysis',
  ): Promise<string> {
    if (!this.enabled()) {
      throw new Error(
        'Supabase Storage no configurado (SUPABASE_URL/SUPABASE_KEY/SUPABASE_BUCKET)',
      );
    }

    const ext = contentType.split('/')[1]?.replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'jpg';
    const path = `${pathPrefix}/${randomUUID()}.${ext}`;
    const uploadUrl = `${this.url()}/storage/v1/object/${this.bucket()}/${path}`;

    const res = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.key()}`,
        apikey: this.key(),
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      // Node's fetch (undici) accepts a Buffer at runtime; the DOM BodyInit
      // typing just doesn't declare it.
      body: buffer as unknown as BodyInit,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Supabase upload HTTP ${res.status}: ${text.slice(0, 300)}`);
    }

    const publicUrl = `${this.url()}/storage/v1/object/public/${this.bucket()}/${path}`;
    this.logger.debug(`Uploaded ${buffer.length}b -> ${publicUrl}`);
    return publicUrl;
  }
}

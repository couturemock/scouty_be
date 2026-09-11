import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PipiAdsApiResult<T = unknown> {
  code: number;
  message?: string;
  data: T;
}

@Injectable()
export class PipiAdsClient {
  private readonly logger = new Logger(PipiAdsClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl =
      this.config.get<string>('PIPIADS_BASE_URL') ?? 'https://www.pipispy.com';
    this.apiKey = this.config.get<string>('PIPIADS_API_KEY') ?? '';
  }

  enabled() {
    return Boolean(this.apiKey);
  }

  /**
   * Remaining open-platform credits (PipiAds / ppspy).
   * Tries api.ppspy.com first, then pipispy.com variant.
   */
  async getCredits(): Promise<{
    remaining: number | null
    used: number | null
    total: number | null
    source: string | null
  }> {
    if (!this.apiKey) {
      return { remaining: null, used: null, total: null, source: null };
    }

    const bases = [
      this.config.get<string>('PIPIADS_CREDITS_URL') ?? 'https://api.ppspy.com',
      this.baseUrl.replace(/\/$/, ''),
    ];

    for (const base of bases) {
      try {
        const url = `${base}/open-api/v1/credits`;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: this.apiKey,
          },
        });
        if (!response.ok) continue;
        const result = (await response.json()) as PipiAdsApiResult<{
          normal?: {
            credits?: number
            used_credits?: number
            total_credits?: number
          }
        }>;
        if (result.code !== 200) continue;
        const normal = result.data?.normal;
        return {
          remaining: normal?.credits ?? null,
          used: normal?.used_credits ?? null,
          total: normal?.total_credits ?? null,
          source: base,
        };
      } catch (err) {
        this.logger.debug(`PipiAds credits via ${base}: ${err}`);
      }
    }

    return { remaining: null, used: null, total: null, source: null };
  }

  async call<T = unknown>(
    uri: string,
    params: Record<string, unknown>,
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('PIPIADS_API_KEY no configurada');
    }

    const url = `${this.baseUrl}/open-api/v1/data`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ key: this.apiKey, uri, params }),
    });

    if (!response.ok) {
      throw new Error(`PipiAds HTTP ${response.status}: ${response.statusText}`);
    }

    const result = (await response.json()) as PipiAdsApiResult<T>;
    if (result.code !== 200) {
      throw new Error(
        `PipiAds API ${result.code}: ${result.message ?? 'Error desconocido'}`,
      );
    }

    return result.data;
  }
}

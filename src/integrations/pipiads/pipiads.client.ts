import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PipiAdsCacheService } from './pipiads-cache.service';

export interface PipiAdsApiResult<T = unknown> {
  code: number;
  message?: string;
  data: T;
}

const DEFAULT_LIST_TTL_SEC = 6 * 60 * 60; // /adspy/list changes fast — short TTL
const DEFAULT_DETAIL_TTL_SEC = 7 * 24 * 60 * 60; // a given ad's detail doesn't change — long TTL

@Injectable()
export class PipiAdsClient {
  private readonly logger = new Logger(PipiAdsClient.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly config: ConfigService,
    private readonly cache: PipiAdsCacheService,
  ) {
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
    return (await this.callWithMeta<T>(uri, params)).data;
  }

  /**
   * Same as `call`, plus the credits the request actually consumed.
   * Cached + in-flight-deduped per (uri, params): a cache hit or a deduped
   * concurrent call reports `consumed: 0` — only the one real HTTP request
   * that actually paid PipiAds reports its real cost.
   */
  async callWithMeta<T = unknown>(
    uri: string,
    params: Record<string, unknown>,
  ): Promise<{ data: T; consumed: number | null; remaining: number | null }> {
    if (!this.apiKey) {
      throw new Error('PIPIADS_API_KEY no configurada');
    }

    const ttlSec = this.cacheTtlFor(uri);
    const cacheKey = this.cache.key(uri, params);
    const { data, consumed, remaining } = await this.cache.getOrFetch<T>(cacheKey, ttlSec, () =>
      this.rawCall<T>(uri, params),
    );
    return { data, consumed, remaining };
  }

  private cacheTtlFor(uri: string): number {
    const isDetail = uri.includes('detail');
    const configKey = isDetail ? 'PIPIADS_CACHE_TTL_DETAIL_SEC' : 'PIPIADS_CACHE_TTL_LIST_SEC';
    const fallback = isDetail ? DEFAULT_DETAIL_TTL_SEC : DEFAULT_LIST_TTL_SEC;
    const n = Number(this.config.get(configKey) ?? fallback);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }

  private async rawCall<T = unknown>(
    uri: string,
    params: Record<string, unknown>,
  ): Promise<{ data: T; consumed: number | null; remaining: number | null }> {
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

    const result = (await response.json()) as PipiAdsApiResult<T> & {
      consumed_credits?: number;
      remaining_credits?: number;
    };
    if (result.code !== 200) {
      throw new Error(
        `PipiAds API ${result.code}: ${result.message ?? 'Error desconocido'}`,
      );
    }

    const consumed = Number(result.consumed_credits);
    const remaining = Number(result.remaining_credits);
    return {
      data: result.data,
      consumed: Number.isFinite(consumed) ? consumed : null,
      remaining: Number.isFinite(remaining) ? remaining : null,
    };
  }
}

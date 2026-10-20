import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { buildRedisConnection } from '../../queue/redis-connection';

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const body = keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
    .join(',');
  return `{${body}}`;
}

/**
 * Request-level cache + in-flight dedupe for PipiAds calls, backed by the
 * Redis connection already used for BullMQ (`buildRedisConnection`) — no new
 * infra. Degrades to "always miss" if Redis is unreachable; a cache outage
 * must never block an ingest, only make it cost what it costs today.
 */
@Injectable()
export class PipiAdsCacheService {
  private readonly logger = new Logger(PipiAdsCacheService.name);
  private readonly redis: Redis;
  private readonly inFlight = new Map<string, Promise<unknown>>();
  private hits = 0;
  private misses = 0;

  constructor(config: ConfigService) {
    this.redis = new Redis({
      ...buildRedisConnection(config),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
    this.redis.on('error', (err) => this.logger.debug(`Redis cache: ${err}`));
  }

  key(uri: string, params: Record<string, unknown>): string {
    const hash = createHash('sha1').update(stableStringify(params)).digest('hex');
    return `pipiads:${uri}:${hash}`;
  }

  /**
   * Resolves `fetchFn` through cache + in-flight dedupe. `consumed`/`remaining`
   * are credit-accounting fields from the PipiAds response: they only mean
   * something for the caller that actually paid for the request, so a cache
   * hit or a deduped follower always gets `consumed: 0` back — only the one
   * real HTTP call reports what it truly cost.
   */
  async getOrFetch<T>(
    cacheKey: string,
    ttlSec: number,
    fetchFn: () => Promise<{ data: T; consumed: number | null; remaining: number | null }>,
  ): Promise<{ data: T; consumed: number | null; remaining: number | null; fromCache: boolean }> {
    const cached = await this.readCache<T>(cacheKey);
    if (cached !== undefined) {
      this.hits += 1;
      return { data: cached, consumed: 0, remaining: null, fromCache: true };
    }

    const existing = this.inFlight.get(cacheKey) as
      | Promise<{ data: T; consumed: number | null; remaining: number | null }>
      | undefined;
    if (existing) {
      this.hits += 1;
      const result = await existing;
      return { data: result.data, consumed: 0, remaining: result.remaining, fromCache: true };
    }

    this.misses += 1;
    const pending = fetchFn()
      .then(async (result) => {
        await this.writeCache(cacheKey, result.data, ttlSec);
        return result;
      })
      .finally(() => this.inFlight.delete(cacheKey));
    this.inFlight.set(cacheKey, pending);

    const result = await pending;
    return { ...result, fromCache: false };
  }

  private async readCache<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await this.redis.get(key);
      return raw == null ? undefined : (JSON.parse(raw) as T);
    } catch (err) {
      this.logger.debug(`Cache read ${key}: ${err}`);
      return undefined;
    }
  }

  private async writeCache(key: string, value: unknown, ttlSec: number): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', Math.max(1, Math.floor(ttlSec)));
    } catch (err) {
      this.logger.debug(`Cache write ${key}: ${err}`);
    }
  }

  stats() {
    return { hits: this.hits, misses: this.misses };
  }

  resetStats() {
    this.hits = 0;
    this.misses = 0;
  }
}

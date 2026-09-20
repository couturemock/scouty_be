import { ConfigService } from '@nestjs/config';
import type { ConnectionOptions } from 'bullmq';

/**
 * One Redis connection shared by every BullMQ queue/worker in the process.
 * BullMQ needs `maxRetriesPerRequest: null` on the connection (it issues
 * blocking commands) — a plain ioredis default throws without it.
 */
export function buildRedisConnection(config: ConfigService): ConnectionOptions {
  const url = config.get<string>('REDIS_URL')?.trim();
  if (url) {
    return {
      ...parseRedisUrl(url),
      maxRetriesPerRequest: null,
    };
  }
  return {
    host: config.get<string>('REDIS_HOST') ?? 'localhost',
    port: Number(config.get<string>('REDIS_PORT') ?? 6379),
    password: config.get<string>('REDIS_PASSWORD') || undefined,
    tls: config.get<string>('REDIS_TLS') === 'true' ? {} : undefined,
    maxRetriesPerRequest: null,
  };
}

/** redis[s]://[:password@]host:port[/db] → discrete ioredis options. */
function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    tls: parsed.protocol === 'rediss:' ? {} : undefined,
    db: parsed.pathname && parsed.pathname !== '/' ? Number(parsed.pathname.slice(1)) : undefined,
  };
}

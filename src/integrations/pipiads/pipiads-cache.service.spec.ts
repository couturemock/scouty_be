import { ConfigService } from '@nestjs/config';
import { PipiAdsCacheService } from './pipiads-cache.service';

jest.mock('ioredis', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => {
      const store = new Map<string, string>();
      return {
        get: (key: string) => Promise.resolve(store.has(key) ? store.get(key)! : null),
        set: (key: string, value: string) => {
          store.set(key, value);
          return Promise.resolve('OK');
        },
        on: jest.fn(),
      };
    }),
  };
});

function config(): ConfigService {
  return { get: () => undefined } as unknown as ConfigService;
}

describe('PipiAdsCacheService', () => {
  it('key() is stable regardless of param order', () => {
    const cache = new PipiAdsCacheService(config());
    expect(cache.key('/x', { a: 1, b: 2 })).toBe(cache.key('/x', { b: 2, a: 1 }));
    expect(cache.key('/x', { a: 1 })).not.toBe(cache.key('/x', { a: 2 }));
  });

  it('caches a fetch result: first call misses and pays, second hits for free', async () => {
    const cache = new PipiAdsCacheService(config());
    const key = cache.key('/v3/api/open/adspy/list', { a: 1 });
    const fetchFn = jest.fn().mockResolvedValue({ data: { foo: 'bar' }, consumed: 5, remaining: 100 });

    const first = await cache.getOrFetch(key, 60, fetchFn);
    expect(first).toEqual({ data: { foo: 'bar' }, consumed: 5, remaining: 100, fromCache: false });

    const second = await cache.getOrFetch(key, 60, fetchFn);
    expect(second).toEqual({ data: { foo: 'bar' }, consumed: 0, remaining: null, fromCache: true });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(cache.stats()).toEqual({ hits: 1, misses: 1 });
  });

  it('dedupes concurrent calls for the same key — only the leader pays', async () => {
    const cache = new PipiAdsCacheService(config());
    const key = cache.key('/v3/api/open/adspy/detail', { id: 'v1' });
    let resolveFetch!: (v: { data: { ok: boolean }; consumed: number; remaining: number }) => void;
    const fetchFn = jest.fn(
      () =>
        new Promise<{ data: { ok: boolean }; consumed: number; remaining: number }>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const p1 = cache.getOrFetch(key, 60, fetchFn);
    const p2 = cache.getOrFetch(key, 60, fetchFn);
    // Let the leader's `readCache` (itself an async Redis read) resolve and
    // actually invoke `fetchFn` before we resolve it.
    await new Promise((r) => setImmediate(r));
    resolveFetch({ data: { ok: true }, consumed: 1, remaining: 10 });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(r1).toEqual({ data: { ok: true }, consumed: 1, remaining: 10, fromCache: false });
    expect(r2).toEqual({ data: { ok: true }, consumed: 0, remaining: 10, fromCache: true });
    expect(cache.stats()).toEqual({ hits: 1, misses: 1 });
  });

  it('resetStats clears hits/misses', async () => {
    const cache = new PipiAdsCacheService(config());
    const key = cache.key('/x', {});
    await cache.getOrFetch(key, 60, () => Promise.resolve({ data: 1, consumed: 1, remaining: null }));
    expect(cache.stats().misses).toBe(1);
    cache.resetStats();
    expect(cache.stats()).toEqual({ hits: 0, misses: 0 });
  });
});

import { ConfigService } from '@nestjs/config';
import { PipiAdsClient } from './pipiads.client';
import { PipiAdsCacheService } from './pipiads-cache.service';

function config(values: Record<string, string> = {}): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

/** Bypasses caching entirely — just runs `fetchFn` so we test `rawCall` directly. */
function passthroughCache(): PipiAdsCacheService {
  return {
    key: (uri: string) => uri,
    getOrFetch: async (_key: string, _ttl: number, fetchFn: () => Promise<unknown>) => {
      const result = (await fetchFn()) as { data: unknown; consumed: number | null; remaining: number | null };
      return { ...result, fromCache: false };
    },
  } as unknown as PipiAdsCacheService;
}

function okResponse(body: unknown) {
  return { ok: true, status: 200, statusText: 'OK', json: () => Promise.resolve(body) };
}

const SUCCESS_BODY = { code: 200, data: { foo: 'bar' }, consumed_credits: 1, remaining_credits: 10 };

describe('PipiAdsClient.callWithMeta (retry on transient network errors)', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('retries once on ECONNRESET and succeeds', async () => {
    const connReset = Object.assign(new TypeError('fetch failed'), {
      cause: { code: 'ECONNRESET' },
    });
    const fetchMock = jest.fn().mockRejectedValueOnce(connReset).mockResolvedValueOnce(okResponse(SUCCESS_BODY));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new PipiAdsClient(config({ PIPIADS_API_KEY: 'k' }), passthroughCache());
    const result = await client.callWithMeta('/v3/api/open/adspy/detail', { id: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ data: { foo: 'bar' }, consumed: 1, remaining: 10 });
  });

  it('gives up after one retry (does not loop forever)', async () => {
    const connReset = Object.assign(new TypeError('fetch failed'), {
      cause: { code: 'ECONNRESET' },
    });
    const fetchMock = jest.fn().mockRejectedValue(connReset);
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new PipiAdsClient(config({ PIPIADS_API_KEY: 'k' }), passthroughCache());
    await expect(client.callWithMeta('/v3/api/open/adspy/detail', { id: 1 })).rejects.toThrow('fetch failed');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not retry a non-transient error (e.g. a real API error response)', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      okResponse({ code: 401, message: 'API key inválida' }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new PipiAdsClient(config({ PIPIADS_API_KEY: 'k' }), passthroughCache());
    await expect(client.callWithMeta('/v3/api/open/adspy/detail', { id: 1 })).rejects.toThrow(
      'PipiAds API 401',
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('succeeds on the first try when there is no error', async () => {
    const fetchMock = jest.fn().mockResolvedValue(okResponse(SUCCESS_BODY));
    global.fetch = fetchMock as unknown as typeof fetch;

    const client = new PipiAdsClient(config({ PIPIADS_API_KEY: 'k' }), passthroughCache());
    const result = await client.callWithMeta('/v3/api/open/adspy/detail', { id: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: { foo: 'bar' }, consumed: 1, remaining: 10 });
  });
});

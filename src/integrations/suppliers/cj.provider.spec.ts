import { ConfigService } from '@nestjs/config';
import { CjSupplierProvider } from './cj.provider';

function config(values: Record<string, string> = {}): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: () => Promise.resolve(body) };
}

const AUTH_RESPONSE = {
  code: 200,
  data: {
    accessToken: 'tok-1',
    refreshToken: 'refresh-1',
    accessTokenExpiryDate: new Date(Date.now() + 86_400_000).toISOString(),
  },
};

const EMPTY_LIST_RESPONSE = { code: 200, data: { content: [] } };

describe('CjSupplierProvider auth', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('dedupes concurrent auth requests when no token is cached yet', async () => {
    // Real bug found live: two products looked up in parallel at ingest
    // start (no cached token) each fired their own UNPACED auth request,
    // blowing past CJ's "1 request/second" auth limit ("Too Many
    // Requests, QPS limit is 1 time/1second").
    const fetchMock = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/authentication/getAccessToken')) {
        return Promise.resolve(jsonResponse(AUTH_RESPONSE));
      }
      return Promise.resolve(jsonResponse(EMPTY_LIST_RESPONSE));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new CjSupplierProvider(config({ CJ_API_KEY: 'user@api@key', CJ_RPS: '100' }));

    // Two concurrent lookups, no `await` in between — same race the bug report hit.
    const [a, b] = await Promise.all([
      provider.findRelated('Posture Corrector Brace', 5, 29, 'ES'),
      provider.findRelated('Makeup Bag Portable', 5, 29, 'ES'),
    ]);

    expect(a).toEqual([]);
    expect(b).toEqual([]);
    const authCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/authentication/getAccessToken'),
    );
    expect(authCalls).toHaveLength(1);
  });

  it('paces the auth request through the same queue as data requests', async () => {
    const callOrder: string[] = [];
    const fetchMock = jest.fn().mockImplementation((url: string) => {
      const isAuth = String(url).includes('/authentication/getAccessToken');
      callOrder.push(isAuth ? 'auth' : 'list');
      return Promise.resolve(jsonResponse(isAuth ? AUTH_RESPONSE : EMPTY_LIST_RESPONSE));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new CjSupplierProvider(config({ CJ_API_KEY: 'user@api@key', CJ_RPS: '100' }));
    await provider.findRelated('Posture Corrector Brace', 5, 29, 'ES');

    expect(callOrder).toEqual(['auth', 'list']);
  });

  it('reuses the cached token for a second lookup — no second auth call', async () => {
    const fetchMock = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/authentication/getAccessToken')) {
        return Promise.resolve(jsonResponse(AUTH_RESPONSE));
      }
      return Promise.resolve(jsonResponse(EMPTY_LIST_RESPONSE));
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const provider = new CjSupplierProvider(config({ CJ_API_KEY: 'user@api@key', CJ_RPS: '100' }));
    await provider.findRelated('Posture Corrector Brace', 5, 29, 'ES');
    await provider.findRelated('Makeup Bag Portable', 5, 29, 'ES');

    const authCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/authentication/getAccessToken'),
    );
    expect(authCalls).toHaveLength(1);
  });
});

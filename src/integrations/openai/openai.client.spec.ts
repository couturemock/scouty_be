import { ConfigService } from '@nestjs/config';
import { OpenAiClient, sameUrl } from './openai.client';

function config(values: Record<string, string> = {}): ConfigService {
  return { get: (key: string) => values[key] } as unknown as ConfigService;
}

function mockFetchJson(body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: () => Promise.resolve(body),
  });
}

describe('sameUrl', () => {
  it('matches two identical URLs', () => {
    expect(sameUrl('https://x.com/p', 'https://x.com/p')).toBe(true);
  });

  it('ignores utm_* tracking params OpenAI appends to search results', () => {
    expect(sameUrl('https://x.com/p?utm_source=openai', 'https://x.com/p')).toBe(true);
    expect(sameUrl('https://x.com/p', 'https://x.com/p?utm_source=openai&utm_medium=ai')).toBe(true);
  });

  it('still distinguishes genuinely different URLs', () => {
    expect(sameUrl('https://x.com/a', 'https://x.com/b')).toBe(false);
  });

  it('keeps non-utm query params significant', () => {
    expect(sameUrl('https://x.com/p?id=1', 'https://x.com/p?id=2')).toBe(false);
  });
});

describe('OpenAiClient.searchWeb', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('sends tool_choice=required and requests web_search_call sources', async () => {
    const fetchMock = mockFetchJson({ output: [] });
    global.fetch = fetchMock as unknown as typeof fetch;
    const client = new OpenAiClient(config({ OPENAI_API_KEY: 'sk-test' }));

    await client.searchWeb({ instructions: 'inst', query: 'q' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tool_choice).toBe('required');
    expect(body.include).toEqual(['web_search_call.action.sources']);
  });

  it('builds citations from web_search_call sources even when the message has zero annotations', async () => {
    // Real case found live: a genuine search ran and returned real results,
    // but the model's JSON-only answer meant the final message carried zero
    // `url_citation` annotations — the inline-citation mechanism only fires
    // for prose, not for URLs the model copies into a JSON field.
    const fetchMock = mockFetchJson({
      output: [
        {
          type: 'web_search_call',
          action: {
            sources: [
              { type: 'url', url: 'https://www.alibaba.com/product-detail/x.html?utm_source=openai' },
              { type: 'url', url: 'https://www.alibaba.com/discover/y.html?utm_source=openai' },
            ],
          },
        },
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: '{"found": true, "url": "https://www.alibaba.com/product-detail/x.html"}',
              annotations: [],
            },
          ],
        },
      ],
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const client = new OpenAiClient(config({ OPENAI_API_KEY: 'sk-test' }));

    const result = await client.searchWeb({ instructions: 'inst', query: 'q' });

    expect(result.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ url: 'https://www.alibaba.com/product-detail/x.html?utm_source=openai' }),
      ]),
    );
  });

  it('dedupes a URL that appears in both annotations and sources', async () => {
    const fetchMock = mockFetchJson({
      output: [
        {
          type: 'web_search_call',
          action: { sources: [{ type: 'url', url: 'https://x.com/p' }] },
        },
        {
          type: 'message',
          content: [
            {
              type: 'output_text',
              text: 'texto',
              annotations: [{ type: 'url_citation', url: 'https://x.com/p', title: 'P' }],
            },
          ],
        },
      ],
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const client = new OpenAiClient(config({ OPENAI_API_KEY: 'sk-test' }));

    const result = await client.searchWeb({ instructions: 'inst', query: 'q' });
    expect(result.citations).toHaveLength(1);
  });
});

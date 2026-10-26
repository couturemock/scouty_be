import { ConfigService } from '@nestjs/config';
import { AiSupplierSearchProvider } from './ai-supplier-search.provider';
import { OpenAiClient, WebSearchResult } from './openai.client';

function client(searchWeb: jest.Mock): OpenAiClient {
  return { enabled: () => true, searchWeb } as unknown as OpenAiClient;
}

function config(overrides: Record<string, string> = {}): ConfigService {
  return { get: (key: string) => overrides[key] } as unknown as ConfigService;
}

function result(text: string, urls: string[] = []): WebSearchResult {
  return { text, citations: urls.map((url) => ({ url })) };
}

describe('AiSupplierSearchProvider', () => {
  it('is a no-op when disabled via config', async () => {
    const searchWeb = jest.fn();
    const provider = new AiSupplierSearchProvider(
      client(searchWeb),
      config({ AI_SUPPLIER_FALLBACK_ENABLED: 'false' }),
    );
    expect(await provider.findPrice('Posture Corrector Brace', 29, 'ES')).toBeNull();
    expect(searchWeb).not.toHaveBeenCalled();
  });

  it('rejects a price whose URL was never actually cited (model typed it, did not retrieve it)', async () => {
    const searchWeb = jest.fn().mockResolvedValue(
      result(
        '{"found": true, "name": "Posture Corrector Brace", "price": 4.5, "currency": "USD", "url": "https://x.com/made-up"}',
        [], // no real citation
      ),
    );
    const provider = new AiSupplierSearchProvider(client(searchWeb), config());
    expect(await provider.findPrice('Posture Corrector Brace', 29, 'ES')).toBeNull();
  });

  it('rejects when found=false', async () => {
    const searchWeb = jest.fn().mockResolvedValue(result('{"found": false}'));
    const provider = new AiSupplierSearchProvider(client(searchWeb), config());
    expect(await provider.findPrice('Posture Corrector Brace', 29, 'ES')).toBeNull();
  });

  it('rejects a non-numeric or zero price', async () => {
    const searchWeb = jest.fn().mockResolvedValue(
      result(
        '{"found": true, "name": "Posture Corrector Brace", "price": 0, "currency": "USD", "url": "https://x.com/p"}',
        ['https://x.com/p'],
      ),
    );
    const provider = new AiSupplierSearchProvider(client(searchWeb), config());
    expect(await provider.findPrice('Posture Corrector Brace', 29, 'ES')).toBeNull();
  });

  it('rejects when the listing name does not match the product', async () => {
    const searchWeb = jest.fn().mockResolvedValue(
      result(
        '{"found": true, "name": "Wireless Earbuds Pro", "price": 4.5, "currency": "USD", "url": "https://x.com/p"}',
        ['https://x.com/p'],
      ),
    );
    const provider = new AiSupplierSearchProvider(client(searchWeb), config());
    expect(await provider.findPrice('Posture Corrector Brace', 29, 'ES')).toBeNull();
  });

  it('returns a live AI-sourced offer when everything checks out', async () => {
    const searchWeb = jest.fn().mockResolvedValue(
      result(
        '{"found": true, "name": "Posture Corrector Brace Adjustable", "price": 4.5, "currency": "USD", "url": "https://x.com/p"}',
        ['https://x.com/p'],
      ),
    );
    const provider = new AiSupplierSearchProvider(client(searchWeb), config());
    const offer = await provider.findPrice('Posture Corrector Brace', 29, 'ES');
    expect(offer).toMatchObject({
      source: 'ai',
      kind: 'live',
      listingUrl: 'https://x.com/p',
      name: 'Posture Corrector Brace Adjustable',
    });
    expect(offer!.unitPriceEur).toBeGreaterThan(0);
  });

  it('tags the offer as source "alibaba" when the citation is on alibaba.com', async () => {
    const searchWeb = jest.fn().mockResolvedValue(
      result(
        '{"found": true, "name": "Posture Corrector Brace Adjustable", "price": 4.5, "currency": "USD", "url": "https://www.alibaba.com/product-detail/posture-corrector_123.html"}',
        ['https://www.alibaba.com/product-detail/posture-corrector_123.html'],
      ),
    );
    const provider = new AiSupplierSearchProvider(client(searchWeb), config());
    const offer = await provider.findPrice('Posture Corrector Brace', 29, 'ES');
    expect(offer?.source).toBe('alibaba');
    expect(offer?.note).toMatch(/Alibaba/);
  });

  it('never throws — a client error degrades to null', async () => {
    const searchWeb = jest.fn().mockRejectedValue(new Error('network'));
    const provider = new AiSupplierSearchProvider(client(searchWeb), config());
    expect(await provider.findPrice('Posture Corrector Brace', 29, 'ES')).toBeNull();
  });
});

describe('AiSupplierSearchProvider.findPricesBatch', () => {
  it('is a no-op when disabled', async () => {
    const searchWeb = jest.fn();
    const provider = new AiSupplierSearchProvider(
      client(searchWeb),
      config({ AI_SUPPLIER_FALLBACK_ENABLED: 'false' }),
    );
    const results = await provider.findPricesBatch(
      [{ title: 'Posture Corrector Brace' }, { title: 'Makeup Bag' }],
      'ES',
    );
    expect(results).toEqual([null, null]);
    expect(searchWeb).not.toHaveBeenCalled();
  });

  it('runs one independent searchWeb call per item — no shared multi-item prompt', async () => {
    // The old implementation packed every item into one prompt; live testing
    // showed the model sometimes did a real search for only one of them and
    // fabricated a URL for the rest. Each item must get its own real search.
    const searchWeb = jest.fn().mockResolvedValue(result('{"found": false}'));
    const provider = new AiSupplierSearchProvider(
      client(searchWeb),
      config({ AI_SUPPLIER_BATCH_SIZE: '2' }),
    );
    await provider.findPricesBatch(
      [{ title: 'A' }, { title: 'B' }, { title: 'C' }, { title: 'D' }, { title: 'E' }],
      'ES',
    );
    expect(searchWeb).toHaveBeenCalledTimes(5);
  });

  it('bounds concurrency to AI_SUPPLIER_BATCH_SIZE items in flight at a time', async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const searchWeb = jest.fn().mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return result('{"found": false}');
    });
    const provider = new AiSupplierSearchProvider(
      client(searchWeb),
      config({ AI_SUPPLIER_BATCH_SIZE: '2' }),
    );
    await provider.findPricesBatch(
      [{ title: 'A' }, { title: 'B' }, { title: 'C' }, { title: 'D' }, { title: 'E' }],
      'ES',
    );
    expect(maxInFlight).toBeLessThanOrEqual(2);
  });

  it('maps each real result back to its own product, independent of other items in the group', async () => {
    const searchWeb = jest.fn().mockImplementation(async (input: { query: string }) => {
      if (input.query.includes('Makeup Bag')) {
        return result(
          '{"found": true, "name": "Makeup Bag Portable Large", "price": 2.5, "currency": "USD", "url": "https://x.com/bag"}',
          ['https://x.com/bag'],
        );
      }
      return result('{"found": false}');
    });
    const provider = new AiSupplierSearchProvider(client(searchWeb), config({ AI_SUPPLIER_BATCH_SIZE: '5' }));
    const results = await provider.findPricesBatch(
      [{ title: 'Posture Corrector Brace' }, { title: 'Makeup Bag Portable Large' }],
      'ES',
    );
    expect(results[0]).toBeNull();
    expect(results[1]).toMatchObject({ listingUrl: 'https://x.com/bag' });
  });

  it('still rejects an individual item that fails validation inside a group', async () => {
    const searchWeb = jest.fn().mockResolvedValue(
      result(
        '{"found": true, "name": "Posture Corrector Brace", "price": 4.5, "currency": "USD", "url": "https://x.com/never-cited"}',
        [], // no real citation for that url
      ),
    );
    const provider = new AiSupplierSearchProvider(client(searchWeb), config({ AI_SUPPLIER_BATCH_SIZE: '5' }));
    const results = await provider.findPricesBatch([{ title: 'Posture Corrector Brace' }], 'ES');
    expect(results).toEqual([null]);
  });

  it('never throws — one item erroring out degrades only that item, not the rest of the group', async () => {
    const searchWeb = jest
      .fn()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(
        result(
          '{"found": true, "name": "Makeup Bag Portable Large", "price": 2.5, "currency": "USD", "url": "https://x.com/bag"}',
          ['https://x.com/bag'],
        ),
      );
    const provider = new AiSupplierSearchProvider(client(searchWeb), config({ AI_SUPPLIER_BATCH_SIZE: '5' }));
    const results = await provider.findPricesBatch(
      [{ title: 'Posture Corrector Brace' }, { title: 'Makeup Bag Portable Large' }],
      'ES',
    );
    expect(results[0]).toBeNull();
    expect(results[1]).toMatchObject({ listingUrl: 'https://x.com/bag' });
  });
});

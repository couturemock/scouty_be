import { ConfigService } from '@nestjs/config';
import { AiAdSearchProvider } from './ai-ad-search.provider';
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

const REAL_AD_URL = 'https://www.facebook.com/ads/library/?id=123456789';

describe('AiAdSearchProvider', () => {
  it('is a no-op when disabled via config', async () => {
    const searchWeb = jest.fn();
    const provider = new AiAdSearchProvider(client(searchWeb), config({ AI_ADS_FALLBACK_ENABLED: 'false' }));
    expect(await provider.findAd('Posture Corrector Brace', 'ES')).toBeNull();
    expect(searchWeb).not.toHaveBeenCalled();
  });

  it('rejects a URL the model typed but never actually cited', async () => {
    const searchWeb = jest.fn().mockResolvedValue(
      result(
        `{"found": true, "platform": "facebook", "title": "Posture Corrector Brace ad", "url": "${REAL_AD_URL}"}`,
        [], // no real citation
      ),
    );
    const provider = new AiAdSearchProvider(client(searchWeb), config());
    expect(await provider.findAd('Posture Corrector Brace', 'ES')).toBeNull();
  });

  it('rejects when found=false', async () => {
    const searchWeb = jest.fn().mockResolvedValue(result('{"found": false}'));
    const provider = new AiAdSearchProvider(client(searchWeb), config());
    expect(await provider.findAd('Posture Corrector Brace', 'ES')).toBeNull();
  });

  it('rejects a URL that is not really an ad page (bare homepage)', async () => {
    const searchWeb = jest.fn().mockResolvedValue(
      result(
        '{"found": true, "platform": "tiktok", "title": "Posture Corrector Brace", "url": "https://www.tiktok.com/"}',
        ['https://www.tiktok.com/'],
      ),
    );
    const provider = new AiAdSearchProvider(client(searchWeb), config());
    expect(await provider.findAd('Posture Corrector Brace', 'ES')).toBeNull();
  });

  it('rejects when the ad title does not match the product', async () => {
    const searchWeb = jest.fn().mockResolvedValue(
      result(
        `{"found": true, "platform": "facebook", "title": "Wireless earbuds charging case", "url": "${REAL_AD_URL}"}`,
        [REAL_AD_URL],
      ),
    );
    const provider = new AiAdSearchProvider(client(searchWeb), config());
    expect(await provider.findAd('Posture Corrector Brace', 'ES')).toBeNull();
  });

  it('returns a real ad when everything checks out', async () => {
    const searchWeb = jest.fn().mockResolvedValue(
      result(
        `{"found": true, "platform": "facebook", "title": "Posture Corrector Brace - fixes your back", "url": "${REAL_AD_URL}"}`,
        [REAL_AD_URL],
      ),
    );
    const provider = new AiAdSearchProvider(client(searchWeb), config());
    const ad = await provider.findAd('Posture Corrector Brace', 'ES');
    expect(ad).toMatchObject({
      platform: 'facebook',
      sourceUrl: REAL_AD_URL,
      publicSignals: { linkKind: 'ad' },
    });
  });

  it('never throws — a client error degrades to null', async () => {
    const searchWeb = jest.fn().mockRejectedValue(new Error('network'));
    const provider = new AiAdSearchProvider(client(searchWeb), config());
    expect(await provider.findAd('Posture Corrector Brace', 'ES')).toBeNull();
  });
});

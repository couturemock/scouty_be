import { DropshipPrefilterProvider } from './dropship-prefilter.provider';
import { OpenAiClient } from './openai.client';
import { DiscoveredAd } from '../../discovery/discovery.types';

function ad(videoId: string, copy: string): DiscoveredAd {
  return {
    videoId,
    platform: 'tiktok',
    copy,
    advertiser: null,
    advertiserId: null,
    storeId: 's1',
    shopType: 'shopify',
    dataTypes: [1],
    buttonText: null,
    putDays: 5,
    plays: 1000,
    likes: 10,
    comments: 0,
    shares: 0,
    firstSeenAt: null,
    lastSeenAt: null,
    aiTags: [],
    pass: 'new',
    creative: { platform: 'tiktok', title: copy },
  };
}

function client(overrides?: Partial<OpenAiClient>): OpenAiClient {
  return {
    enabled: () => true,
    completeJson: jest.fn(),
    ...overrides,
  } as unknown as OpenAiClient;
}

describe('DropshipPrefilterProvider', () => {
  it('is a no-op when disabled (no OPENAI_API_KEY)', async () => {
    const prefilter = new DropshipPrefilterProvider(client({ enabled: () => false }));
    const verdicts = await prefilter.filter([ad('v1', 'posture corrector')]);
    expect(verdicts.size).toBe(0);
  });

  it('maps OpenAI verdicts by ad id', async () => {
    const completeJson = jest.fn().mockResolvedValue({
      items: [
        { id: 'v1', apto: true, motivo: 'producto físico de impulso' },
        { id: 'v2', apto: false, motivo: 'app, no producto' },
      ],
    });
    const prefilter = new DropshipPrefilterProvider(client({ completeJson }));
    const verdicts = await prefilter.filter([
      ad('v1', 'posture corrector fixes your back'),
      ad('v2', 'download our app now'),
    ]);
    expect(verdicts.get('v1')?.apto).toBe(true);
    expect(verdicts.get('v2')?.apto).toBe(false);
  });

  it('batches in groups and keeps going if one batch fails (fail-open)', async () => {
    const completeJson = jest
      .fn()
      .mockRejectedValueOnce(new Error('rate limited'))
      .mockResolvedValueOnce({ items: [{ id: 'v2', apto: true, motivo: 'ok' }] });
    const prefilter = new DropshipPrefilterProvider(client({ completeJson }));
    const verdicts = await prefilter.filter([ad('v1', 'a'), ad('v2', 'b')], 1);

    expect(completeJson).toHaveBeenCalledTimes(2);
    expect(verdicts.has('v1')).toBe(false); // failed batch → no verdict → caller keeps it
    expect(verdicts.get('v2')?.apto).toBe(true);
  });
});

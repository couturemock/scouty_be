import { DropshipPrefilterProvider } from './dropship-prefilter.provider';
import { OpenAiClient } from './openai.client';
import { DiscoveredAd } from '../../discovery/discovery.types';

function ad(
  videoId: string,
  copy: string,
  script: string | null = null,
  aiTags: string[] = [],
): DiscoveredAd {
  return {
    videoId,
    platform: 'tiktok',
    copy,
    script,
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
    aiTags,
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

  it("sends the ad's full script to OpenAI instead of just the on-screen hook, when PipiAds has one", async () => {
    // Real case found live: the hook alone ("Genetics.") says nothing about
    // the product; PipiAds' own transcript of the same ad ("...It's a
    // hydrating serum and gentle exfoliator...") does. The hook must never
    // be sent once a script exists.
    const completeJson = jest.fn().mockResolvedValue({ items: [] });
    const prefilter = new DropshipPrefilterProvider(client({ completeJson }));
    await prefilter.filter([
      ad('v1', 'Genetics.', "Genetics. No. But how? It's a hydrating serum and exfoliator."),
    ]);

    const sentPayload = JSON.parse(completeJson.mock.calls[0]![0].user);
    expect(sentPayload[0].texto).toContain('hydrating serum');
    expect(sentPayload[0].texto).not.toBe('Genetics.');
  });

  it('falls back to the hook when the ad has no script', async () => {
    const completeJson = jest.fn().mockResolvedValue({ items: [] });
    const prefilter = new DropshipPrefilterProvider(client({ completeJson }));
    await prefilter.filter([ad('v1', 'posture corrector fixes your back', null)]);

    const sentPayload = JSON.parse(completeJson.mock.calls[0]![0].user);
    expect(sentPayload[0].texto).toBe('posture corrector fixes your back');
  });

  it("sends PipiAds' own AI tags alongside the text, as extra category signal", async () => {
    // Asked for explicitly: a short/ambiguous hook ("Genetics.") plus tags
    // like #skincare #serum should give the model enough to decide, even
    // with no script and no detail credit spent yet.
    const completeJson = jest.fn().mockResolvedValue({ items: [] });
    const prefilter = new DropshipPrefilterProvider(client({ completeJson }));
    await prefilter.filter([ad('v1', 'Genetics.', null, ['#skincare', '#serum', '#beauty'])]);

    const sentPayload = JSON.parse(completeJson.mock.calls[0]![0].user);
    expect(sentPayload[0].tags).toEqual(['#skincare', '#serum', '#beauty']);
  });

  it('caps tags sent per ad to 8, to keep the batch prompt small', async () => {
    const completeJson = jest.fn().mockResolvedValue({ items: [] });
    const prefilter = new DropshipPrefilterProvider(client({ completeJson }));
    const manyTags = Array.from({ length: 20 }, (_, i) => `#tag${i}`);
    await prefilter.filter([ad('v1', 'a', null, manyTags)]);

    const sentPayload = JSON.parse(completeJson.mock.calls[0]![0].user);
    expect(sentPayload[0].tags).toHaveLength(8);
  });
});

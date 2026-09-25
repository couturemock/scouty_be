import { PipiAdsProvider } from './pipiads.provider';

/**
 * Regression for a real bug found via a live ingest (Ad Winners, week
 * 2026-W39): `searchAdsForProduct(seed, ..., { looseRelevance: true })`
 * used to fall back to "top engagement regardless of relevance" whenever
 * nothing cleared the relevance bar — which surfaced completely unrelated
 * viral clips (a Fortnite ad, a beauty ASMR video, a Motrin post) attached
 * to products like "Portable Blender" / "Neck Massager". Every ad shown
 * must actually be about the product it's attached to.
 */
describe('PipiAdsProvider.searchAdsForProduct — relevance regression', () => {
  function makeProvider(rawTikTokAds: Record<string, unknown>[]) {
    const client = {
      enabled: () => true,
      call: jest.fn().mockImplementation((_path: string, params: { plat_type: number }) => {
        if (params.plat_type === 1) {
          return Promise.resolve({ list: rawTikTokAds });
        }
        return Promise.resolve({ list: [] });
      }),
    };
    const config = { get: jest.fn().mockReturnValue(undefined) };
    return new PipiAdsProvider(client as never, config as never);
  }

  it('drops entirely unrelated high-engagement ads instead of falling back to them', async () => {
    const provider = makeProvider([
      {
        // Genuinely relevant: shares tokens with the seed.
        desc: 'This portable blender changed my smoothie game',
        play_count: 1000,
        digg_count: 10,
        id: '1',
      },
      {
        // High engagement, zero relevance — the old fallback used to keep this.
        desc: '#EpicPartner @Fortnite Official is back in the App Store! Download it now',
        play_count: 219_254_405,
        digg_count: 50_000,
        id: '2',
      },
    ]);

    const { ads } = await provider.searchAdsForProduct('portable blender', 'ES', 8, {
      looseRelevance: true,
    });

    expect(ads.some((a) => /fortnite/i.test(a.title))).toBe(false);
    expect(ads.every((a) => /blender/i.test(a.title))).toBe(true);
  });

  it('returns zero ads (not wrong ones) when nothing found is relevant', async () => {
    const provider = makeProvider([
      {
        desc: '#EpicPartner @Fortnite Official is back in the App Store! Download it now',
        play_count: 219_254_405,
        digg_count: 50_000,
        id: '2',
      },
    ]);

    const { ads } = await provider.searchAdsForProduct('portable blender', 'ES', 8, {
      looseRelevance: true,
    });

    expect(ads).toHaveLength(0);
  });
});

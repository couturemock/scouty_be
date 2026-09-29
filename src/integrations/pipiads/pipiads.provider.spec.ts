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
      call: jest
        .fn()
        .mockImplementation((_path: string, params: { plat_type: number }) => {
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

    const { ads } = await provider.searchAdsForProduct(
      'portable blender',
      'ES',
      8,
      {
        looseRelevance: true,
      },
    );

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

    const { ads } = await provider.searchAdsForProduct(
      'portable blender',
      'ES',
      8,
      {
        looseRelevance: true,
      },
    );

    expect(ads).toHaveLength(0);
  });
});

/**
 * Discovery mode has no product query to compare against, so it can't reuse
 * `filterAdsByRelevance` — instead it must drop non-product ads (app
 * installs, gambling, dating, political) by category, on whatever page of
 * "top ads for this market" PipiAds returns.
 */
describe('PipiAdsProvider.discoverTopAds', () => {
  function makeProvider(
    rawAdsByPlatform: (platType: number) => Record<string, unknown>[],
  ) {
    const client = {
      enabled: () => true,
      call: jest
        .fn()
        .mockImplementation(
          (
            _path: string,
            params: { plat_type: number; current_page: number },
          ) => {
            if (params.current_page > 1) return Promise.resolve({ list: [] });
            return Promise.resolve({
              list: rawAdsByPlatform(params.plat_type),
            });
          },
        ),
    };
    const config = { get: jest.fn().mockReturnValue(undefined) };
    return new PipiAdsProvider(client as never, config as never);
  }

  it('drops app-install/gambling/dating ads and keeps real product ads', async () => {
    const provider = makeProvider((platType) =>
      platType === 1
        ? [
            {
              desc: 'This neck massager is a game changer for desk workers',
              play_count: 5000,
              digg_count: 200,
              id: 'tt-1',
            },
            {
              desc: 'Download the app now and win big at our casino!',
              play_count: 900_000,
              digg_count: 30_000,
              id: 'tt-2',
            },
          ]
        : [
            {
              desc: 'Find singles near you on our dating app today',
              play_count: 400_000,
              digg_count: 10_000,
              id: 'fb-1',
            },
          ],
    );

    const { ads } = await provider.discoverTopAds('ES', 20, { pages: 1 });

    expect(ads.some((a) => /massager/i.test(a.title))).toBe(true);
    expect(ads.some((a) => /casino/i.test(a.title))).toBe(false);
    expect(ads.some((a) => /dating/i.test(a.title))).toBe(false);
  });

  it('does not require a keyword/query to return results', async () => {
    const provider = makeProvider((platType) =>
      platType === 1
        ? [
            {
              desc: 'Posture corrector for better sitting habits',
              play_count: 1000,
              digg_count: 50,
              id: 'tt-3',
            },
          ]
        : [],
    );

    const { ads } = await provider.discoverTopAds('US', 10, { pages: 1 });
    expect(ads).toHaveLength(1);
    expect(ads[0].title).toMatch(/posture corrector/i);
  });
});

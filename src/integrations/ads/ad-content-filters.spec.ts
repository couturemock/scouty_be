import { filterRealProductAds, isNonProductAd } from './ad-content-filters';

/**
 * Discovery mode (Ad Winners scanning top ads without a keyword) has no seed
 * to score relevance against, so a category denylist is the only thing
 * standing between "real dropshippable product ad" and the app-install /
 * gambling / dating / political noise a keyword-less scan otherwise surfaces
 * (client-requested: ads must be for real, useful dropshipping products).
 */
describe('ad-content-filters', () => {
  it('flags app-install, gambling, dating and political ads as non-product', () => {
    expect(
      isNonProductAd({ title: 'Download the app now on the App Store!' }),
    ).toBe(true);
    expect(
      isNonProductAd({ title: 'Best casino slots, play now and win big' }),
    ).toBe(true);
    expect(
      isNonProductAd({ title: 'Find your match on our dating app today' }),
    ).toBe(true);
    expect(
      isNonProductAd({ title: 'Vote for candidate Smith this November' }),
    ).toBe(true);
    expect(
      isNonProductAd({
        title: 'Necesitas un préstamo rápido? Solicítalo aquí',
      }),
    ).toBe(true);
  });

  it('does not flag a real physical-product ad', () => {
    expect(
      isNonProductAd({
        title: 'This portable blender changed my smoothie game',
      }),
    ).toBe(false);
    expect(
      isNonProductAd({ title: 'Neck massager relief after long work days' }),
    ).toBe(false);
  });

  it('filterRealProductAds keeps only the product ads', () => {
    const ads = [
      { title: 'This portable blender changed my smoothie game' },
      {
        title:
          '#EpicPartner Fortnite is back in the App Store! Download it now',
      },
      { title: 'LED strip lights transform any room in minutes' },
    ];
    const kept = filterRealProductAds(ads);
    expect(kept.map((a) => a.title)).toEqual([
      'This portable blender changed my smoothie game',
      'LED strip lights transform any room in minutes',
    ]);
  });
});

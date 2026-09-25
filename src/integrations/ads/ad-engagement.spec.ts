import { adRelevanceScore, filterAdsByRelevance } from './ad-engagement';
import { CreativeAd } from '../types';

function ad(title: string, sourceUrl?: string): CreativeAd {
  return { platform: 'tiktok', title, sourceUrl };
}

describe('adRelevanceScore', () => {
  it('does not score a mismatched product as relevant just because the fallback search link echoes the query', () => {
    const fortniteAd = ad(
      '#EpicPartner @Fortnite Official is back in the App Store! Download it now',
      'https://library.tiktok.com/ads?adv_name=portable+blender&region=ES',
    );
    expect(adRelevanceScore(fortniteAd, 'portable blender')).toBe(0);
  });

  it('does not treat a token as matched when it only appears as a substring of a different word (kneemassager vs neck massager)', () => {
    const kneeAd = ad(
      'Replying to @Qua I cannot express how good this feels 😭#kneemassager #kneepain',
    );
    // "massager" is a substring of "kneemassager" but this ad is about a
    // knee massager, not a neck massager — score should not count it.
    expect(adRelevanceScore(kneeAd, 'neck massager')).toBe(0);
  });

  it('matches a genuinely relevant ad by real title tokens', () => {
    const blenderAd = ad('BlendJet 2 is the most convenient portable blender!');
    expect(adRelevanceScore(blenderAd, 'portable blender')).toBe(1);
  });

  it('handles accented tokens correctly at word boundaries', () => {
    const relevantAd = ad('Cápsulas de café Nespresso compatible');
    expect(adRelevanceScore(relevantAd, 'cápsulas café')).toBeGreaterThan(0);
  });
});

describe('filterAdsByRelevance', () => {
  it('drops ads below the relevance threshold', () => {
    const ads = [
      ad('BlendJet 2 portable blender review'),
      ad('#EpicPartner @Fortnite Official is back in the App Store!'),
    ];
    const filtered = filterAdsByRelevance(ads, 'portable blender', 0.2);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]!.title).toContain('blender');
  });
});

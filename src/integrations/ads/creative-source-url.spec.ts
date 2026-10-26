import { rebuildSearchLink, resolveCreativeSourceUrl } from './creative-source-url';

describe('resolveCreativeSourceUrl', () => {
  it('links directly to the TikTok video when PipiAds gives a real aweme id', () => {
    const resolved = resolveCreativeSourceUrl({
      platform: 'tiktok',
      productTitle: 'Posture Corrector Brace',
      raw: { aweme_id: '7123456789012345678' },
    });
    expect(resolved.kind).toBe('ad');
    expect(resolved.url).toBe('https://www.tiktok.com/@scoutly/video/7123456789012345678');
  });

  it('falls back to a search link for Meta when PipiAds gives no archive id', () => {
    const resolved = resolveCreativeSourceUrl({
      platform: 'facebook',
      productTitle: 'Posture Corrector Brace',
      raw: {},
    });
    expect(resolved.kind).toBe('search');
    expect(resolved.url).toContain('facebook.com/ads/library');
  });

  it('links directly to the Meta ad library entry when PipiAds gives a real archive id', () => {
    const resolved = resolveCreativeSourceUrl({
      platform: 'facebook',
      productTitle: 'Posture Corrector Brace',
      raw: { ad_archive_id: '123456789' },
    });
    expect(resolved.kind).toBe('ad');
    expect(resolved.url).toContain('id=123456789');
  });
});

describe('rebuildSearchLink', () => {
  it('replaces a search link built from an unrelated hook line with one from the real product title', () => {
    const creative = {
      platform: 'tiktok' as const,
      sourceUrl: 'https://library.tiktok.com/ads?adv_name=wann+deutschrap+wieder',
      publicSignals: { linkKind: 'search' },
    };
    const rebuilt = rebuildSearchLink(creative, 'Aelfric Eden Off-The-Shoulder Pullover Hoodie', 'ES');
    expect(rebuilt.sourceUrl).not.toContain('deutschrap');
    expect(rebuilt.sourceUrl).toContain('Aelfric');
  });

  it('leaves a direct ad link untouched', () => {
    const creative = {
      platform: 'facebook' as const,
      sourceUrl: 'https://www.facebook.com/ads/library/?id=123',
      publicSignals: { linkKind: 'ad' },
    };
    expect(rebuildSearchLink(creative, 'Some other product', 'ES')).toBe(creative);
  });
});

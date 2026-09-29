import { wordBoundary } from '../shared/brand-denylist';
import { CreativeAd } from '../types';

/**
 * Discovery mode has no seed to score relevance against (see
 * ad-engagement.ts's `filterAdsByRelevance`, which needs a query) — a
 * keyword-less PipiAds scan will surface plenty of ads that aren't for a
 * physical, dropshippable product at all: app installs, gambling, dating,
 * crypto/finance, political and service ads. This is a category denylist on
 * the ad's own copy, independent of that relevance check.
 */
const NON_PRODUCT_AD = wordBoundary(
  'download\\s+(?:the\\s+)?app|install\\s+(?:the\\s+)?app|app\\s+store|google\\s+play|descargar\\s+app|instalar\\s+app|' +
    'casino|bet(?:ting)?\\s+now|apuestas?|sports?\\s*bet|slots?\\b|poker|jackpot|loter[ií]a|' +
    'dating\\s+app|citas\\s+online|singles?\\s+near|encuentra\\s+pareja|' +
    'crypto|bitcoin|forex|trading\\s+signals?|invest(?:ing)?\\s+app|stock\\s+broker|' +
    'loan|pr[eé]stamo|payday|credit\\s+score|tarjeta\\s+de\\s+cr[eé]dito|refinanc|' +
    'insurance\\s+quote|seguro\\s+de\\s+(?:auto|coche|vida|hogar)|' +
    'vote\\s+for|candidate|elecci[oó]n(?:es)?|campaign\\s+ad|' +
    'job\\s+opening|now\\s+hiring|trabaja\\s+desde\\s+casa|gana\\s+dinero\\s+r[aá]pido|' +
    'onlyfans|cam\\s*girl|dating\\s+site',
);

export function isNonProductAd(
  ad: Pick<CreativeAd, 'title'>,
  extraHaystack = '',
): boolean {
  const hay = `${ad.title} ${extraHaystack}`;
  return NON_PRODUCT_AD.test(hay);
}

/**
 * PipiAds' keyword-less "top ads" browse (used for discovery — see
 * `PipiAdsProvider.discoverTopAds`) surfaces plenty of ads whose call to
 * action is installing/opening an app or watching in-app content —
 * TikTok's own "Creator Search Insights" promo, mobile games, fitness apps —
 * rather than selling a physical product. Confirmed live against a real
 * keyword-less pull (region ES/US/GB, 2026-09-29): every one of those had a
 * populated `app_id`, or a `data_type` code of 5 or 6; a same-day pull of
 * known real product ads (searching "portable blender", which reliably
 * returns physical products) never carried either. Not an officially
 * documented PipiAds field — a reverse-engineered signal from the raw
 * payload, not a guaranteed classification, so keep it a soft reject
 * alongside `isNonProductAd`, not the only gate.
 */
const APP_PROMOTION_DATA_TYPES = new Set([5, 6]);

export function isAppPromotionAd(raw: Record<string, unknown>): boolean {
  if (raw.app_id) return true;
  const dataType = raw.data_type;
  if (Array.isArray(dataType)) {
    return dataType.some((t) => APP_PROMOTION_DATA_TYPES.has(Number(t)));
  }
  return false;
}

/** Keeps only ads that look like they're actually selling a physical product. */
export function filterRealProductAds<T extends Pick<CreativeAd, 'title'>>(
  ads: T[],
): T[] {
  return ads.filter((ad) => !isNonProductAd(ad));
}

/**
 * Resolve the best public URL for a creative ad reference.
 * Never return bare library homepages or broken TikTok consumer search pages.
 */

export type CreativePlatform = 'tiktok' | 'facebook' | 'instagram'

const DAY_MS = 86_400_000
const TIKTOK_LIBRARY_WINDOW_DAYS = 90

export function isUselessCreativeUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return true
  try {
    const u = new URL(url)
    const host = u.hostname.replace(/^www\./, '')
    const path = u.pathname.replace(/\/$/, '') || '/'

    if (host === 'tiktok.com' && (path === '/' || path === '')) return true
    // Consumer search often returns TikTok's "Something went wrong" page.
    if (host === 'tiktok.com' && path.startsWith('/search')) return true
    if (host === 'instagram.com' && (path === '/' || path === '')) return true

    if (host.includes('facebook.com') && path.includes('/ads/library')) {
      const hasAd =
        Boolean(u.searchParams.get('id')) ||
        Boolean(u.searchParams.get('q')) ||
        Boolean(u.searchParams.get('view_all_page_id'))
      return !hasAd
    }

    // CDN / mp4 alone is media, not a viewable ad page
    if (/\.(mp4|m3u8|webm)(\?|$)/i.test(u.pathname)) return true
    return false
  } catch {
    return true
  }
}

export function metaAdLibrarySearchUrl(term: string, country = 'ES'): string {
  const q = term.replace(/\s+/g, ' ').trim().slice(0, 80)
  const p = new URLSearchParams({
    active_status: 'active',
    ad_type: 'all',
    country: country.toUpperCase(),
    q,
    search_type: 'keyword_unordered',
    media_type: 'all',
  })
  return `https://www.facebook.com/ads/library/?${p.toString()}`
}

export function metaAdLibraryAdUrl(adId: string, country = 'ALL'): string {
  const p = new URLSearchParams({
    id: String(adId).trim(),
    active_status: 'all',
    ad_type: 'all',
    country: country.toUpperCase(),
    media_type: 'all',
  })
  return `https://www.facebook.com/ads/library/?${p.toString()}`
}

export function tiktokLibraryRegion(country = 'ES'): string {
  const c = country.toUpperCase()
  if (c === 'UK') return 'GB'
  if (['US', 'CA', 'MX', 'BR', 'AU', 'JP'].includes(c)) return 'all'
  return c || 'ES'
}

/**
 * TikTok Commercial Content Library — verified deep link.
 * Do not use tiktok.com/search (frequently errors with "Something went wrong").
 */
export function tiktokAdLibrarySearchUrl(term: string, country = 'ES'): string {
  const now = Math.floor(Date.now() / DAY_MS) * DAY_MS
  const p = new URLSearchParams({
    region: tiktokLibraryRegion(country),
    adv_name: term.replace(/\s+/g, ' ').trim().slice(0, 80),
    query_type: '1',
    start_time: String(now - TIKTOK_LIBRARY_WINDOW_DAYS * DAY_MS),
    end_time: String(now),
  })
  return `https://library.tiktok.com/ads?${p.toString()}`
}

/** @deprecated use tiktokAdLibrarySearchUrl */
export function tiktokSearchUrl(term: string, country = 'ES'): string {
  return tiktokAdLibrarySearchUrl(term, country)
}

export function tiktokVideoUrl(videoId: string): string {
  return `https://www.tiktok.com/@scoutly/video/${videoId}`
}

function pickString(raw: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const v = raw[key]
    if (v == null) continue
    const s = String(v).trim()
    if (s) return s
  }
  return undefined
}

/**
 * Build the best outbound link from a PipiAds (or similar) raw ad payload.
 */
export function resolveCreativeSourceUrl(opts: {
  platform: CreativePlatform
  productTitle: string
  country?: string
  raw?: Record<string, unknown>
  candidates?: Array<string | undefined | null>
}): { url: string; kind: 'ad' | 'search' | 'profile' } {
  const country = (opts.country ?? 'ES').toUpperCase()
  const raw = opts.raw ?? {}
  const candidates = [
    ...(opts.candidates ?? []),
    pickString(raw, [
      'share_url',
      'shareUrl',
      'ad_url',
      'adUrl',
      'source_url',
      'sourceUrl',
      'url',
      'landing_page',
      'landingPage',
      'page_url',
      'pageUrl',
    ]),
  ].filter(Boolean) as string[]

  for (const c of candidates) {
    if (!isUselessCreativeUrl(c)) {
      return { url: c, kind: 'ad' }
    }
  }

  const archiveId = pickString(raw, [
    'ad_archive_id',
    'adArchiveId',
    'facebook_ad_id',
    'facebookAdId',
    'ads_id',
    'adsId',
    'archive_id',
    'meta_ad_id',
  ])
  if (archiveId && (opts.platform === 'facebook' || opts.platform === 'instagram')) {
    return { url: metaAdLibraryAdUrl(archiveId, 'ALL'), kind: 'ad' }
  }

  const videoId = pickString(raw, ['aweme_id', 'awemeId', 'tiktok_id', 'video_id', 'videoId'])
  if (opts.platform === 'tiktok' && videoId && /^\d{8,}$/.test(videoId)) {
    return {
      url: `https://www.tiktok.com/video/${videoId}`,
      kind: 'ad',
    }
  }

  const term =
    opts.productTitle
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 4)
      .join(' ') || opts.productTitle.slice(0, 40)

  if (opts.platform === 'tiktok') {
    return { url: tiktokAdLibrarySearchUrl(term, country), kind: 'search' }
  }

  return { url: metaAdLibrarySearchUrl(term, country), kind: 'search' }
}

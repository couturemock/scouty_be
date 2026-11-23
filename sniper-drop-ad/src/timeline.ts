/**
 * Narration-locked timeline (seconds).
 * Phrase boundaries come from silence detection on the real voice-over
 * (public/audio/narracion.m4a). Edit these values to re-time the ad.
 */
export const FPS = 30;
export const AUDIO_DURATION = 83.13;
export const TOTAL_FRAMES = Math.round(AUDIO_DURATION * FPS); // 2494

export const VO = {
  // S1 – "Vamos a dejar clara la diferencia entre dropshipping y e-commerce."
  intro: 0.2,
  introDrop: 1.85,
  introEcom: 2.61,
  // S2 – Dropshipping
  dropTitle: 3.97,
  findProduct: 4.85,
  cost: 7.4, // "nueve euros con noventa y nueve"
  shopify: 9.03,
  tiktokShop: 10.48,
  creatives: 11.44,
  sellPrice: 13.0, // "veintinueve con noventa y nueve"
  neverTouch: 15.28,
  someoneBuys: 16.83,
  supplierShips: 17.9,
  // S3 – E-commerce con stock
  ecomTitle: 20.92,
  demand: 22.03,
  supplier: 24.0,
  units: 25.67,
  brand: 26.69,
  bottle: 28.15, // "Por ejemplo, esta botella"
  logo: 29.58,
  packaging: 30.43,
  buildBrand: 31.25,
  stock: 33.54,
  experience: 34.63,
  // S4 – Problem
  problem: 37.88,
  q1: 40.61,
  q2: 41.85,
  q3: 43.07,
  // S5 – Brand
  enter: 45.21,
  // S6 – Discovery
  sniperFinds: 46.8,
  findsProducts: 47.58,
  traction: 51.15,
  // S7 – Ads
  ads: 53.33,
  moneySpent: 55.98,
  // S8 – Suppliers / margins
  suppliers: 57.48,
  comparePrices: 59.15,
  margins: 59.9,
  // S9 – Engines
  howQuestion: 61.27,
  ownSystem: 63.07,
  fourEngines: 64.6,
  tracking247: 66.1,
  // S10 – Sources
  tiktokShopSrc: 67.28,
  metaAdsSrc: 67.98,
  shopifySrc: 68.6,
  otherSrc: 69.42,
  signals: 70.1,
  opportunities: 70.97,
  // S11 – Blind vs data
  insteadOf: 72.14,
  whatToSell: 73.37,
  machine: 74.35,
  // S12 – Close
  forMe: 78.05,
  difference: 78.58,
  stopBlind: 79.77,
  startData: 81.54,
  end: 83.13,
};

/** Scene windows [start, end] in seconds. Neighbouring scenes overlap slightly for transitions. */
export const SCENES = {
  s01: [0, 4.1],
  s02: [3.85, 20.95],
  s03: [20.7, 37.75],
  s04: [37.5, 45.3],
  s05: [44.85, 47.7],
  s06: [47.4, 53.5],
  s07: [53.2, 57.6],
  s08: [57.35, 61.4],
  s09: [61.1, 67.35],
  s10: [67.1, 72.3],
  s11: [72.0, 78.15],
  s12: [77.85, AUDIO_DURATION],
} as const;

export type SceneKey = keyof typeof SCENES;

export const sec = (s: number) => Math.round(s * FPS);

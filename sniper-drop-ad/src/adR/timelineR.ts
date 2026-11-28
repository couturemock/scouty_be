/**
 * "Apostar al rojo" ad — every cut is locked to a word of the client's voice
 * (public/audio/locucion-ruleta.mp3, word timestamps measured with Whisper and
 * stored in public/audio/locucion-ruleta.words.json).
 */
import words from "../../public/audio/locucion-ruleta.words.json";

export const FPS = 30;
export const AUDIO = 42.840813;
export const TOTAL_FRAMES = Math.ceil(AUDIO * FPS); // 1286

export type Word = { w: string; s: number; e: number };
export const WORDS: Word[] = (words as { words: Word[] }[]).flatMap((seg) => seg.words.map((x) => ({ ...x, w: x.w.trim() })));

/** Key word starts (seconds) */
export const K = {
  cadaProducto: 1.38,
  producto1: 1.64,
  cadaAnuncio: 2.74,
  anuncio1: 3.18,
  mismoProducto: 4.32,
  unVideo: 5.62,
  pares: 6.7,
  primerSegundo: 7.58,
  otro: 8.32,
  desapercibido: 10.14,
  pregunta: 11.14,
  semanas: 12.32,
  con: 13.44,
  sniperDrop: 13.72,
  verlo: 14.74,
  sus: 15.36,
  motores: 15.84,
  recopilan: 16.64,
  shopify: 17.62,
  tiktok: 18.26,
  meta: 19.08,
  otras: 19.7,
  las24: 20.52,
  horas: 21.26,
  eliges: 21.96,
  pais: 22.42,
  productos: 23.26,
  traccion: 23.96,
  ventas: 24.64,
  noBusquedas: 25.72,
  abres: 26.68,
  anuncios: 27.96,
  inversion: 29.02,
  estudias: 29.76,
  primerSegundo2: 31.62,
  despues: 32.94,
  proveedores: 33.8,
  calculas: 34.54,
  cuanto: 35.02,
  venta: 36.04,
  asi: 36.7,
  producto: 37.48,
  mercado: 38.58,
  creativo: 39.78,
  apostar: 40.94,
  rojo: 41.76,
  ganar: 42.34,
};

/** Shots [start, end] in seconds on the audio timeline. */
export const SHOTS = {
  r01: [0, 3.18], // hand sets the sample in front of a recording phone + other samples
  r02: [3.18, 4.32], // monitor comparing two takes + real hand at the laptop
  r03: [4.32, 13.44], // over-the-shoulder phone: scroll past / thumb stops / question
  r04: [13.44, 15.36], // index on trackpad → click on "Sniper Drop" → real recording (ads)
  r05: [15.36, 21.96], // 4 engines + platforms, day → night
  r06: [21.96, 26.68], // country → products → sales data
  r07: [26.68, 32.94], // open product → ads → first second of the ad
  r08: [32.94, 36.7], // suppliers → calculator
  r09: [36.7, AUDIO], // recap + roulette + logo
} as const;
export type ShotKey = keyof typeof SHOTS;

/**
 * Timeline locked to public/audio/narracion-49.mp3 (49.476 s).
 *
 * Scenes are authored in the "design" time base below (W49 / SCENES49).
 * WORD_ANCHORS maps each design time to the REAL word start measured with
 * Whisper (word timestamps), so every key word lands on its exact frame.
 * Between anchors the animation is stretched/compressed linearly.
 */
export const FPS = 30;
export const AUDIO = 49.476;
export const TOTAL_FRAMES = Math.ceil(AUDIO * FPS); // 1485

export const W49 = {
  // P1 "Si todavía buscas productos virales en TikTok para decidir qué vender, tienes un problema."
  tiktok: 2.35,
  problema: 3.76,
  // P2 "Probablemente estás llegando tarde."
  probablemente: 4.91,
  llegandoTarde: 5.95,
  // P3 "El mercado va demasiado rápido."
  mercado: 6.74,
  rapido: 7.95,
  // P4 "Cuando un producto ya te aparece veinte veces al día en TikTok, hay gente que lleva semanas analizándolo, testeándolo y vendiéndolo."
  cuando: 8.72,
  veinteVeces: 10.7,
  hayGente: 11.95,
  semanas: 13.2,
  analizandolo: 13.89,
  testeandolo: 15.0,
  vendiendolo: 15.65,
  // P5 "La pregunta es: ¿cómo lo encuentran antes?"
  pregunta: 16.67,
  comoAntes: 18.07,
  // P6 "Y aquí entra Sniper Drop."
  entra: 18.86,
  sniperDrop: 19.25,
  // P7 "Esta bestia busca por ti productos que están funcionando o empezando a despegar."
  bestia: 19.92,
  productos: 21.0,
  funcionando: 21.75,
  despegar: 22.85,
  // P8 "Te enseña qué anuncios y creativos están teniendo mejores señales, dónde otros vendedores están metiendo dinero, cuánto tiempo llevan anunciándose y además te encuentra proveedores, precios y márgenes."
  ensena: 23.91,
  anuncios: 24.7,
  creativos: 25.35,
  senales: 26.5,
  dondeDinero: 27.25,
  cuantoTiempo: 29.68,
  ademas: 32.17,
  proveedores: 34.0,
  precios: 34.89,
  margenes: 35.85,
  // P9 "Y lo más bestia es cómo lo hace: tienen su propio sistema con cuatro motores de IA rastreando 24/7 TikTok Shop, Meta Ads, Shopify y otras fuentes."
  masBestia: 36.84,
  sistema: 38.1,
  cuatroMotores: 39.3,
  rastreando: 40.3,
  v247: 41.03,
  tiktokShop: 41.9,
  metaAds: 42.7,
  shopify: 43.25,
  otras: 43.6,
  // P10 "Mientras tú duermes, Sniper Drop sigue analizando miles de productos y anuncios buscando señales."
  duermes: 44.4,
  sigueAnalizando: 45.48,
  miles: 46.6,
  buscandoSenales: 48.2,
  end: 49.09,
};

export const SCENES49 = {
  b01: [0, 6.6], // TikTok feed → "llegando tarde"
  b02: [6.4, 8.85], // market timeline
  b03: [8.7, 16.75], // weeks of research (split)
  b04: [16.55, 19.0], // how do they find it earlier?
  b05: [18.8, 24.05], // laptop → sniperdrop.com → app → emerging products
  b06: [23.85, 27.35], // ads & creatives
  b07: [27.15, 32.3], // money & ad age
  b08: [32.1, 36.95], // suppliers, prices, margins
  b09: [36.75, 41.1], // 4 AI engines
  b10: [40.9, 44.5], // 24/7 + platforms
  b11: [44.3, AUDIO], // while you sleep + brand close
} as const;
export type Scene49 = keyof typeof SCENES49;

/** [design time, measured word start in the audio] — Whisper medium, word timestamps. */
export const WORD_ANCHORS: [number, number][] = [
  [0, 0],
  [2.35, 1.9], // TikTok
  [3.76, 4.0], // tienes un problema
  [4.91, 5.04], // Probablemente
  [5.95, 5.76], // llegando tarde
  [6.74, 6.76], // El mercado
  [7.95, 8.02], // rápido
  [8.72, 8.74], // Cuando
  [10.7, 10.04], // 20 veces
  [11.95, 11.94], // hay gente
  [13.2, 12.6], // semanas
  [13.89, 13.06], // analizándolo
  [15.0, 14.06], // testeándolo
  [15.65, 14.78], // vendiéndolo
  [16.67, 15.64], // La pregunta es
  [18.07, 16.68], // ¿cómo lo encuentran antes?
  [18.86, 18.02], // Y aquí entra
  [19.25, 18.82], // Sniper Drop
  [19.92, 20.0], // Esta bestia
  [21.0, 21.18], // productos
  [21.75, 21.96], // funcionando
  [22.85, 23.34], // despegar
  [23.91, 23.88], // Te enseña
  [24.7, 24.62], // anuncios
  [25.35, 25.26], // creativos
  [26.5, 26.62], // señales
  [27.25, 27.4], // dónde … dinero
  [29.68, 29.4], // cuánto tiempo
  [32.17, 31.32], // y además
  [34.0, 32.68], // proveedores
  [34.89, 33.68], // precios
  [35.85, 34.2], // márgenes
  [36.84, 34.94], // Y lo más bestia
  [38.1, 37.6], // sistema
  [39.3, 38.2], // cuatro motores
  [40.3, 39.32], // rastreando
  [41.03, 39.94], // 24/7
  [41.9, 40.92], // TikTok Shop
  [42.7, 42.08], // Meta Ads
  [43.25, 42.84], // Shopify
  [43.6, 43.54], // otras fuentes
  [44.4, 44.5], // Mientras tú duermes
  [45.48, 45.72], // Sniper Drop sigue analizando
  [46.6, 47.04], // miles
  [48.2, 48.4], // buscando señales
  [49.09, 49.3], // end of speech
  [AUDIO, AUDIO],
];

const interp = (x: number, a: number, b: number) => {
  const pts = WORD_ANCHORS;
  if (x <= pts[0][a]) return pts[0][b] + (x - pts[0][a]);
  for (let i = 1; i < pts.length; i++) {
    if (x <= pts[i][a]) {
      const k = (x - pts[i - 1][a]) / (pts[i][a] - pts[i - 1][a]);
      return pts[i - 1][b] + k * (pts[i][b] - pts[i - 1][b]);
    }
  }
  const last = pts[pts.length - 1];
  return last[b] + (x - last[a]);
};
/** design time → real audio time */
export const toReal = (t: number) => interp(t, 0, 1);
/** real audio time → design time */
export const toDesign = (t: number) => interp(t, 1, 0);

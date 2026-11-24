/**
 * Timeline locked to public/audio/narracion-49.mp3 (49.476 s).
 * Phrase boundaries = detected pauses (ffmpeg silencedetect); words inside a
 * phrase are distributed by syllables. Edit here to re-time the ad.
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

/**
 * PROVISIONAL timeline for the 44 s ad (seconds).
 *
 * No narration file was supplied, so word times are ESTIMATED from the
 * script at the narrator's measured pace in the previous voice-over
 * (~7 syllables/s, 0.2–0.55 s pauses on punctuation), scaled to 44 s.
 *
 * When the real audio arrives: put it in public/audio/narracion-44.m4a,
 * set HAS_AUDIO = true and replace these values with the measured ones.
 */
export const HAS_AUDIO = false;
export const FPS = 30;
export const DURATION = 44;
export const TOTAL_FRAMES = DURATION * FPS; // 1320

export const V = {
  // S1 "Si te dedicas al dropshipping o al e-commerce, tienes que conocer el mapa del tesoro."
  dropshipping: 1.04,
  ecommerce: 1.77,
  conocer: 2.9,
  mapa: 3.48,
  // S2 "Se llama Sniper Drop."
  seLlama: 4.93,
  sniperDrop: 5.38,
  // S3 "Aquí tienes todo lo que cualquier vendedor busca: …"
  aqui: 6.38,
  productos: 9.0,
  despegar: 10.6,
  anuncios: 11.3,
  invirtiendo: 12.84,
  creativos: 14.33,
  proveedores: 16.18,
  precios: 17.15,
  margenes: 17.58,
  // S4 "Sniper Drop analiza constantemente TikTok Shop, Meta Ads, Shopify y otras fuentes …"
  analiza: 18.6,
  tiktokShop: 20.37,
  metaAds: 21.03,
  shopify: 21.7,
  otras: 22.3,
  dondeDinero: 23.6,
  ganandoTraccion: 25.7,
  // S5 "Piensa en esto: otros ya han invertido dinero probando productos, anuncios, hooks y creativos."
  piensa: 27.73,
  otrosYa: 28.88,
  probando: 30.5,
  pProductos: 30.95,
  pAnuncios: 31.62,
  pHooks: 32.28,
  pCreativos: 32.58,
  // S6 "Tú puedes ver esas señales y analizar qué está funcionando."
  tu: 33.73,
  senales: 34.62,
  analizar: 35.21,
  funcionando: 36.25,
  // S7 "Producto ganador más proveedor con buen margen más anuncio ganador."
  productoGanador: 37.39,
  mas1: 38.28,
  proveedor: 38.43,
  buenMargen: 39.17,
  mas2: 39.62,
  anuncioGanador: 39.76,
  // S8 "Ese es el mapa del tesoro."
  ese: 41.21,
  mapaFinal: 41.78,
};

export const SCENES44 = {
  a1: [0, 4.95],
  a2: [4.75, 8.9],
  a3: [8.7, 18.75],
  a4: [18.5, 27.75],
  a5: [27.5, 33.85],
  a6: [33.6, 37.45],
  a7: [37.2, 41.4],
  a8: [41.0, DURATION],
} as const;
export type Scene44 = keyof typeof SCENES44;

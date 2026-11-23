# Sniper Drop — anuncio vertical (Remotion)

Anuncio de 83,1 s en 9:16 (1080 × 1920, 30 fps, 2494 fotogramas), sincronizado con la locución real.

## Comandos

```bash
npm i
npm run dev                      # Remotion Studio (composición "SniperDropAd" + carpeta "Escenas")
npx remotion render SniperDropAd out/sniper-drop-ad.mp4 --codec=h264 --crf=16
node scripts/stills.mjs out/stills qa 10 30 50   # fotogramas de control (segundos)
```

Si Chrome no puede descargarse en tu entorno, añade `--browser-executable=<ruta a chrome-headless-shell>`
(para el script de stills, usa la variable `REMOTION_BROWSER`).

## Estructura

```
src/
  timeline.ts             ← TODOS los tiempos (segundos de la locución). Edita aquí para re-sincronizar.
  compositions/           ← composición maestra + previsualización por escena
  scenes/S01…S12          ← una escena por archivo, en segundos absolutos de la narración
  components/
    primitives.tsx        ← fondos, texto animado, etiquetas, logo, cursor
    Camera.tsx            ← cámara 2.5D y tarjetas flotantes
    product/Products.tsx  ← auriculares, botella con marca, cajas 3D, tienda móvil
    ui/DropSniperUI.tsx   ← reconstrucción de la app real (sidebar, rankings, ficha, anuncios, proveedores, calculadora)
    ui/Engines.tsx        ← los 4 motores tal y como aparecen en sniperdrop.com
  animations/clock.tsx    ← reloj absoluto, easings, springs
  styles/theme.ts         ← paleta extraída del logo y de la interfaz, fuentes locales
public/
  brand/      ← logo oficial (original + capas recortadas sin modificar)
  audio/      ← narración extraída del vídeo enviado
  ui/         ← imagen de producto real recortada de la captura
  reference/  ← capturas originales usadas como referencia
  fonts/      ← Inter y Sora (locales, sin dependencia de red)
```

## Sincronización

Los cortes proceden de la detección de pausas del audio real (`ffmpeg silencedetect`), alineados con el guion.
Las frases largas se subdividieron por micro-pausas (p. ej. tracción 53,1 s · anuncios 55,8 s · dinero 57,3 s · proveedores 59,0 s).

## Datos mostrados

- Cifras, textos y nombres de la interfaz: copiados de las capturas reales (Piarhlie 19,90 € · BSR #12 · ~3.000/mes est., anuncios 84M/18K, calculadora 29,99 / 6,5 / 2,4 / 15 %).
- Rankings: los nombres e imágenes estaban pixelados en la captura → se sustituyen por "Producto de ejemplo"; precios/BSR/ventas son los visibles.
- Resultado de la calculadora (16,59 €) = cálculo con los valores de ejemplo, marcado "Cálculo de ejemplo" y "Antes de gasto publicitario (CPA). No es beneficio neto."
- Gráfica de tendencia de la escena 10: marcada "Ilustrativo".
- Marca "NÓMADA" de la botella: ficticia.
- Fuentes (TikTok Shop, Meta Ads, Shopify): texto neutro, sin logotipos de terceros.

---

# Anuncio 44 s — "El mapa del tesoro" (composición `SniperDrop44`)

```bash
npx remotion render SniperDrop44 out/sniper-drop-44s.mp4 --codec=h264 --crf=16
```

- Escenas en `src/ad44/scenes/A1…A8`, componentes nuevos en `src/ad44/components44.tsx`
  (portátil 2.5D, navegador, portada real de sniperdrop.com, logos de plataformas, gráfica, creativos).
- **Sincronización PROVISIONAL**: no se recibió el audio. Los tiempos de `src/ad44/timeline44.ts` se
  estimaron a partir del guion con el ritmo medido del mismo narrador (~7 sílabas/s).
  Para sincronizar con el audio real: copia el archivo a `public/audio/narracion-44.m4a`,
  pon `HAS_AUDIO = true` y ajusta los valores de `V` con los tiempos medidos.
- Logos de TikTok Shop, Meta y Shopify: imágenes oficiales enviadas, sin modificar, en `public/platforms/`.
- Portada de sniperdrop.com reconstruida sin el contador "Plazas completas 500/500".
- Datos ilustrativos marcados en pantalla (gráficas, tiendas/anuncios de ejemplo, cálculo de margen).

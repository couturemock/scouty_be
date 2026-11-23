import React from "react";
import { AbsoluteFill } from "remotion";
import { E, env, eur, mix, p, spr, useTime } from "../../animations/clock";
import { DarkBg, DemoTag, Pill, RiseText } from "../../components/primitives";
import { Float25D } from "../../components/Camera";
import { Earbuds } from "../../components/product/Products";
import { IArrowUR, IEye, IMegaphone } from "../../components/Icons";
import { AdCard, ADS, CALC, calcMargin, CalculatorForm, SUPPLIER_ROWS, SupplierRow, UI } from "../../components/ui/DropSniperUI";
import { AdCreative, ProductPhoto, TrendChart } from "../components44";
import { C, INTER, SORA } from "../../styles/theme";
import { V } from "../timeline44";

const HUES = [210, 330, 30, 150, 260];

const ProductTile: React.FC<{ i: number; real?: boolean; hl?: number }> = ({ i, real, hl = 0 }) => (
  <div
    style={{
      width: 280,
      padding: 16,
      borderRadius: 26,
      background: "#12151E",
      border: `2px solid ${hl > 0.5 ? "#7B97FF" : "rgba(255,255,255,0.08)"}`,
      boxShadow: `0 20px 40px rgba(0,0,0,0.4), 0 0 ${60 * hl}px rgba(91,123,255,${0.5 * hl})`,
      fontFamily: INTER,
    }}
  >
    {real ? (
      <ProductPhoto size={248} style={{ boxShadow: "none" }} />
    ) : (
      <div style={{ width: 248, height: 248, borderRadius: 18, background: `linear-gradient(135deg, hsl(${HUES[i % 5]} 30% 26%), hsl(${HUES[i % 5]} 25% 14%))`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 80, height: 104, borderRadius: 20, background: `hsl(${HUES[i % 5]} 45% 60%)`, opacity: 0.85 }} />
      </div>
    )}
    <div style={{ fontSize: 22, fontWeight: 600, color: "#fff", marginTop: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{real ? "Aspiradora de mano 30kPa" : "Producto de ejemplo"}</div>
    <div style={{ fontSize: 18, color: C.muted, marginTop: 4 }}>{real ? "19,90 € · BSR #12" : "Amazon ES"}</div>
  </div>
);

const Signal: React.FC<{ icon: React.ReactNode; text: string; k: number; style?: React.CSSProperties }> = ({ icon, text, k, style }) => (
  <div style={{ position: "absolute", opacity: k, scale: 0.8 + 0.2 * k, ...style }}>
    <Pill dark size={28} bg="rgba(20,24,36,0.95)" border="rgba(110,140,255,0.45)">
      {icon}
      {text}
    </Pill>
  </div>
);

export const A3Modules: React.FC = () => {
  const t = useTime();

  // ---- module windows (each concept alone on screen) --------------------
  const m1 = env(t, 8.75, V.anuncios + 0.05, 0.5, 0.35);
  const m2 = env(t, V.anuncios - 0.1, V.creativos + 0.05, 0.5, 0.3);
  const m3 = env(t, V.creativos - 0.05, V.proveedores + 0.05, 0.45, 0.3);
  const m4 = env(t, V.proveedores - 0.1, V.precios + 0.1, 0.4, 0.3);
  const m5 = p(t, V.precios - 0.05, 0.5);
  const exit = p(t, 18.45, 0.3, E.in);

  // M1 products
  const tiles = [0, 1, 2, 3, 4, 5].map((i) => spr(t, 8.75 + i * 0.07, 8, 0.6));
  const pick = p(t, 9.55, 0.6, E.inOut);
  const chart = p(t, 9.85, 1.1, E.inOut);

  // M2 ads
  const adIn = spr(t, V.anuncios - 0.05, 7, 0.6);
  const sideAds = spr(t, V.anuncios + 0.35, 7, 0.6);
  const sig = [p(t, 11.9, 0.4), p(t, V.invirtiendo, 0.4), p(t, 13.4, 0.4)];

  // M3 creatives
  const fan = spr(t, V.creativos, 7, 0.6);
  const chosen = p(t, 14.95, 0.5, E.inOut);

  // M4 suppliers
  const rows = [0, 1, 2].map((i) => spr(t, V.proveedores + i * 0.1, 9, 0.6));

  // M5 calculator
  const flip = p(t, V.precios, 0.6, E.out);
  const result = p(t, V.margenes + 0.15, 0.5, E.out);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <DarkBg glowY={55} />

      {/* ---------- M1 · products taking off ---------- */}
      <AbsoluteFill style={{ opacity: m1 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const col = i % 3;
          const row = Math.floor(i / 3);
          const real = i === 1;
          const x0 = 540 + (col - 1) * 305;
          const y0 = 660 + row * 380;
          const x = real ? mix(x0, 540, pick) : x0;
          const y = real ? mix(y0, 700, pick) : y0;
          return (
            <div key={i} style={{ position: "absolute", left: x, top: y, translate: "-50% -50%", scale: (real ? mix(0.95, 1.25, pick) : 0.95) * Math.min(1, tiles[i]), opacity: Math.min(1, tiles[i] * 2) * (real ? 1 : 1 - pick * 0.85), zIndex: real ? 3 : 1 }}>
              <ProductTile i={i} real={real} hl={real ? pick : 0} />
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 540, top: 1270, translate: "-50% 0", opacity: chart, scale: 0.9 + chart * 0.1 }}>
          <TrendChart width={760} height={190} progress={chart} title="Tracción del producto" />
        </div>
      </AbsoluteFill>

      {/* ---------- M2 · ads where others invest ---------- */}
      <AbsoluteFill style={{ opacity: m2 }}>
        {[-1, 1].map((s) => (
          <div key={s} style={{ position: "absolute", left: 540 + s * mix(0, 300, sideAds), top: 1000, translate: "-50% -50%", scale: 0.72, rotate: `${s * 8 * sideAds}deg`, opacity: Math.min(1, sideAds * 2) * 0.75, filter: "blur(1.5px)" }}>
            <AdCreative width={330} hook={s < 0 ? "No vuelvas a limpiar igual" : "El accesorio del momento"} hue={s < 0 ? 330 : 30} product={<ProductPhoto size={190} />} platform="Patrocinado" />
          </div>
        ))}
        <div style={{ position: "absolute", left: 540, top: mix(760, 1000, adIn), translate: "-50% -50%", scale: mix(0.5, 1, adIn), opacity: Math.min(1, adIn * 2), zIndex: 2 }}>
          <AdCreative width={380} hook="Tu coche, como nuevo en 2 minutos" hue={225} product={<ProductPhoto size={230} />} />
        </div>
        <Signal icon={<IMegaphone size={28} color={C.blueBright} />} text="Anuncio activo" k={sig[0]} style={{ left: 70, top: 600, zIndex: 3 }} />
        <Signal icon={<span style={{ color: C.blueBright, fontWeight: 800 }}>€</span>} text="Inversión publicitaria" k={sig[1]} style={{ right: 70, top: 1340, zIndex: 3 }} />
        <Signal icon={<IEye size={28} color={C.blueBright} />} text="Varios anunciantes" k={sig[2]} style={{ left: 90, top: 1440, zIndex: 3 }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 1580, display: "flex", justifyContent: "center", opacity: sig[0] }}>
          <DemoTag label="Creativos ilustrativos" />
        </div>
      </AbsoluteFill>

      {/* ---------- M3 · creatives that work ---------- */}
      <AbsoluteFill style={{ opacity: m3, scale: mix(1, 1.08, chosen), transformOrigin: "540px 900px" }}>
        {[-1, 0, 1].map((s, i) => {
          const isChosen = s === 0;
          return (
            <div
              key={s}
              style={{
                position: "absolute",
                left: 540 + s * 320 * fan,
                top: 880 - (isChosen ? 30 * chosen : 0),
                translate: "-50% -50%",
                rotate: `${s * 6 * fan}deg`,
                scale: (isChosen ? mix(0.82, 0.98, chosen) : mix(0.82, 0.7, chosen)) * Math.min(1, fan),
                opacity: isChosen ? 1 : 1 - chosen * 0.55,
                zIndex: isChosen ? 2 : 1,
              }}
            >
              <AdCreative width={300} hook={["Probado por miles", "Míralo en acción", "Antes / después"][i]} hue={[330, 225, 150][i]} product={<Earbuds size={190} lid={1} />} highlight={isChosen ? chosen : 0} platform={["Meta", "TikTok", "Meta"][i]} />
            </div>
          );
        })}
        {/* real indicator card from the Drop Sniper "Anuncios" screen */}
        <Float25D x={540} y={mix(1500, 1420, chosen)} scale={1.45} lift={chosen} opacity={chosen}>
          <div style={{ width: 600, fontFamily: INTER, color: UI.text }}>
            <AdCard ad={ADS[0]} glow={1} />
          </div>
        </Float25D>
      </AbsoluteFill>

      {/* ---------- M4 · suppliers ---------- */}
      <AbsoluteFill style={{ opacity: m4 }}>
        {SUPPLIER_ROWS.map((r, i) => (
          <Float25D key={r} x={mix(1500, 540, rows[i])} y={720 + i * 190} scale={1.5} rotY={mix(-30, -3, rows[i])} lift={0.6}>
            <div style={{ width: 640, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", fontFamily: INTER, color: UI.text }}>
              <SupplierRow label={r} style={{ borderBottom: "none" }} />
            </div>
          </Float25D>
        ))}
        <div style={{ position: "absolute", top: 1300, left: 100, right: 140, fontFamily: INTER, fontSize: 30, color: C.muted, lineHeight: 1.45, opacity: rows[2] }}>
          Alibaba y AliExpress, comparados por precio y envío. <IArrowUR size={26} color={C.blueBright} />
        </div>
      </AbsoluteFill>

      {/* ---------- M5 · prices & margins ---------- */}
      <AbsoluteFill style={{ opacity: m5 }}>
        <Float25D x={540} y={mix(980, 860, result)} scale={1.45} rotY={mix(60, 0, flip)} lift={flip}>
          <div style={{ fontFamily: INTER, color: UI.text }}>
            <CalculatorForm focus={result > 0 ? 0 : 2} />
          </div>
        </Float25D>
        <div style={{ position: "absolute", left: 540, top: mix(1420, 1380, result), translate: "-50% -50%", opacity: result, fontFamily: INTER }}>
          <div style={{ width: 880, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "26px 34px", borderRadius: 26, background: UI.card, border: "2px solid rgba(110,140,255,0.55)", boxShadow: "0 0 50px rgba(91,123,255,0.3)" }}>
            <div>
              <div style={{ fontSize: 26, color: C.muted }}>Margen por unidad</div>
              <div style={{ fontSize: 20, color: C.muted2, marginTop: 6 }}>
                {eur(CALC.price)} − coste − envío − comisiones
              </div>
            </div>
            <div style={{ fontFamily: SORA, fontSize: 64, fontWeight: 700, color: "#fff" }}>{eur(calcMargin())}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <DemoTag label="Cálculo de ejemplo · antes de publicidad" />
          </div>
        </div>
      </AbsoluteFill>

      {/* ---------- module headline ---------- */}
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {t < V.anuncios ? <RiseText text={"Productos que\nempiezan a despegar"} at={V.productos - 0.25} out={V.anuncios - 0.3} size={74} color="#fff" highlight={["despegar"]} highlightColor={C.blueSoft} /> : null}
        {t >= V.anuncios - 0.05 && t < V.creativos ? <RiseText text={"Anuncios donde otros\nya están invirtiendo"} at={V.anuncios} out={V.creativos - 0.3} size={70} color="#fff" highlight={["invirtiendo"]} highlightColor={C.blueSoft} /> : null}
        {t >= V.creativos - 0.05 && t < V.proveedores ? <RiseText text={"Creativos que\nfuncionan"} at={V.creativos} out={V.proveedores - 0.3} size={78} color="#fff" highlight={["funcionan"]} highlightColor={C.blueSoft} /> : null}
        {t >= V.proveedores - 0.05 && t < V.precios ? <RiseText text="Proveedores" at={V.proveedores - 0.05} out={V.precios - 0.2} size={84} color="#fff" /> : null}
        {t >= V.precios - 0.05 ? <RiseText text={"Precios y\nmárgenes"} at={V.precios - 0.05} size={84} color="#fff" highlight={["márgenes"]} highlightColor={C.blueSoft} /> : null}
      </div>
    </AbsoluteFill>
  );
};

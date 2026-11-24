import React from "react";
import { AbsoluteFill } from "remotion";
import { E, p, spr, useTime } from "../../animations/clock";
import { DarkBg, DemoTag, RiseText } from "../../components/primitives";
import { Earbuds } from "../../components/product/Products";
import { ProductPhoto } from "../../ad44/components44";
import { Serum } from "../components49";
import { C, INTER, SORA } from "../../styles/theme";
import { W49 } from "../timeline49";

const ROWS = [
  { name: "Anuncio A", net: "TikTok", country: "ES", days: 3, hue: 150, product: () => <Earbuds size={110} lid={1} /> },
  { name: "Anuncio B", net: "Meta", country: "US", days: 12, hue: 330, product: () => <div style={{ scale: 0.42 }}><Serum size={240} /></div> },
  { name: "Anuncio C", net: "Meta", country: "ES", days: 28, hue: 225, product: () => <ProductPhoto size={96} style={{ boxShadow: "none" }} /> },
];
const MAX_DAYS = 30;
const BAR_X = 330;
const BAR_W = 640;

export const B07AdAge: React.FC = () => {
  const t = useTime();
  const enter = p(t, 27.15, 0.3, E.out);
  const rows = ROWS.map((_, i) => spr(t, W49.dondeDinero + i * 0.15, 8, 0.6));
  const timeline = p(t, W49.cuantoTiempo - 0.1, 0.4);
  const bars = ROWS.map((_, i) => p(t, W49.cuantoTiempo + 0.2 + i * 0.35, 1.0, E.inOut));
  const exit = p(t, 32.0, 0.3, E.in);
  const pulse = (Math.sin(t * 6) + 1) / 2;

  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, 1 - exit) }}>
      <DarkBg glowY={50} />

      {ROWS.map((r, i) => {
        const k = rows[i];
        const y = 560 + i * 300;
        return (
          <div key={r.name} style={{ position: "absolute", left: 70, top: y, width: 940, opacity: Math.min(1, k * 2), translate: `${(1 - Math.min(1, k)) * 120}px 0`, fontFamily: INTER }}>
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <div style={{ width: 130, height: 230, borderRadius: 20, background: `linear-gradient(165deg, hsl(${r.hue} 50% 42%), #0A0D16)`, border: "2px solid rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{r.product()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ fontFamily: SORA, fontWeight: 700, fontSize: 36, color: "#fff" }}>{r.name}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 22, fontWeight: 700, color: "#7EE2A8", padding: "6px 14px", borderRadius: 99, background: "rgba(34,197,94,0.12)", border: "1.5px solid rgba(34,197,94,0.5)" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 99, background: "#22C55E", boxShadow: `0 0 ${10 + pulse * 10}px #22C55E` }} />
                    ACTIVO
                  </span>
                </div>
                <div style={{ fontSize: 24, color: C.muted, marginTop: 8 }}>
                  {r.net} · {r.country} · actividad publicitaria
                </div>
                {/* activity bars (where money is moving) */}
                <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: 50, marginTop: 12, opacity: 1 - timeline }}>
                  {new Array(14).fill(0).map((_, b) => (
                    <div key={b} style={{ width: 16, borderRadius: 4, height: 10 + Math.abs(Math.sin(t * 3 + b * 0.7 + i)) * (16 + i * 10), background: "#5B7BFF", opacity: 0.85 }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* time active: bars drawn progressively */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, opacity: timeline }}>
        {ROWS.map((r, i) => {
          const y = 560 + i * 300 + 160;
          const w = (r.days / MAX_DAYS) * BAR_W * bars[i];
          return (
            <div key={r.name} style={{ position: "absolute", left: BAR_X, top: y, width: BAR_W }}>
              <div style={{ height: 34, borderRadius: 10, background: "rgba(255,255,255,0.06)" }} />
              <div style={{ position: "absolute", left: 0, top: 0, height: 34, width: w, borderRadius: 10, background: "linear-gradient(90deg, #4F7BFF, #A855F7)", boxShadow: "0 0 20px rgba(91,123,255,0.5)" }} />
              <div style={{ position: "absolute", left: Math.max(w + 14, 14), top: -4, fontFamily: SORA, fontWeight: 700, fontSize: 34, color: "#fff", opacity: bars[i], whiteSpace: "nowrap" }}>
                {Math.round(r.days * bars[i])} {Math.round(r.days * bars[i]) === 1 ? "DÍA" : "DÍAS"}
              </div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: BAR_X, top: 1470, width: BAR_W, display: "flex", justifyContent: "space-between", fontFamily: INTER, fontSize: 22, color: C.muted2 }}>
          <span>Día 0</span>
          <span>Días anunciándose</span>
          <span>30</span>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1560, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: rows[0] }}>
        <DemoTag label="Ejemplo ficticio · sin cifras de inversión" />
      </div>

      <div style={{ position: "absolute", top: 240, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {t < W49.cuantoTiempo - 0.15 ? (
          <RiseText text={"Dónde otros están\nmetiendo dinero"} at={W49.dondeDinero + 0.05} out={W49.cuantoTiempo - 0.45} size={74} color="#fff" highlight={["dinero"]} highlightColor={C.blueSoft} />
        ) : (
          <RiseText text={"Cuánto tiempo llevan\nanunciándose"} at={W49.cuantoTiempo - 0.1} size={70} color="#fff" highlight={["anunciándose"]} highlightColor={C.blueSoft} />
        )}
      </div>
    </AbsoluteFill>
  );
};

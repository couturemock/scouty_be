import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, spr, useTime } from "../../animations/clock";
import { DarkBg, DemoTag, RiseText } from "../../components/primitives";
import { Bottle, Earbuds } from "../../components/product/Products";
import { AdCreative, ProductPhoto } from "../components44";
import { C, INTER, SORA } from "../../styles/theme";
import { V } from "../timeline44";

const HOOKS = [
  ["¿Aún limpias así?", "Mira la diferencia", "3 razones para tenerlo"],
  ["Hidratación sin plástico", "Tu botella favorita", "Frío 24 h"],
  ["El regalo perfecto", "Sonido sin cables", "Pruébalo hoy"],
];
const STORES = [
  { name: "Tienda A", y: 660, hue: 225, product: () => <ProductPhoto size={170} style={{ boxShadow: "none" }} /> },
  { name: "Tienda B", y: 980, hue: 330, product: () => <Bottle height={190} angle={20} brand={1} shadow={false} /> },
  { name: "Tienda C", y: 1300, hue: 150, product: () => <Earbuds size={180} lid={1} /> },
];

const StoreWindow: React.FC<{ name: string; product: React.ReactNode; pulse: number }> = ({ name, product, pulse }) => (
  <div style={{ width: 540, borderRadius: 22, background: "#F4F6FA", overflow: "hidden", boxShadow: "0 30px 60px rgba(0,0,0,0.5)", fontFamily: INTER }}>
    <div style={{ height: 40, background: "#DFE3EB", display: "flex", alignItems: "center", gap: 8, padding: "0 16px" }}>
      {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
        <div key={c} style={{ width: 11, height: 11, borderRadius: 9, background: c }} />
      ))}
      <div style={{ flex: 1, height: 20, borderRadius: 6, background: "#fff", marginLeft: 10, fontSize: 13, color: C.studioMuted, display: "flex", alignItems: "center", paddingLeft: 10 }}>{name.toLowerCase().replace(" ", "-")}.com</div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 22, padding: 20 }}>
      <div style={{ width: 200, height: 200, borderRadius: 16, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 0 ${pulse * 6}px rgba(91,123,255,${0.5 * pulse})` }}>{product}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 30, color: C.studioInk }}>{name}</div>
        <div style={{ height: 12, borderRadius: 6, background: "#DDE2EC", marginTop: 14, width: "90%" }} />
        <div style={{ height: 12, borderRadius: 6, background: "#E8EBF2", marginTop: 10, width: "60%" }} />
        <div style={{ marginTop: 20, background: C.studioInk, color: "#fff", fontWeight: 700, fontSize: 18, borderRadius: 10, padding: "10px 14px", width: 150, textAlign: "center" }}>Comprar</div>
      </div>
    </div>
  </div>
);

const Chip: React.FC<{ text: string; k: number; active: boolean }> = ({ text, k, active }) => (
  <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 26, letterSpacing: "0.08em", padding: "12px 20px", borderRadius: 99, color: active ? "#fff" : "#9AA6C8", background: active ? "rgba(76,104,255,0.3)" : "rgba(255,255,255,0.05)", border: `1.5px solid ${active ? "rgba(123,151,255,0.9)" : "rgba(255,255,255,0.12)"}`, opacity: k, scale: 0.85 + 0.15 * k }}>
    {text}
  </div>
);

export const A5Testing: React.FC = () => {
  const t = useTime();
  const intro = p(t, 27.5, 0.3);
  const introOut = p(t, V.otrosYa - 0.2, 0.4, E.in);
  const stores = STORES.map((_, i) => spr(t, V.otrosYa + i * 0.15, 8, 0.6));
  const prodPulse = p(t, V.pProductos, 0.3) * (1 - p(t, V.pAnuncios, 0.3));
  const ads = STORES.map((_, i) => spr(t, V.pAnuncios + i * 0.08, 9, 0.55));
  const hookIdx = t < V.pHooks ? 0 : Math.min(2, Math.floor((t - V.pHooks) / 0.28) % 3);
  const creativeShift = t > V.pCreativos ? Math.floor((t - V.pCreativos) / 0.3) : 0;
  const gather = p(t, 33.4, 0.45, E.in);
  const chips = [V.pProductos, V.pAnuncios, V.pHooks, V.pCreativos];
  const activeChip = chips.reduce((a, c, i) => (t >= c - 0.05 ? i : a), -1);

  return (
    <AbsoluteFill>
      <DarkBg glowY={50} />

      {/* "Piensa en esto" */}
      <div style={{ position: "absolute", top: 860, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: intro * (1 - introOut) }}>
        <RiseText text="Piensa en esto:" at={27.52} size={92} color="#fff" />
      </div>

      <AbsoluteFill style={{ opacity: introOut, scale: mix(1, 0.4, gather), translate: `0 ${-gather * 400}px`, filter: `blur(${gather * 6}px)` }}>
        {STORES.map((s, i) => {
          const k = stores[i];
          const a = ads[i];
          const hue = s.hue + ((creativeShift + i) % 3) * 40;
          return (
            <React.Fragment key={s.name}>
              <div style={{ position: "absolute", left: mix(-300, 340, k), top: s.y, translate: "-50% -50%", scale: 0.92, opacity: Math.min(1, k * 2), rotate: `${(1 - Math.min(1, k)) * -8}deg` }}>
                <StoreWindow name={s.name} product={s.product()} pulse={prodPulse} />
              </div>
              {/* ad created from this store's product */}
              <div style={{ position: "absolute", left: mix(560, 850, a), top: s.y, translate: "-50% -50%", scale: mix(0.3, 1, a), opacity: Math.min(1, a * 2), zIndex: 2 }}>
                <AdCreative width={170} hook={HOOKS[i][hookIdx]} hue={hue} product={<div style={{ scale: 0.55 }}>{s.product()}</div>} highlight={t > V.pHooks && t < V.pHooks + 0.15 ? 1 : 0} platform={`V${((creativeShift + i) % 3) + 1}`} />
                {/* activity bars */}
                <div style={{ position: "absolute", right: -48, bottom: 30, display: "flex", gap: 5, alignItems: "flex-end", opacity: a }}>
                  {[0, 1, 2].map((b) => (
                    <div key={b} style={{ width: 9, height: 20 + Math.abs(Math.sin(t * 4 + b + i)) * 40, borderRadius: 4, background: "#5B7BFF" }} />
                  ))}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div style={{ position: "absolute", left: 0, right: 0, top: 1500, display: "flex", justifyContent: "center", opacity: ads[0] }}>
          <DemoTag label="Tiendas y anuncios ilustrativos" />
        </div>
      </AbsoluteFill>

      {/* headline + concept chips synced to the words */}
      <div style={{ position: "absolute", top: 220, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: 1 - gather }}>
        {t > V.otrosYa - 0.2 ? <RiseText text={"Otros ya han invertido\nprobando"} at={V.otrosYa - 0.1} size={66} color="#fff" highlight={["invertido"]} highlightColor={C.blueSoft} /> : null}
      </div>
      <div style={{ position: "absolute", top: 410, left: 40, right: 40, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", opacity: 1 - gather }}>
        {["PRODUCTOS", "ANUNCIOS", "HOOKS", "CREATIVOS"].map((c, i) => (
          <Chip key={c} text={c} k={p(t, chips[i] - 0.05, 0.3)} active={activeChip === i} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

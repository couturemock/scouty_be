import React from "react";
import { AbsoluteFill } from "remotion";
import { E, eur, mix, p, spr, tw, useTime } from "../../animations/clock";
import { DarkBg, DemoTag } from "../../components/primitives";
import { Float25D } from "../../components/Camera";
import { ICheck, IFactory } from "../../components/Icons";
import { CALC, CalculatorForm, UI } from "../../components/ui/DropSniperUI";
import { ProductPhoto } from "../../ad44/components44";
import { C, INTER, SORA } from "../../styles/theme";
import { W49 } from "../timeline49";

const SUPPLIERS = [
  { n: "Proveedor A", src: "Alibaba", cost: 7.2, days: "12-18 días" },
  { n: "Proveedor B", src: "AliExpress", cost: 6.5, days: "8-12 días" },
  { n: "Proveedor C", src: "Alibaba", cost: 8.1, days: "6-9 días" },
];

export const B08Suppliers: React.FC = () => {
  const t = useTime();
  const enter = p(t, 32.1, 0.4, E.out);
  const product = spr(t, W49.ademas, 7, 0.6);
  const cards = SUPPLIERS.map((_, i) => spr(t, W49.proveedores - 0.1 + i * 0.12, 9, 0.55));
  const pick = p(t, W49.proveedores + 0.5, 0.3);
  const calc = p(t, W49.precios - 0.05, 0.55, E.out);
  const result = p(t, W49.margenes - 0.1, 0.4, E.out);
  const exit = p(t, 36.65, 0.3, E.in);
  // numbers move smoothly from the chosen supplier into the margin
  const fee = (CALC.price * CALC.fee) / 100;
  const margin = tw(t, [W49.margenes - 0.1, W49.margenes + 0.6], [CALC.price - CALC.cost, CALC.price - CALC.cost - CALC.ship - fee], E.out);

  const word = (w: string, at: number, plus: boolean) => (
    <span style={{ opacity: p(t, at - 0.05, 0.25), color: p(t, at - 0.05, 0.25) > 0 ? "#fff" : "transparent" }}>
      {plus ? <span style={{ color: C.blueSoft }}> + </span> : null}
      {w}
    </span>
  );

  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, 1 - exit) }}>
      <DarkBg glowY={50} />

      {/* physical product */}
      <div style={{ position: "absolute", left: 540, top: mix(620, 560, calc), translate: "-50% -50%", scale: Math.min(1, product) * mix(1, 0.62, calc), opacity: Math.min(1, product * 2), rotate: `${Math.sin(t * 1.4) * 3}deg` }}>
        <ProductPhoto size={280} />
      </div>

      {/* supplier cards spread sideways */}
      <AbsoluteFill style={{ opacity: 1 - calc }}>
        {SUPPLIERS.map((s, i) => {
          const k = cards[i];
          const chosen = i === 1;
          return (
            <div key={s.n} style={{ position: "absolute", left: 540 + (i - 1) * mix(0, 320, Math.min(1, k)), top: 1080 - (chosen ? pick * 30 : 0), translate: "-50% -50%", opacity: Math.min(1, k * 2) * (chosen ? 1 : 1 - pick * 0.5), scale: chosen ? 1 + pick * 0.06 : 1 }}>
              <div style={{ width: 300, padding: "26px 24px", borderRadius: 26, background: "#121520", border: `2px solid ${chosen && pick > 0.5 ? "#7B97FF" : "rgba(255,255,255,0.1)"}`, boxShadow: chosen ? `0 0 ${50 * pick}px rgba(91,123,255,0.5)` : "0 20px 40px rgba(0,0,0,0.4)", fontFamily: INTER, position: "relative" }}>
                <IFactory size={44} color={C.blueBright} />
                <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 30, color: "#fff", marginTop: 12 }}>{s.n}</div>
                <div style={{ fontSize: 22, color: C.muted, marginTop: 4 }}>{s.src}</div>
                <div style={{ fontSize: 46, fontWeight: 700, color: "#fff", marginTop: 14 }}>{eur(s.cost)}</div>
                <div style={{ fontSize: 22, color: C.muted, marginTop: 4 }}>Envío {s.days}</div>
                {chosen && pick > 0 ? (
                  <div style={{ position: "absolute", top: -20, right: -16, width: 54, height: 54, borderRadius: 99, background: "#5B7BFF", display: "flex", alignItems: "center", justifyContent: "center", scale: pick }}>
                    <ICheck size={32} color="#fff" stroke={3} />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>

      {/* margin calculator (real form) + result */}
      <Float25D x={540} y={mix(1080, 1000, result)} scale={1.4} rotY={mix(55, 0, calc)} lift={calc} opacity={calc}>
        <div style={{ fontFamily: INTER, color: UI.text }}>
          <CalculatorForm focus={result > 0 ? 0 : 2} />
        </div>
      </Float25D>
      <div style={{ position: "absolute", left: 540, top: 1440, translate: "-50% -50%", opacity: result, scale: 0.92 + 0.08 * result, fontFamily: INTER }}>
        <div style={{ width: 880, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 32px", borderRadius: 26, background: UI.card, border: "2px solid rgba(110,140,255,0.6)", boxShadow: "0 0 50px rgba(91,123,255,0.3)" }}>
          <div>
            <div style={{ fontSize: 26, color: C.muted }}>Margen por unidad estimado</div>
            <div style={{ fontSize: 20, color: C.muted2, marginTop: 6 }}>Venta {eur(CALC.price)} − coste − envío − comisiones</div>
          </div>
          <div style={{ fontFamily: SORA, fontSize: 62, fontWeight: 700, color: "#fff" }}>{eur(margin)}</div>
        </div>
      </div>
      <div style={{ position: "absolute", top: 1580, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: cards[0] }}>
        <DemoTag label="Costes ilustrativos · cálculo de ejemplo" />
      </div>

      {/* headline builds word by word with the voice */}
      <div style={{ position: "absolute", top: 250, left: 40, right: 40, textAlign: "center", fontFamily: SORA, fontWeight: 700, fontSize: 64, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
        {word("PROVEEDORES", W49.proveedores, false)}
        <br />
        {word("PRECIOS", W49.precios, true)}
        {word("MÁRGENES", W49.margenes, true)}
      </div>
    </AbsoluteFill>
  );
};

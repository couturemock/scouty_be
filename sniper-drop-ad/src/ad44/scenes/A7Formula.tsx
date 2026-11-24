import React from "react";
import { AbsoluteFill } from "remotion";
import { E, eur, mix, p, spr, useTime } from "../../animations/clock";
import { DarkBg, DemoTag, Eyebrow } from "../../components/primitives";
import { IFactory } from "../../components/Icons";
import { DogBottle } from "../products44";
import { CALC, calcMargin } from "../../components/ui/DropSniperUI";
import { AdCreative } from "../components44";
import { C, INTER, SORA } from "../../styles/theme";
import { V } from "../timeline44";

const ROW_Y = [640, 1010, 1380];
export const MERGE_NODES = [
  { x: 540, y: 760 },
  { x: 330, y: 1110 },
  { x: 750, y: 1110 },
];

const Row: React.FC<{ visual: React.ReactNode; title: string; sub: string; extra?: React.ReactNode; k: number }> = ({ visual, title, sub, extra, k }) => (
  <div style={{ width: 900, height: 290, borderRadius: 34, background: "linear-gradient(90deg, #141826 0%, #0F121B 100%)", border: `1.5px solid rgba(110,140,255,${0.2 + 0.4 * k})`, boxShadow: "0 30px 60px rgba(0,0,0,0.45)", display: "flex", alignItems: "center", gap: 34, padding: "0 34px", fontFamily: INTER }}>
    <div style={{ width: 240, height: 240, borderRadius: 26, background: "radial-gradient(circle at 50% 40%, #1E2740 0%, #0D111C 80%)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>{visual}</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 26, color: C.blueSoft, fontWeight: 600, letterSpacing: "0.04em" }}>{sub}</div>
      <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 46, color: "#fff", lineHeight: 1.08, marginTop: 8, letterSpacing: "-0.01em" }}>{title}</div>
      {extra}
    </div>
  </div>
);

const Plus: React.FC<{ y: number; k: number }> = ({ y, k }) => (
  <div style={{ position: "absolute", left: 540, top: y, translate: "-50% -50%", width: 86, height: 86, borderRadius: 99, background: "linear-gradient(135deg, #4F7BFF, #A855F7)", color: "#fff", fontFamily: SORA, fontWeight: 700, fontSize: 60, display: "flex", alignItems: "center", justifyContent: "center", scale: k, rotate: `${(1 - Math.min(1, k)) * 90}deg`, boxShadow: "0 10px 30px rgba(91,123,255,0.5)", zIndex: 3, lineHeight: 1 }}>
    +
  </div>
);

export const A7Formula: React.FC = () => {
  const t = useTime();
  const rows = [spr(t, V.productoGanador - 0.05, 8, 0.6), spr(t, V.proveedor - 0.05, 8, 0.6), spr(t, V.anuncioGanador - 0.05, 8, 0.6)];
  const plus = [spr(t, V.mas1 - 0.05, 10, 0.5), spr(t, V.mas2 - 0.05, 10, 0.5)];
  const margin = p(t, V.buenMargen, 0.4);
  const merge = p(t, 40.65, 0.75, E.inOut);

  return (
    <AbsoluteFill>
      <DarkBg glowY={50} glow={1} />

      <div style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: p(t, 37.25, 0.4) * (1 - merge) }}>
        <Eyebrow size={28} color="#C8D2F5">La fórmula</Eyebrow>
      </div>

      {/* connections that appear while merging */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: merge }}>
        {[0, 1, 2].map((i) => {
          const a = MERGE_NODES[i];
          const b = MERGE_NODES[(i + 1) % 3];
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#7B97FF" strokeWidth={5} strokeLinecap="round" style={{ filter: "drop-shadow(0 0 10px rgba(91,123,255,0.9))" }} />;
        })}
      </svg>

      {[0, 1, 2].map((i) => {
        const k = rows[i];
        const node = MERGE_NODES[i];
        const visual =
          i === 0 ? (
            <DogBottle height={230} bowl={0.7} level={0.6} t={t} />
          ) : i === 1 ? (
            <IFactory size={130} color={C.blueBright} stroke={1.5} />
          ) : (
            <AdCreative width={124} hook="Creativo destacado" hue={225} highlight={1} product={<div style={{ background: "rgba(255,255,255,0.92)", borderRadius: 14, padding: 4 }}><DogBottle height={90} bowl={0.7} level={0.6} /></div>} />
          );
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: mix(mix(1300, 540, Math.min(1, k)), node.x, merge),
              top: mix(ROW_Y[i], node.y, merge),
              translate: "-50% -50%",
              scale: mix(1, 0.32, merge),
              opacity: Math.min(1, k * 2),
              zIndex: 2,
            }}
          >
            <Row
              k={k}
              visual={visual}
              sub={["Producto ganador", "Proveedor con buen margen", "Anuncio ganador"][i]}
              title={["PRODUCTO CON POTENCIAL", "PROVEEDOR + MARGEN", "CREATIVO DESTACADO"][i]}
              extra={
                i === 1 ? (
                  <div style={{ display: "flex", gap: 22, marginTop: 14, alignItems: "baseline", fontSize: 26, color: C.muted, opacity: margin }}>
                    <span>
                      Coste <b style={{ color: "#fff" }}>{eur(CALC.cost)}</b>
                    </span>
                    <span>
                      Margen est. <b style={{ color: "#9FB3FF" }}>{eur(calcMargin())}</b>
                    </span>
                  </div>
                ) : null
              }
            />
          </div>
        );
      })}

      <div style={{ opacity: 1 - merge }}>
        <Plus y={(ROW_Y[0] + ROW_Y[1]) / 2} k={plus[0]} />
        <Plus y={(ROW_Y[1] + ROW_Y[2]) / 2} k={plus[1]} />
      </div>

      <div style={{ position: "absolute", top: 1560, right: 140, opacity: margin * (1 - merge) }}>
        <DemoTag label="Valores de ejemplo" />
      </div>
    </AbsoluteFill>
  );
};

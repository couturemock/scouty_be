import React from "react";
import { AbsoluteFill, random } from "remotion";
import { E, mix, p, useTime } from "../../animations/clock";
import { DarkBg, DemoTag, RiseText } from "../../components/primitives";
import { FEED } from "../components49";
import { C, INTER } from "../../styles/theme";
import { W49 } from "../timeline49";

const CARDS = new Array(9).fill(0).map((_, i) => ({
  x: 120 + random(`q-x-${i}`) * 840,
  y: 520 + random(`q-y-${i}`) * 1000,
  r: (random(`q-r-${i}`) - 0.5) * 24,
  d: 0.6 + random(`q-d-${i}`) * 0.6,
  k: i % 4,
}));

const SIGNAL = [12, 13, 12, 15, 14, 18, 21, 20, 26, 34, 47, 63];

export const B04Question: React.FC = () => {
  const t = useTime();
  const enter = p(t, 16.55, 0.4, E.out);
  const vanish = p(t, 17.55, 0.6, E.inOut);
  const hero = p(t, 17.7, 0.6, E.out);
  const draw = p(t, 17.9, 0.9, E.inOut);
  const link = p(t, 18.55, 0.4, E.inOut);
  const drift = (t - 16.55) * 40;

  const w = 520;
  const h = 200;
  const pts = SIGNAL.map((v, i) => [i * (w / (SIGNAL.length - 1)), h - (v / 70) * h]);
  const n = Math.max(2, Math.round(draw * pts.length));
  const path = pts.slice(0, n).map((q, i) => `${i ? "L" : "M"}${q[0]},${q[1]}`).join(" ");

  return (
    <AbsoluteFill style={{ opacity: enter }}>
      <DarkBg glowY={50} />
      {/* suspended product cards, camera drifting between them */}
      {CARDS.map((c, i) => {
        const item = FEED[c.k];
        return (
          <div key={i} style={{ position: "absolute", left: c.x - drift * c.d, top: c.y, translate: "-50% -50%", rotate: `${c.r}deg`, scale: c.d * (1 - vanish * 0.4), opacity: (1 - vanish) * 0.85, filter: c.d < 0.8 ? "blur(2px)" : undefined }}>
            <div style={{ width: 190, height: 260, borderRadius: 22, background: `radial-gradient(ellipse at 50% 40%, hsl(${item.hue} 45% 40%), #0A0C12)`, border: "2px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
              <div style={{ scale: 0.55 }}>{item.visual()}</div>
            </div>
          </div>
        );
      })}

      {/* the one card that matters: early signal */}
      <div style={{ position: "absolute", left: 540, top: 1150, translate: "-50% -50%", opacity: hero, scale: mix(0.8, 1, hero) }}>
        <div style={{ width: 640, padding: 28, borderRadius: 30, background: "#121520", border: "2px solid rgba(110,140,255,0.6)", boxShadow: "0 0 60px rgba(91,123,255,0.35)", fontFamily: INTER }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 120, height: 120, borderRadius: 20, background: "radial-gradient(ellipse at 50% 40%, hsl(215 45% 40%), #0A0C12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ scale: 0.4 }}>{FEED[0].visual()}</div>
            </div>
            <div>
              <div style={{ fontSize: 22, letterSpacing: "0.14em", color: "#9FB3FF", fontWeight: 700 }}>SEÑAL TEMPRANA</div>
              <div style={{ fontSize: 30, color: "#fff", fontWeight: 600, marginTop: 6 }}>Antes de hacerse viral</div>
            </div>
          </div>
          <svg width={w} height={h + 20} style={{ marginTop: 18, overflow: "visible" }}>
            <line x1={pts[5][0]} x2={pts[5][0]} y1={0} y2={h} stroke="rgba(255,255,255,0.25)" strokeDasharray="6 8" />
            <path d={path} fill="none" stroke="#5B7BFF" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
            {draw > 0.45 ? <circle cx={pts[5][0]} cy={pts[5][1]} r={12} fill="#fff" stroke="#5B7BFF" strokeWidth={5} /> : null}
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
            <span style={{ fontSize: 20, color: C.muted }}>↑ aquí empiezan algunos</span>
            <DemoTag label="Ilustrativo" style={{ fontSize: 14 }} />
          </div>
        </div>
      </div>
      {/* data line leading to the next scene */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <line x1={860} y1={1150} x2={mix(860, 1100, link)} y2={mix(1150, 900, link)} stroke="#7B97FF" strokeWidth={5} strokeLinecap="round" style={{ filter: "drop-shadow(0 0 10px #7B97FF)" }} />
      </svg>

      <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
        <div style={{ fontFamily: INTER, fontSize: 32, color: C.muted, opacity: p(t, W49.pregunta, 0.4), letterSpacing: "0.1em" }}>LA PREGUNTA ES</div>
        <RiseText text={"¿Cómo lo encuentran\nantes?"} at={W49.comoAntes - 0.25} size={80} color="#fff" highlight={["antes"]} highlightColor={C.blueSoft} />
      </div>
    </AbsoluteFill>
  );
};

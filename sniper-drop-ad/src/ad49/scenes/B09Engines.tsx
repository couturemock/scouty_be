import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, spr, useTime } from "../../animations/clock";
import { DarkBg, LogoIcon, RiseText } from "../../components/primitives";
import { MOTORS, MotorCard } from "../../components/ui/Engines";
import { C, INTER } from "../../styles/theme";
import { W49 } from "../timeline49";

const CORE = { x: 540, y: 1010 };
const POS = [
  { x: 300, y: 620 },
  { x: 780, y: 620 },
  { x: 300, y: 1390 },
  { x: 780, y: 1390 },
];

export const B09Engines: React.FC = () => {
  const t = useTime();
  const enter = p(t, 36.75, 0.4, E.out);
  const core = spr(t, W49.masBestia, 7, 0.6);
  const sys = p(t, W49.sistema, 0.4);
  const cards = POS.map((_, i) => spr(t, W49.cuatroMotores - 0.1 + i * 0.15, 8, 0.6));
  const active = POS.map((_, i) => p(t, W49.cuatroMotores + 0.3 + i * 0.2, 0.3));
  const flow = p(t, W49.rastreando - 0.1, 0.4);
  const exit = p(t, 40.85, 0.25, E.in);

  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, 1 - exit) }}>
      <DarkBg glowY={52} glow={1 + core * 0.4} />

      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {POS.map((m, i) => {
          const len = Math.hypot(m.x - CORE.x, m.y - CORE.y);
          const k = active[i];
          return (
            <g key={i}>
              <line x1={m.x} y1={m.y} x2={CORE.x} y2={CORE.y} stroke="rgba(79,123,255,0.6)" strokeWidth={3} strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - k)} />
              {flow > 0
                ? [0, 1, 2].map((j) => {
                    const u = (t * 0.8 + j / 3 + i * 0.2) % 1;
                    return <circle key={j} cx={mix(m.x, CORE.x, u)} cy={mix(m.y, CORE.y, u)} r={6} fill="#B9C6FF" opacity={Math.sin(u * Math.PI) * flow} />;
                  })
                : null}
            </g>
          );
        })}
        <g transform={`rotate(${t * 40} ${CORE.x} ${CORE.y})`} opacity={core}>
          <circle cx={CORE.x} cy={CORE.y} r={190} fill="none" stroke="rgba(168,85,247,0.45)" strokeWidth={2} strokeDasharray="30 18" />
        </g>
      </svg>

      {/* central system with the official logo */}
      <div style={{ position: "absolute", left: CORE.x, top: CORE.y, translate: "-50% -50%", scale: core, opacity: Math.min(1, core * 2), zIndex: 2 }}>
        <div style={{ width: 300, height: 300, borderRadius: 999, background: "radial-gradient(circle, #13203F 0%, #0A0F1E 70%)", border: "2px solid rgba(168,85,247,0.7)", boxShadow: `0 0 ${80 + flow * 60}px rgba(91,123,255,${0.4 + flow * 0.3})`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <LogoIcon width={150} />
          <div style={{ fontFamily: INTER, fontSize: 18, letterSpacing: "0.16em", color: "#9FB3FF", marginTop: 8, opacity: sys }}>SISTEMA PROPIO</div>
        </div>
      </div>

      {/* four engines (names as published on sniperdrop.com) */}
      {POS.map((m, i) => {
        const k = cards[i];
        return (
          <div key={i} style={{ position: "absolute", left: mix(m.x < 540 ? -300 : 1380, m.x, k), top: m.y, translate: "-50% -50%", opacity: Math.min(1, k * 2), zIndex: 3, perspective: 1400 }}>
            <div style={{ transform: `rotateY(${(m.x < 540 ? 8 : -8) * Math.min(1, k)}deg)` }}>
              <MotorCard motor={MOTORS[i]} width={440} active={active[i]} />
            </div>
          </div>
        );
      })}

      <div style={{ position: "absolute", top: 225, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {t < W49.cuatroMotores - 0.3 ? (
          <RiseText text={"Lo más bestia:\ncómo lo hace"} at={W49.masBestia} out={W49.cuatroMotores - 0.55} size={70} color="#fff" highlight={["cómo"]} highlightColor={C.blueSoft} />
        ) : (
          <RiseText text="4 motores de IA" at={W49.cuatroMotores - 0.2} size={84} color="#fff" highlight={["IA"]} highlightColor={C.blueSoft} />
        )}
      </div>
    </AbsoluteFill>
  );
};

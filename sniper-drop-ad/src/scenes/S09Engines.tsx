import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, spr, useTime } from "../animations/clock";
import { DarkBg, Eyebrow, RiseText } from "../components/primitives";
import { CoreEngine, MOTORS, MotorCard } from "../components/ui/Engines";
import { C, INTER } from "../styles/theme";
import { VO } from "../timeline";

export const CORE = { x: 540, y: 1010 };
const CARD_W = 440;
export const MOTOR_POS = [
  { x: 300, y: 620 },
  { x: 780, y: 620 },
  { x: 300, y: 1390 },
  { x: 780, y: 1390 },
];

export const S09Engines: React.FC = () => {
  const t = useTime();
  const q = p(t, VO.howQuestion, 0.6);
  const qOut = p(t, VO.ownSystem - 0.3, 0.4, E.in);
  const core = spr(t, VO.ownSystem, 7, 0.6);
  const cards = [0, 1, 2, 3].map((i) => spr(t, VO.fourEngines - 0.35 + i * 0.13, 8, 0.6));
  const lines = p(t, VO.fourEngines + 0.3, 0.9, E.inOut);
  const pill = p(t, VO.tracking247 - 0.1, 0.5);
  const exit = p(t, 67.0, 0.35, E.inOut);
  const pulse = (Math.sin(t * 5) + 1) / 2;

  return (
    <AbsoluteFill style={{ opacity: 1 - exit * 0.0 }}>
      <DarkBg glowY={52} glow={0.8 + core * 0.5} />

      {/* opening question */}
      <div style={{ position: "absolute", top: 820, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: q * (1 - qOut) }}>
        <RiseText text={"¿Y cómo consigue\ntoda esa información?"} at={VO.howQuestion} size={74} color="#fff" highlight={["información"]} highlightColor={C.blueSoft} />
      </div>

      <AbsoluteFill style={{ scale: mix(1, 0.62, exit), opacity: 1 - exit }}>
        {/* data lines with labels (as on sniperdrop.com) */}
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {MOTOR_POS.map((m, i) => {
            const len = Math.hypot(m.x - CORE.x, m.y - CORE.y);
            const k = Math.min(1, Math.max(0, lines * 1.6 - i * 0.2));
            const dots = [0, 1, 2].map((j) => ((t * 0.6 + j / 3 + i * 0.17) % 1));
            return (
              <g key={i}>
                <line x1={m.x} y1={m.y} x2={CORE.x} y2={CORE.y} stroke="rgba(79,123,255,0.55)" strokeWidth={2.5} strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - k)} />
                {k >= 1
                  ? dots.map((d, j) => (
                      <circle key={j} cx={mix(m.x, CORE.x, d)} cy={mix(m.y, CORE.y, d)} r={5} fill="#8FA6FF" opacity={Math.sin(d * Math.PI)} />
                    ))
                  : null}
              </g>
            );
          })}
        </svg>
        {MOTOR_POS.map((m, i) => {
          const mx = mix(m.x, CORE.x, 0.5);
          const my = mix(m.y, CORE.y, 0.5) + (i < 2 ? 20 : -20);
          const ang = (Math.atan2(CORE.y - m.y, CORE.x - m.x) * 180) / Math.PI;
          const k = Math.min(1, Math.max(0, lines * 1.6 - i * 0.2));
          return (
            <div key={i} style={{ position: "absolute", left: mx, top: my, translate: "-50% -50%", rotate: `${Math.abs(ang) > 90 ? ang + 180 : ang}deg`, fontFamily: INTER, fontSize: 17, letterSpacing: "0.16em", fontWeight: 600, color: "#9AA6C8", opacity: k, whiteSpace: "nowrap", zIndex: 0 }}>
              {MOTORS[i].data} →
            </div>
          );
        })}

        {/* core */}
        <div style={{ position: "absolute", left: CORE.x, top: CORE.y, translate: "-50% -50%", scale: core, opacity: Math.min(1, core * 2), zIndex: 2 }}>
          <CoreEngine width={460} pulse={pulse * core} />
        </div>

        {/* four motors */}
        {MOTOR_POS.map((m, i) => {
          const k = cards[i];
          const fromX = m.x < 540 ? -300 : 1380;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: mix(fromX, m.x, k),
                top: m.y,
                translate: "-50% -50%",
                opacity: Math.min(1, k * 2),
                rotate: `${(1 - k) * (m.x < 540 ? -10 : 10)}deg`,
                zIndex: 3,
                perspective: 1400,
              }}
            >
              <div style={{ transform: `rotateY(${(m.x < 540 ? 8 : -8) * k}deg)` }}>
                <MotorCard motor={MOTORS[i]} width={CARD_W} active={(Math.floor(t * 2.5) % 4 === i && t > VO.tracking247 ? 1 : 0.15) * k} />
              </div>
            </div>
          );
        })}
      </AbsoluteFill>

      {/* headline + 24/7 */}
      <div style={{ position: "absolute", top: 225, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: 1 - exit }}>
        {t > VO.fourEngines - 0.5 ? <RiseText text="4 motores de IA" at={VO.fourEngines - 0.3} size={80} color="#fff" highlight={["IA"]} highlightColor={C.blueSoft} /> : null}
      </div>
      <div style={{ position: "absolute", top: 1006, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: 0 }} />
      <div style={{ position: "absolute", top: 345, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: pill * (1 - exit), translate: `0 ${(1 - pill) * 14}px` }}>
        <Eyebrow size={24} color="#C8D2F5" style={{ background: "rgba(79,123,255,0.12)", border: "1px solid rgba(110,140,255,0.4)", borderRadius: 99, padding: "12px 24px" }}>
          Sistemas de análisis activos 24/7
        </Eyebrow>
      </div>
    </AbsoluteFill>
  );
};

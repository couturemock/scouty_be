import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, useTime } from "../../animations/clock";
import { DarkBg, RiseText } from "../../components/primitives";
import { Earbuds } from "../../components/product/Products";
import { Stage } from "../components49";
import { C, INTER } from "../../styles/theme";
import { W49 } from "../timeline49";

const STAGES = ["DETECCIÓN", "PRUEBAS", "VENTAS", "VIRALIDAD"];
const XS = [180, 420, 660, 900];
const LINE_Y = 960;

export const B02Market: React.FC = () => {
  const t = useTime();
  const enter = p(t, 6.4, 0.35, E.out);
  const line = p(t, 6.55, 0.5, E.inOut);
  // product accelerates along the stages (ease-in = speeding up)
  const run = p(t, 6.75, 1.4, E.in);
  const x = mix(XS[0], XS[3], run);
  const prevX = mix(XS[0], XS[3], p(t - 0.08, 6.75, 1.4, E.in));
  const speed = Math.abs(x - prevX);
  const late = p(t, 8.15, 0.35, E.out);
  const exit = p(t, 8.55, 0.3, E.in);
  const shake = late > 0 && late < 1 ? Math.sin(t * 80) * 6 * (1 - late) : 0;

  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, 1 - exit) }}>
      <DarkBg glowY={50} />
      {/* camera follows the product */}
      <AbsoluteFill style={{ scale: 1.0, translate: `${mix(25, -25, run) + shake}px 0` }}>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          <line x1={XS[0]} x2={mix(XS[0], XS[3], line)} y1={LINE_Y + 22} y2={LINE_Y + 22} stroke="rgba(123,151,255,0.4)" strokeWidth={6} strokeLinecap="round" />
          <line x1={XS[0]} x2={x} y1={LINE_Y + 22} y2={LINE_Y + 22} stroke="#5B7BFF" strokeWidth={6} strokeLinecap="round" />
          {/* speed streaks */}
          {[0, 1, 2].map((i) => (
            <line key={i} x1={x - 40 - speed * (3 + i)} x2={x - 40} y1={LINE_Y - 120 + i * 50} y2={LINE_Y - 120 + i * 50} stroke={`rgba(160,180,255,${0.5 - i * 0.12})`} strokeWidth={4} strokeLinecap="round" />
          ))}
        </svg>
        <div style={{ position: "absolute", left: 0, top: LINE_Y, width: 1080 }}>
          {STAGES.map((s, i) => {
            const reached = run >= (XS[i] - XS[0]) / (XS[3] - XS[0]) - 0.001;
            return <Stage key={s} label={s} x={XS[i]} done={reached ? 1 : 0} active={reached ? Math.max(0, 1 - Math.abs(x - XS[i]) / 120) : 0} />;
          })}
        </div>
        <div style={{ position: "absolute", left: x - 90, top: LINE_Y - 230, filter: `blur(${Math.min(6, speed * 0.25)}px)` }}>
          <Earbuds size={180} lid={1} />
        </div>
      </AbsoluteFill>

      <div style={{ position: "absolute", top: 1150, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: late, scale: mix(1.3, 1, late) }}>
        <div style={{ border: "3px solid #FF6B4A", borderRadius: 18, padding: "18px 30px", fontFamily: INTER, fontWeight: 800, fontSize: 40, letterSpacing: "0.06em", color: "#FF8A6F", textAlign: "center", rotate: "-3deg", background: "rgba(40,12,10,0.6)" }}>
          DEMASIADO TARDE PARA
          <br />
          SER DE LOS PRIMEROS
        </div>
      </div>

      <div style={{ position: "absolute", top: 260, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <RiseText text={"El mercado va\ndemasiado rápido"} at={W49.mercado - 0.1} size={80} color="#fff" highlight={["rápido"]} highlightColor={C.blueSoft} />
      </div>
    </AbsoluteFill>
  );
};

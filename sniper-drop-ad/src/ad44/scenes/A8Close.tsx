import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, useTime } from "../../animations/clock";
import { DarkBg, LogoIcon, LogoWordmark, RiseText } from "../../components/primitives";
import { INTER } from "../../styles/theme";
import { V } from "../timeline44";
import { MERGE_NODES } from "./A7Formula";

const LOGO_W = 860;
const s = LOGO_W / 1264;
const CENTER = { x: 540, y: 860 };

export const A8Close: React.FC = () => {
  const t = useTime();
  const converge = p(t, 41.0, 0.6, E.inOut); // the formula triangle collapses into the crosshair
  const icon = p(t, 41.45, 0.6, E.out);
  const word = p(t, 41.75, 0.6, E.inOut);
  const url = p(t, 42.7, 0.6, E.out);
  const ring = p(t, 41.3, 1.2, E.out);

  return (
    <AbsoluteFill style={{ opacity: p(t, 41.0, 0.35) }}>
      <DarkBg glowY={45} glow={1.3} />

      {/* triangle nodes converging */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 1 - icon }}>
        {MERGE_NODES.map((n, i) => {
          const a = { x: mix(n.x, CENTER.x, converge), y: mix(n.y, CENTER.y, converge) };
          const b0 = MERGE_NODES[(i + 1) % 3];
          const b = { x: mix(b0.x, CENTER.x, converge), y: mix(b0.y, CENTER.y, converge) };
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#7B97FF" strokeWidth={5} />
              <circle cx={a.x} cy={a.y} r={26} fill="#141A2C" stroke="#7B97FF" strokeWidth={5} />
            </g>
          );
        })}
      </svg>

      {/* crosshair rings */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <circle cx={CENTER.x} cy={CENTER.y} r={mix(60, 520, ring)} fill="none" stroke={`rgba(79,123,255,${0.4 * (1 - ring * 0.6)})`} strokeWidth={2} />
        <circle cx={CENTER.x} cy={CENTER.y} r={mix(40, 400, ring)} fill="none" stroke="rgba(79,123,255,0.15)" strokeWidth={1.5} strokeDasharray="6 10" />
      </svg>

      {/* official logo */}
      <div style={{ position: "absolute", left: CENTER.x - LOGO_W / 2, top: CENTER.y - (406 * s) / 2, width: LOGO_W, height: 406 * s }}>
        <div style={{ position: "absolute", left: 0, top: 0, clipPath: `circle(${icon * 75}% at 57% 48%)`, scale: mix(1.3, 1, icon), rotate: `${mix(-30, 0, icon)}deg` }}>
          <LogoIcon width={425 * s} />
        </div>
        <div style={{ position: "absolute", left: 428 * s, top: 75 * s, clipPath: `inset(-10% ${(1 - word) * 100}% -10% 0)`, translate: `${(1 - word) * -40}px 0` }}>
          <LogoWordmark width={836 * s} />
        </div>
      </div>

      <div style={{ position: "absolute", top: 1120, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <RiseText text={"El mapa del tesoro\ndel e-commerce"} at={V.mapaFinal - 0.1} size={70} color="#fff" highlight={["tesoro"]} highlightColor="#9FB3FF" />
      </div>

      <div style={{ position: "absolute", top: 1360, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: url, translate: `0 ${(1 - url) * 20}px` }}>
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 42, color: "#fff", padding: "20px 42px", borderRadius: 99, border: "1.5px solid rgba(110,140,255,0.6)", background: "rgba(79,123,255,0.14)" }}>www.sniperdrop.com</div>
      </div>
    </AbsoluteFill>
  );
};

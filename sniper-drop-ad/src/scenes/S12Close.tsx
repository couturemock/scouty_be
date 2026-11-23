import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, useTime } from "../animations/clock";
import { DarkBg, Logo, RiseText } from "../components/primitives";
import { C, INTER } from "../styles/theme";
import { VO } from "../timeline";

export const S12Close: React.FC = () => {
  const t = useTime();
  const shrink = p(t, 77.85, 0.9, E.inOut); // the organised interface condenses into the brand
  const logo = p(t, VO.difference - 0.2, 0.9, E.out);
  const url = p(t, 80.4, 0.6, E.out);
  const lines = p(t, 78.3, 1.4, E.out);

  return (
    <AbsoluteFill>
      <DarkBg glowY={40} glow={1.2} />

      {/* condensing interface card */}
      <div
        style={{
          position: "absolute",
          left: 540,
          top: mix(1150, 780, shrink),
          translate: "-50% -50%",
          width: mix(900, 120, shrink),
          height: mix(1100, 120, shrink),
          borderRadius: mix(28, 60, shrink),
          background: "#121520",
          border: "1.5px solid rgba(110,140,255,0.6)",
          boxShadow: "0 0 60px rgba(91,123,255,0.4)",
          opacity: 1 - logo,
          padding: mix(36, 0, shrink),
          display: "flex",
          flexDirection: "column",
          gap: 18,
          overflow: "hidden",
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{ height: 96, flexShrink: 0, borderRadius: 16, background: i === 0 ? "rgba(76,104,255,0.18)" : "rgba(255,255,255,0.05)", border: `1.5px solid ${i === 0 ? "rgba(110,140,255,0.7)" : "rgba(255,255,255,0.07)"}`, opacity: 1 - p(t, 77.9 + i * 0.05, 0.4) }} />
        ))}
      </div>

      {/* crosshair framing */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.8 }}>
        <line x1={540} x2={540} y1={780 - 330 * lines} y2={780 - 250 * lines} stroke="#3A63D8" strokeWidth={2} />
        <line x1={540} x2={540} y1={780 + 250 * lines} y2={780 + 330 * lines} stroke="#3A63D8" strokeWidth={2} />
        <circle cx={540} cy={780} r={mix(120, 520, lines)} fill="none" stroke="rgba(79,123,255,0.18)" strokeWidth={1.5} />
      </svg>

      <div style={{ position: "absolute", left: 540, top: 780, translate: "-50% -50%", opacity: logo, scale: mix(0.85, 1, logo), filter: `blur(${(1 - logo) * 8}px)` }}>
        <Logo width={820} />
      </div>

      <div style={{ position: "absolute", top: 1030, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <RiseText text="Deja de buscar a ciegas." at={VO.stopBlind} size={58} color="#fff" />
        <RiseText text="Empieza a buscar con datos." at={VO.startData} size={58} color={C.blueSoft} />
      </div>

      <div style={{ position: "absolute", top: 1330, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: url, translate: `0 ${(1 - url) * 20}px` }}>
        <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 40, color: "#fff", padding: "20px 40px", borderRadius: 99, border: "1.5px solid rgba(110,140,255,0.6)", background: "rgba(79,123,255,0.12)", letterSpacing: "0.02em" }}>
          www.sniperdrop.com
        </div>
      </div>
    </AbsoluteFill>
  );
};

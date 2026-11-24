import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, spr, useTime } from "../../animations/clock";
import { DarkBg, LogoIcon } from "../../components/primitives";
import { IGlobe } from "../../components/Icons";
import { Platform, PlatformTile } from "../../ad44/components44";
import { C, INTER, SORA } from "../../styles/theme";
import { W49 } from "../timeline49";

const CX = 540;
const CY = 1000;
const SOURCES: { key: Platform | "other"; at: number; x: number; y: number }[] = [
  { key: "tiktok", at: W49.tiktokShop, x: 260, y: 560 },
  { key: "meta", at: W49.metaAds, x: 820, y: 620 },
  { key: "shopify", at: W49.shopify, x: 810, y: 1390 },
  { key: "other", at: W49.otras, x: 260, y: 1400 },
];
const ctrl = (s: { x: number; y: number }) => ({ x: (s.x + CX) / 2 + (s.y - CY) * 0.2, y: (s.y + CY) / 2 - (s.x - CX) * 0.2 });
const qpt = (s: { x: number; y: number }, k: number) => {
  const c = ctrl(s);
  return { x: (1 - k) ** 2 * s.x + 2 * (1 - k) * k * c.x + k * k * CX, y: (1 - k) ** 2 * s.y + 2 * (1 - k) * k * c.y + k * k * CY };
};

const Packet: React.FC<{ kind: number; hue: number }> = ({ kind, hue }) => (
  <div style={{ width: 70, height: kind === 1 ? 110 : 70, borderRadius: 14, background: kind === 1 ? `linear-gradient(165deg, hsl(${hue} 50% 45%), #0A0D16)` : "#151A27", border: "1.5px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
    {kind === 0 ? <div style={{ width: 26, height: 32, borderRadius: 7, background: `hsl(${hue} 55% 60%)` }} /> : kind === 2 ? (
      <svg width={46} height={30}>
        <polyline points="2,26 12,19 22,21 32,10 44,3" fill="none" stroke="#7B97FF" strokeWidth={3.5} strokeLinecap="round" />
      </svg>
    ) : null}
  </div>
);

export const B10Platforms: React.FC = () => {
  const t = useTime();
  const enter = p(t, 40.9, 0.3, E.out);
  const label = p(t, W49.v247 - 0.05, 0.4);
  const exit = p(t, 44.12, 0.22, E.in);
  // camera follows the flow, drifting toward each newly connected source
  const focus = t < W49.metaAds ? 0 : t < W49.shopify ? 1 : t < W49.otras ? 2 : 3;
  const camX = mix(0, (CX - SOURCES[focus].x) * 0.08, p(t, SOURCES[focus].at, 0.5, E.inOut));
  const camY = mix(0, (CY - SOURCES[focus].y) * 0.08, p(t, SOURCES[focus].at, 0.5, E.inOut));

  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, 1 - exit) }}>
      <DarkBg glowY={52} glow={1.2} />
      <AbsoluteFill style={{ translate: `${camX}px ${camY}px`, scale: 1 + (t - 40.9) * 0.012 }}>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {SOURCES.map((s, i) => {
            const k = p(t, s.at + 0.05, 0.5, E.inOut);
            const c = ctrl(s);
            return <path key={i} d={`M ${s.x} ${s.y} Q ${c.x} ${c.y} ${CX} ${CY}`} fill="none" stroke="rgba(91,123,255,0.6)" strokeWidth={3} strokeDasharray="1200" strokeDashoffset={1200 * (1 - k)} />;
          })}
          <g transform={`rotate(${t * 45} ${CX} ${CY})`}>
            <circle cx={CX} cy={CY} r={200} fill="none" stroke="rgba(168,85,247,0.45)" strokeWidth={2} strokeDasharray="34 20" />
          </g>
          <circle cx={CX} cy={CY} r={170 + ((t * 140) % 240)} fill="none" stroke={`rgba(123,151,255,${0.5 * (1 - ((t * 140) % 240) / 240)})`} strokeWidth={2} />
        </svg>

        {/* products, ads and charts travelling along the connections */}
        {SOURCES.map((s, i) =>
          [0, 1].map((j) => {
            if (t < s.at + 0.45) return null;
            const u = ((t - s.at - 0.45) * 0.7 + j * 0.5) % 1;
            const q = qpt(s, u);
            return (
              <div key={`${i}-${j}`} style={{ position: "absolute", left: q.x, top: q.y, translate: "-50% -50%", opacity: Math.sin(u * Math.PI), scale: mix(1, 0.45, u) }}>
                <Packet kind={(i + j) % 3} hue={[210, 330, 30, 150][i]} />
              </div>
            );
          }),
        )}

        {/* core: Sniper Drop · Análisis 24/7 */}
        <div style={{ position: "absolute", left: CX, top: CY, translate: "-50% -50%" }}>
          <div style={{ width: 340, height: 340, borderRadius: 999, background: "radial-gradient(circle, #13203F 0%, #0A0F1E 70%)", border: "2px solid rgba(168,85,247,0.7)", boxShadow: `0 0 ${90 + Math.sin(t * 5) * 20}px rgba(91,123,255,0.5)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <LogoIcon width={110} />
            <div style={{ fontFamily: INTER, fontSize: 20, letterSpacing: "0.18em", color: "#9FB3FF", marginTop: 8, opacity: label }}>ANÁLISIS</div>
            <div style={{ fontFamily: SORA, fontSize: 64, fontWeight: 700, color: "#fff", lineHeight: 1, opacity: label, scale: mix(1.4, 1, label) }}>24/7</div>
          </div>
        </div>

        {/* official logos, on the exact word */}
        {SOURCES.map((s) => {
          const k = spr(t, s.at - 0.04, 9, 0.5);
          return (
            <div key={s.key} style={{ position: "absolute", left: s.x, top: s.y, translate: "-50% -50%", scale: k, opacity: Math.min(1, k * 2.5), rotate: `${(1 - Math.min(1, k)) * -12}deg` }}>
              {s.key === "other" ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 150, height: 150, borderRadius: 34, background: "#121520", border: "2px dashed rgba(123,151,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <IGlobe size={70} color={C.blueBright} />
                  </div>
                  <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 28, color: "#C8D2F5" }}>Otras fuentes</div>
                </div>
              ) : (
                <PlatformTile platform={s.key} size={230} glow={p(t, s.at + 0.05, 0.25) * (1 - p(t, s.at + 0.7, 0.4))} />
              )}
            </div>
          );
        })}
      </AbsoluteFill>

      <div style={{ position: "absolute", top: 250, left: 0, right: 0, textAlign: "center", fontFamily: INTER, fontWeight: 600, fontSize: 30, letterSpacing: "0.2em", color: "#C8D2F5", opacity: label, marginRight: "-0.2em" }}>
        RASTREANDO 24/7
      </div>
    </AbsoluteFill>
  );
};

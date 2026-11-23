import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, spr, useTime } from "../animations/clock";
import { DarkBg, DemoTag, Eyebrow } from "../components/primitives";
import { IGlobe, IMegaphone, IStore } from "../components/Icons";
import { CoreEngine } from "../components/ui/Engines";
import { ProductThumb } from "../components/ui/DropSniperUI";
import { C, INTER, SORA } from "../styles/theme";
import { VO } from "../timeline";

const CX = 540;
const CY = 960;

/**
 * Sources named in the script. Rendered as neutral text nodes (no official
 * trademarks are reproduced); "Otras fuentes" stays generic on purpose.
 */
const SOURCES = [
  { label: "TikTok Shop", at: VO.tiktokShopSrc, x: 540, y: 520, icon: IStore },
  { label: "Meta Ads", at: VO.metaAdsSrc, x: 810, y: 790, icon: IMegaphone },
  { label: "Shopify", at: VO.shopifySrc, x: 820, y: 1260, icon: IStore },
  { label: "Otras fuentes", at: VO.otherSrc, x: 250, y: 1130, icon: IGlobe },
];

const curve = (s: { x: number; y: number }) => {
  const mx = (s.x + CX) / 2 + (s.y - CY) * 0.18;
  const my = (s.y + CY) / 2 - (s.x - CX) * 0.18;
  return { mx, my, d: `M ${s.x} ${s.y} Q ${mx} ${my} ${CX} ${CY}` };
};
const qpt = (s: { x: number; y: number }, k: number) => {
  const { mx, my } = curve(s);
  const a = (1 - k) * (1 - k);
  const b = 2 * (1 - k) * k;
  const c = k * k;
  return { x: a * s.x + b * mx + c * CX, y: a * s.y + b * my + c * CY };
};

export const S10Sources: React.FC = () => {
  const t = useTime();
  const enter = p(t, 67.1, 0.6, E.out);
  const density = mix(2, 6, p(t, VO.signals - 0.2, 0.8));
  const opp = spr(t, VO.opportunities, 7, 0.6);
  const exit = p(t, 72.0, 0.3, E.in);
  const spin = t * 40;

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <DarkBg glowY={50} glow={1.3} />

      <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: enter }}>
        <Eyebrow size={24} color="#C8D2F5" style={{ background: "rgba(79,123,255,0.12)", border: "1px solid rgba(110,140,255,0.4)", borderRadius: 99, padding: "12px 24px" }}>
          Sistemas de análisis activos 24/7
        </Eyebrow>
      </div>

      {/* connections + travelling signals */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {SOURCES.map((s, i) => {
          const k = p(t, s.at, 0.6, E.inOut);
          const { d } = curve(s);
          const n = Math.round(density);
          return (
            <g key={i} opacity={k}>
              <path d={d} fill="none" stroke="rgba(79,123,255,0.5)" strokeWidth={2.5} strokeDasharray="1400" strokeDashoffset={1400 * (1 - k)} />
              {k >= 1
                ? new Array(n).fill(0).map((_, j) => {
                    const u = (t * 0.55 + j / n + i * 0.13) % 1;
                    const pt = qpt(s, u);
                    return <circle key={j} cx={pt.x} cy={pt.y} r={j % 3 === 0 ? 7 : 4.5} fill={j % 3 === 0 ? "#B9C6FF" : "#5B7BFF"} opacity={Math.sin(u * Math.PI)} />;
                  })
                : null}
            </g>
          );
        })}
        {/* continuous scanning ring */}
        <g transform={`rotate(${spin} ${CX} ${CY})`} opacity={enter}>
          <circle cx={CX} cy={CY} r={250} fill="none" stroke="rgba(168,85,247,0.35)" strokeWidth={2} strokeDasharray="40 22" />
        </g>
        <g transform={`rotate(${-spin * 0.6} ${CX} ${CY})`} opacity={enter}>
          <circle cx={CX} cy={CY} r={290} fill="none" stroke="rgba(79,123,255,0.25)" strokeWidth={1.5} strokeDasharray="4 12" />
          <path d={`M ${CX} ${CY - 290} A 290 290 0 0 1 ${CX + 290} ${CY}`} fill="none" stroke="#5B7BFF" strokeWidth={4} strokeLinecap="round" />
        </g>
      </svg>

      {/* tiny product cards travelling into the core */}
      {SOURCES.map((s, i) => {
        if (t < s.at + 0.6) return null;
        const u = ((t - s.at) * 0.45 + i * 0.25) % 1;
        const pt = qpt(s, u);
        return (
          <div key={i} style={{ position: "absolute", left: pt.x - 30, top: pt.y - 30, width: 60, height: 60, borderRadius: 12, background: "#141822", border: "1px solid rgba(255,255,255,0.15)", opacity: Math.sin(u * Math.PI), scale: mix(1, 0.4, u), display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 22, height: 28, borderRadius: 6, background: `hsl(${[210, 330, 30, 150][i]} 55% 60%)` }} />
          </div>
        );
      })}

      {/* core */}
      <div style={{ position: "absolute", left: CX, top: CY, translate: "-50% -50%", scale: mix(0.8, 1, enter) }}>
        <CoreEngine
          width={400}
          pulse={(Math.sin(t * 6) + 1) / 2}
          label={
            <>
              <div style={{ fontFamily: INTER, fontSize: 18, letterSpacing: "0.18em", color: C.blueBright }}>DROP SNIPER</div>
              <div style={{ fontFamily: SORA, fontSize: 60, fontWeight: 700, color: "#fff", marginTop: 4, letterSpacing: "-0.01em" }}>Rastreo</div>
              <div style={{ fontFamily: SORA, fontSize: 60, fontWeight: 700, color: C.blueSoft, marginTop: -8 }}>24/7</div>
            </>
          }
        />
      </div>

      {/* sources */}
      {SOURCES.map((s) => {
        const k = spr(t, s.at - 0.05, 9, 0.55);
        const Icon = s.icon;
        return (
          <div key={s.label} style={{ position: "absolute", left: s.x, top: s.y, translate: "-50% -50%", scale: k, opacity: Math.min(1, k * 2) }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "20px 28px", borderRadius: 24, background: "#121520", border: "1.5px solid rgba(110,140,255,0.45)", boxShadow: "0 20px 40px rgba(0,0,0,0.5), 0 0 30px rgba(79,123,255,0.2)", fontFamily: INTER, fontSize: 34, fontWeight: 700, color: "#fff", whiteSpace: "nowrap" }}>
              <Icon size={34} color={C.blueBright} /> {s.label}
            </div>
          </div>
        );
      })}

      {/* opportunity detected (real product sheet data) */}
      <div style={{ position: "absolute", left: 540, top: mix(1300, 1440, opp), translate: "-50% -50%", scale: mix(0.6, 1, opp), opacity: Math.min(1, opp * 2) }}>
        <div style={{ width: 860, display: "flex", gap: 24, alignItems: "center", padding: 24, borderRadius: 28, background: "linear-gradient(180deg, #161A26, #10131B)", border: "2px solid rgba(110,140,255,0.7)", boxShadow: "0 0 60px rgba(91,123,255,0.45), 0 30px 60px rgba(0,0,0,0.5)", fontFamily: INTER, color: "#fff" }}>
          <ProductThumb size={140} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, letterSpacing: "0.14em", color: C.blueBright, fontWeight: 600 }}>OPORTUNIDAD DETECTADA</div>
            <div style={{ fontSize: 30, fontWeight: 600, marginTop: 8, lineHeight: 1.2 }}>Piarhlie Aspiradora de Mano 30kPa</div>
            <div style={{ display: "flex", gap: 22, marginTop: 12, fontSize: 24, color: C.muted }}>
              <span><b style={{ color: "#fff" }}>19,90 €</b></span>
              <span>BSR <b style={{ color: "#fff" }}>#12</b></span>
              <span><b style={{ color: "#fff" }}>~3.000</b>/mes est.</span>
            </div>
          </div>
        </div>
      </div>

      {/* trend chart that keeps updating (illustrative) */}
      <div style={{ position: "absolute", left: 90, top: 380, opacity: p(t, VO.signals, 0.5) * (1 - opp * 0.0) }}>
        <TrendMini t={t} />
      </div>
    </AbsoluteFill>
  );
};

const TrendMini: React.FC<{ t: number }> = ({ t }) => {
  // deterministic wavy upward series that scrolls → "updating"
  const pts = new Array(14).fill(0).map((_, i) => {
    const x = i * 22;
    const base = 70 - i * 3.5;
    const y = base + Math.sin(i * 1.3 + t * 2) * 8;
    return `${x},${y}`;
  });
  return (
    <div style={{ padding: "16px 18px", borderRadius: 18, background: "rgba(18,21,32,0.9)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: INTER }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14 }}>
        <div style={{ fontSize: 18, color: "#C3C8D3", fontWeight: 600 }}>Tendencia</div>
        <DemoTag label="Ilustrativo" style={{ fontSize: 13, padding: "3px 8px" }} />
      </div>
      <svg width={290} height={90} style={{ marginTop: 6 }}>
        <polyline points={pts.join(" ")} fill="none" stroke="#5B7BFF" strokeWidth={3.5} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  );
};

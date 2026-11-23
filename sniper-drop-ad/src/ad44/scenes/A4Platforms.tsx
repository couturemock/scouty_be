import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, spr, useTime } from "../../animations/clock";
import { DarkBg, DemoTag, LogoIcon, RiseText } from "../../components/primitives";
import { IGlobe } from "../../components/Icons";
import { RANKING_ROWS } from "../../components/ui/DropSniperUI";
import { Platform, PlatformTile, ProductPhoto, TrendChart } from "../components44";
import { C, INTER } from "../../styles/theme";
import { V } from "../timeline44";

const CX = 540;
const CY = 1010;

const SOURCES: { key: Platform | "other"; at: number; x: number; y: number }[] = [
  { key: "tiktok", at: V.tiktokShop, x: 255, y: 600 },
  { key: "meta", at: V.metaAds, x: 825, y: 640 },
  { key: "shopify", at: V.shopify, x: 820, y: 1390 },
  { key: "other", at: V.otras, x: 250, y: 1400 },
];

const ctrl = (s: { x: number; y: number }) => ({ x: (s.x + CX) / 2 + (s.y - CY) * 0.2, y: (s.y + CY) / 2 - (s.x - CX) * 0.2 });
const qpt = (s: { x: number; y: number }, k: number) => {
  const c = ctrl(s);
  return { x: (1 - k) ** 2 * s.x + 2 * (1 - k) * k * c.x + k * k * CX, y: (1 - k) ** 2 * s.y + 2 * (1 - k) * k * c.y + k * k * CY };
};

const MiniRow: React.FC<{ i: number; hl: number }> = ({ i, hl }) => {
  const r = RANKING_ROWS[i];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", borderRadius: 16, background: hl ? `rgba(76,104,255,${0.18 * hl})` : "rgba(255,255,255,0.03)", border: `1.5px solid rgba(110,140,255,${0.1 + 0.7 * hl})`, boxShadow: hl ? `0 0 ${36 * hl}px rgba(91,123,255,0.45)` : undefined, fontFamily: INTER, scale: 1 + hl * 0.04 }}>
      {i === 1 ? <ProductPhoto size={58} style={{ boxShadow: "none" }} /> : <div style={{ width: 58, height: 58, borderRadius: 12, background: `linear-gradient(135deg, hsl(${r.hue} 30% 28%), hsl(${r.hue} 25% 16%))` }} />}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 24, fontWeight: 600, color: "#fff" }}>{i === 1 ? "Aspiradora de mano 30kPa" : "Producto de ejemplo"}</div>
        <div style={{ fontSize: 19, color: C.muted, marginTop: 3 }}>{i === 1 ? "19,90 € · BSR #12 · ~3.000/mes est." : `${r.price} · ${r.bsr}`}</div>
      </div>
      {hl > 0.5 ? <div style={{ fontSize: 19, fontWeight: 700, color: "#9FB3FF", border: "1.5px solid rgba(110,140,255,0.6)", borderRadius: 99, padding: "6px 12px", whiteSpace: "nowrap" }}>↗ Tracción</div> : null}
    </div>
  );
};

export const A4Platforms: React.FC = () => {
  const t = useTime();
  const core = spr(t, 18.55, 7, 0.6);
  const dive = p(t, V.dondeDinero - 0.05, 0.9, E.inOut); // camera follows the links into the core
  const dash = p(t, V.dondeDinero + 0.55, 0.6, E.out);
  const chart = p(t, V.dondeDinero + 0.8, 1.4, E.inOut);
  const rowsIn = [0, 1, 2, 3].map((i) => p(t, 24.5 + i * 0.1, 0.45));
  const hl = p(t, V.ganandoTraccion, 0.5);
  const exit = p(t, 27.5, 0.25, E.in);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <DarkBg glowY={52} glow={1.2} />

      {/* network: platforms → Sniper Drop */}
      <AbsoluteFill style={{ scale: mix(1, 3.2, dive), transformOrigin: `${CX}px ${CY}px`, opacity: 1 - p(t, V.dondeDinero + 0.45, 0.4) }}>
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
          {SOURCES.map((s, i) => {
            const k = p(t, s.at + 0.1, 0.6, E.inOut);
            const c = ctrl(s);
            return (
              <g key={i}>
                <path d={`M ${s.x} ${s.y} Q ${c.x} ${c.y} ${CX} ${CY}`} fill="none" stroke="rgba(91,123,255,0.55)" strokeWidth={3} strokeDasharray="1200" strokeDashoffset={1200 * (1 - k)} />
                {k >= 1
                  ? [0, 1, 2, 3, 4].map((j) => {
                      const u = (t * 0.6 + j / 5 + i * 0.11) % 1;
                      const q = qpt(s, u);
                      return <circle key={j} cx={q.x} cy={q.y} r={j % 2 ? 5 : 8} fill={j % 2 ? "#5B7BFF" : "#B9C6FF"} opacity={Math.sin(u * Math.PI)} />;
                    })
                  : null}
              </g>
            );
          })}
        </svg>
        {/* travelling product cards & mini charts */}
        {SOURCES.map((s, i) => {
          if (t < s.at + 0.7) return null;
          const u = ((t - s.at - 0.7) * 0.5 + i * 0.3) % 1;
          const q = qpt(s, u);
          return (
            <div key={i} style={{ position: "absolute", left: q.x - 34, top: q.y - 34, width: 68, height: 68, borderRadius: 14, background: "#151A27", border: "1px solid rgba(255,255,255,0.18)", opacity: Math.sin(u * Math.PI), scale: mix(1, 0.5, u), display: "flex", alignItems: "center", justifyContent: "center" }}>
              {i % 2 === 0 ? (
                <div style={{ width: 26, height: 32, borderRadius: 7, background: `hsl(${[210, 330, 30, 150][i]} 55% 60%)` }} />
              ) : (
                <svg width={44} height={28}>
                  <polyline points="2,24 12,18 22,20 32,9 42,3" fill="none" stroke="#7B97FF" strokeWidth={3.5} strokeLinecap="round" />
                </svg>
              )}
            </div>
          );
        })}
        {/* constant scanning rings around the core */}
        <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: core }}>
          <g transform={`rotate(${t * 50} ${CX} ${CY})`}>
            <circle cx={CX} cy={CY} r={215} fill="none" stroke="rgba(168,85,247,0.4)" strokeWidth={2} strokeDasharray="36 20" />
          </g>
          <g transform={`rotate(${-t * 35} ${CX} ${CY})`}>
            <circle cx={CX} cy={CY} r={270} fill="none" stroke="rgba(79,123,255,0.25)" strokeWidth={1.5} strokeDasharray="4 12" />
            <path d={`M ${CX} ${CY - 270} A 270 270 0 0 1 ${CX + 270} ${CY}`} fill="none" stroke="#5B7BFF" strokeWidth={4} strokeLinecap="round" />
          </g>
          <circle cx={CX} cy={CY} r={150 + ((t * 120) % 260)} fill="none" stroke={`rgba(123,151,255,${0.5 * (1 - ((t * 120) % 260) / 260)})`} strokeWidth={2} />
        </svg>
        {/* core */}
        <div style={{ position: "absolute", left: CX, top: CY, translate: "-50% -50%", scale: core, opacity: Math.min(1, core * 2) }}>
          <div style={{ width: 300, height: 300, borderRadius: 999, background: "radial-gradient(circle, #13203F 0%, #0A0F1E 70%)", border: "2px solid rgba(168,85,247,0.7)", boxShadow: `0 0 ${80 + Math.sin(t * 5) * 20}px rgba(91,123,255,0.45)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <LogoIcon width={190} />
          </div>
        </div>
        {/* platforms (official logos appear on the word) */}
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
                <PlatformTile platform={s.key} size={220} glow={p(t, s.at + 0.1, 0.3) * (1 - p(t, s.at + 0.8, 0.5))} />
              )}
            </div>
          );
        })}
      </AbsoluteFill>

      {/* central dashboard reached through the connections */}
      <div style={{ position: "absolute", left: 540, top: 1050, translate: "-50% -50%", opacity: dash, scale: mix(0.6, 1, dash) }}>
        <div style={{ width: 920, padding: 30, borderRadius: 34, background: "linear-gradient(180deg, #121521, #0D1018)", border: "1.5px solid rgba(110,140,255,0.35)", boxShadow: "0 50px 100px rgba(0,0,0,0.55)", display: "flex", flexDirection: "column", gap: 18 }}>
          <TrendChart width={810} height={200} progress={chart} title="Demanda del mercado" style={{ background: "rgba(255,255,255,0.02)" }} />
          {[0, 1, 2, 3].map((r, j) => (
            <div key={r} style={{ opacity: rowsIn[j], translate: `${(1 - rowsIn[j]) * 40}px 0` }}>
              <MiniRow i={[2, 1, 4, 0][j]} hl={j === 1 ? hl : 0} />
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <DemoTag label="Productos de ejemplo · datos ilustrativos" style={{ fontSize: 15 }} />
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", fontFamily: INTER, fontWeight: 600, fontSize: 30, letterSpacing: "0.2em", color: "#C8D2F5", opacity: p(t, V.analiza, 0.4) * (1 - p(t, V.dondeDinero - 0.4, 0.3)), marginRight: "-0.2em" }}>
        ANÁLISIS CONSTANTE
      </div>
      <div style={{ position: "absolute", top: 240, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {t > 23.0 ? <RiseText text={"Detecta dónde crece\nla demanda"} at={V.dondeDinero - 0.25} size={74} color="#fff" highlight={["demanda"]} highlightColor={C.blueSoft} /> : null}
      </div>
    </AbsoluteFill>
  );
};

import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, useTime } from "../../animations/clock";
import { DarkBg, DemoTag, Logo, LogoIcon, RiseText } from "../../components/primitives";
import { AppShell, RANKING_ROWS, RankingsContent } from "../../components/ui/DropSniperUI";
import { AdCreative, ProductPhoto, TrendChart } from "../../ad44/components44";
import { Earbuds } from "../../components/product/Products";
import { Bedroom, MONITOR, Serum } from "../components49";
import { C, INTER } from "../../styles/theme";
import { W49 } from "../timeline49";

const MC = { x: MONITOR.x + MONITOR.w / 2, y: MONITOR.y + MONITOR.h / 2 };

const FeedRow: React.FC<{ i: number; isNew: number }> = ({ i, isNew }) => {
  const r = RANKING_ROWS[i % RANKING_ROWS.length];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderRadius: 18, background: isNew ? `rgba(76,104,255,${0.2 * isNew})` : "rgba(255,255,255,0.03)", border: `1.5px solid rgba(110,140,255,${0.1 + 0.6 * isNew})`, fontFamily: INTER }}>
      {i % 4 === 1 ? <ProductPhoto size={64} style={{ boxShadow: "none" }} /> : <div style={{ width: 64, height: 64, borderRadius: 12, background: `linear-gradient(135deg, hsl(${r.hue} 30% 28%), hsl(${r.hue} 25% 16%))` }} />}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 25, fontWeight: 600, color: "#fff" }}>{i % 4 === 1 ? "Aspiradora de mano 30kPa" : "Producto de ejemplo"}</div>
        <div style={{ fontSize: 20, color: C.muted, marginTop: 3 }}>{i % 4 === 1 ? "19,90 € · BSR #12" : `${r.price} · ${r.bsr}`}</div>
      </div>
      {isNew > 0.3 ? <div style={{ fontSize: 19, fontWeight: 700, color: "#9FB3FF", border: "1.5px solid rgba(110,140,255,0.6)", borderRadius: 99, padding: "6px 12px", whiteSpace: "nowrap" }}>Nueva señal</div> : null}
    </div>
  );
};

/** Vertical live view of the analysis that keeps running at night. */
const LiveDashboard: React.FC<{ t: number; dawn: number }> = ({ t, dawn }) => {
  const step = Math.max(0, Math.floor((t - 46.2) / 0.45));
  const frac = Math.max(0, ((t - 46.2) / 0.45) % 1);
  const ease = E.out(Math.min(1, frac * 2.2));
  const hour = 3 + Math.min(3.6, (t - 46.2) * 1.7);
  const hh = Math.floor(hour);
  const mm = Math.floor((hour - hh) * 60);
  return (
    <div style={{ width: 1080, height: 1920, position: "relative", background: `linear-gradient(180deg, ${dawn > 0 ? `color-mix(in srgb, #0A0F1E ${100 - dawn * 60}%, #3A2A3A)` : "#0A0F1E"} 0%, #06080F 100%)`, fontFamily: INTER, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 80% 0%, rgba(255,180,120,${0.28 * dawn}) 0%, transparent 60%)` }} />
      {/* header */}
      <div style={{ position: "absolute", top: 560, left: 70, right: 130, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo width={200} />
        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 26, color: "#C8D2F5", fontWeight: 600 }}>
          <span style={{ width: 14, height: 14, borderRadius: 99, background: "#22C55E", boxShadow: `0 0 ${8 + ((Math.sin(t * 6) + 1) / 2) * 12}px #22C55E` }} />
          Analizando · {String(hh).padStart(2, "0")}:{String(mm).padStart(2, "0")}
        </div>
      </div>
      {/* feed with new signals arriving */}
      <div style={{ position: "absolute", top: 650, left: 70, right: 70, height: 420, overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, translate: `0 ${(-1 + ease) * 108}px` }}>
          {[0, 1, 2, 3].map((j) => (
            <FeedRow key={step - j} i={step - j + 8} isNew={j === 0 ? 1 - Math.min(1, frac * 1.5) * 0.4 : 0} />
          ))}
        </div>
      </div>
      {/* evolving trend */}
      <div style={{ position: "absolute", top: 1100, left: 70 }}>
        <TrendChart width={600} height={150} progress={0.35 + Math.min(0.65, (t - 46.2) * 0.3)} title="Señales" />
      </div>
      {/* ads being compared */}
      <div style={{ position: "absolute", top: 1090, right: 130, display: "flex", gap: 10 }}>
        {[0, 1].map((j) => (
          <AdCreative key={j} width={118} hook={j ? "Versión B" : "Versión A"} hue={j ? 330 : 225} highlight={Math.floor(t * 1.5) % 2 === j ? 1 : 0} product={<div style={{ scale: 0.4 }}>{j ? <Serum size={240} /> : <Earbuds size={200} lid={1} />}</div>} platform={j ? "Meta" : "TikTok"} />
        ))}
      </div>
      <div style={{ position: "absolute", top: 1440, left: 70 }}>
        <DemoTag label="Actividad ilustrativa" />
      </div>
    </div>
  );
};

export const B11Sleep: React.FC = () => {
  const t = useTime();
  const enter = p(t, 44.3, 0.3, E.out);
  const dolly = p(t, 45.25, 1.05, E.inOut);
  const inside = p(t, 46.05, 0.4, E.inOut);
  const dawn = p(t, 46.3, 2.0, E.inOut);
  const close = p(t, 48.2, 0.45, E.inOut);
  const logo = p(t, 48.35, 0.4, E.out);
  const tag = p(t, 48.6, 0.35, E.out);

  const sc = mix(1, 1080 / MONITOR.w, dolly);
  const tx = mix(0, 540 - MC.x, dolly);
  const ty = mix(0, 960 - MC.y, dolly);

  return (
    <AbsoluteFill style={{ opacity: enter }}>
      <DarkBg />
      {/* bedroom at night, camera dollies into the monitor */}
      <AbsoluteFill style={{ opacity: 1 - inside }}>
        <div style={{ position: "absolute", inset: 0, transformOrigin: `${MC.x}px ${MC.y}px`, transform: `translate(${tx}px, ${ty}px) scale(${sc})` }}>
          <Bedroom
            dawn={dawn * 0.5}
            t={t}
            screen={
              <div style={{ width: 1440, height: 900, transform: `scale(${(MONITOR.w - 20) / 1440})`, transformOrigin: "0 0" }}>
                <AppShell active="Inicio" height={900} style={{ borderRadius: 0, border: "none" }}>
                  <RankingsContent highlightRow={Math.floor(t * 1.5) % 6} highlight={1} />
                </AppShell>
              </div>
            }
          />
        </div>
      </AbsoluteFill>

      {/* inside the screen: Sniper Drop keeps working until dawn */}
      <AbsoluteFill style={{ opacity: inside * (1 - close), scale: mix(1.08, 1, inside) * mix(1, 0.6, close) }}>
        <LiveDashboard t={t} dawn={dawn} />
      </AbsoluteFill>

      {/* copy synced to the voice */}
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 1 - close }}>
        <RiseText text="Mientras tú duermes…" at={W49.duermes - 0.05} size={74} color="#fff" />
        <RiseText text="Sniper Drop sigue analizando." at={W49.sigueAnalizando} size={56} color={C.blueSoft} />
      </div>

      {/* brand close in the last frames */}
      <AbsoluteFill style={{ opacity: close, alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "absolute", left: 540, top: 840, translate: "-50% -50%", scale: mix(0.85, 1, logo), opacity: logo }}>
          <Logo width={820} />
        </div>
        <div style={{ position: "absolute", left: 540, top: 840, translate: "-50% -50%", opacity: 1 - logo }}>
          <LogoIcon width={160} />
        </div>
        <div style={{ position: "absolute", top: 1060, left: 0, right: 0, textAlign: "center", fontFamily: "Sora", fontWeight: 700, fontSize: 60, color: "#fff", opacity: tag, translate: `0 ${(1 - tag) * 20}px` }}>
          Detecta oportunidades
          <br />
          <span style={{ color: C.blueSoft }}>con datos.</span>
        </div>
        <div style={{ position: "absolute", top: 1290, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: tag }}>
          <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 40, color: "#fff", padding: "18px 40px", borderRadius: 99, border: "1.5px solid rgba(110,140,255,0.6)", background: "rgba(79,123,255,0.14)" }}>www.sniperdrop.com</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

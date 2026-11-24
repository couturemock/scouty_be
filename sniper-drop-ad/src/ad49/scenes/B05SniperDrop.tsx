import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, spr, tw, useTime } from "../../animations/clock";
import { DarkBg, LogoIcon, LogoWordmark, RiseText } from "../../components/primitives";
import { Float25D } from "../../components/Camera";
import { AnalysisContent, AppShell, RankingsContent } from "../../components/ui/DropSniperUI";
import { Browser, LandingHero, Laptop, ProductPhoto, TrendChart } from "../../ad44/components44";
import { C, INTER } from "../../styles/theme";
import { W49 } from "../timeline49";

const SCREEN_W = 800;
const BEZEL = SCREEN_W * 0.022;
const LEFT = (1080 - (SCREEN_W + BEZEL * 2)) / 2;
const TOP = 760;
const K = SCREEN_W / 1440;
// focus on the rankings list (native ~ 800, 520 incl. browser-less app)
const FOCUS = { x: LEFT + BEZEL + 800 * K, y: TOP + BEZEL * 1.2 + 470 * K };

const LOGO_W = 760;
const s = LOGO_W / 1264;

export const B05SniperDrop: React.FC = () => {
  const t = useTime();
  const rise = p(t, 18.8, 0.45, E.out);
  const typed = tw(t, [18.95, 19.3], [0, 1], (x) => x);
  const enter = 19.33;
  const loading = tw(t, [enter, enter + 0.2], [0, 1], E.inOut);
  const hero = p(t, enter + 0.15, 0.5, E.out);
  const toApp = t > 20.05;
  const zoom = p(t, 20.15, 0.8, E.inOut);
  const rowsIn = [0, 1, 2, 3, 4, 5].map((i) => p(t, 20.3 + i * 0.08, 0.35));
  const hl = p(t, W49.funcionando - 0.1, 0.35);
  const lift = spr(t, 22.3, 8, 0.6);
  const chart = p(t, W49.despegar - 0.3, 0.9, E.inOut);
  const sheet = t > 23.35;
  const iconIn = p(t, W49.sniperDrop, 0.5, E.out);
  const wordIn = p(t, W49.sniperDrop + 0.15, 0.45, E.inOut);
  const logoOut = p(t, 19.95, 0.3, E.in);
  const exit = p(t, 23.75, 0.3, E.in);

  const sc = mix(1, 1.95, zoom);
  const tx = mix(0, 540 - FOCUS.x, zoom);
  const ty = mix(0, 900 - FOCUS.y, zoom);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <DarkBg glowY={55} glow={1.1} />

      <AbsoluteFill style={{ perspective: 2200, opacity: 1 - lift * 0.55, filter: `blur(${lift * 4}px)` }}>
        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: TOP + (1 - rise) * 600,
            transformOrigin: `${FOCUS.x - LEFT}px ${FOCUS.y - TOP}px`,
            transform: `translate(${tx}px, ${ty}px) scale(${sc}) rotateX(${mix(24, 5, rise) * (1 - zoom)}deg)`,
            opacity: Math.min(1, rise * 2),
          }}
        >
          <Laptop width={SCREEN_W} deck={1 - zoom}>
            {toApp ? (
              <AppShell active={sheet ? "Analizar producto" : "Inicio"} height={900} style={{ borderRadius: 0, border: "none" }}>
                {sheet ? <AnalysisContent /> : <RankingsContent rowsIn={rowsIn} highlightRow={2} highlight={hl} />}
              </AppShell>
            ) : (
              <Browser url="www.sniperdrop.com" typed={typed} caret={t < enter + 0.05} loading={loading}>
                {t > enter + 0.1 ? <LandingHero reveal={hero} /> : <div style={{ width: "100%", height: "100%", background: "#0B0C10" }} />}
              </Browser>
            )}
          </Laptop>
        </div>
      </AbsoluteFill>

      {/* official logo reveal above the computer */}
      <div style={{ position: "absolute", left: 540 - LOGO_W / 2, top: 330, width: LOGO_W, height: 406 * s, opacity: 1 - logoOut, scale: mix(1, 0.8, logoOut) }}>
        <div style={{ position: "absolute", left: 0, top: 0, clipPath: `circle(${iconIn * 75}% at 57% 48%)`, scale: mix(1.25, 1, iconIn), rotate: `${mix(-25, 0, iconIn)}deg` }}>
          <LogoIcon width={425 * s} />
        </div>
        <div style={{ position: "absolute", left: 428 * s, top: 75 * s, clipPath: `inset(-10% ${(1 - wordIn) * 100}% -10% 0)` }}>
          <LogoWordmark width={836 * s} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 600, left: 0, right: 0, textAlign: "center", fontFamily: INTER, fontWeight: 600, fontSize: 30, letterSpacing: "0.28em", color: C.blueSoft, opacity: p(t, 19.6, 0.3) * (1 - logoOut), marginRight: "-0.28em" }}>
        WWW.SNIPERDROP.COM
      </div>

      {/* emerging product lifted off the dashboard + its trend */}
      <Float25D x={540} y={mix(1150, 1080, lift)} scale={mix(0.8, 1, lift)} rotX={mix(18, 4, lift)} lift={lift} opacity={Math.min(1, lift * 2)}>
        <div style={{ width: 880, display: "flex", gap: 26, alignItems: "center", padding: 26, borderRadius: 30, background: "#121520", border: "2px solid rgba(110,140,255,0.6)", boxShadow: "0 0 60px rgba(91,123,255,0.35)", fontFamily: INTER }}>
          <ProductPhoto size={180} style={{ boxShadow: "none" }} />
          <div>
            <div style={{ fontSize: 22, letterSpacing: "0.14em", color: "#9FB3FF", fontWeight: 700 }}>PRODUCTO EMERGENTE</div>
            <div style={{ fontSize: 34, color: "#fff", fontWeight: 600, marginTop: 8, lineHeight: 1.15 }}>Piarhlie Aspiradora de Mano 30kPa</div>
            <div style={{ fontSize: 26, color: C.muted, marginTop: 10 }}>
              <b style={{ color: "#fff" }}>19,90 €</b> · BSR <b style={{ color: "#fff" }}>#12</b> · <b style={{ color: "#fff" }}>~3.000</b>/mes est.
            </div>
          </div>
        </div>
      </Float25D>
      <div style={{ position: "absolute", left: 540, top: 1310, translate: "-50% 0", opacity: chart, scale: 0.92 + chart * 0.08 }}>
        <TrendChart width={800} height={170} progress={chart} title="Evolución de la tracción" />
      </div>

      <div style={{ position: "absolute", top: 240, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {t > 20.7 ? <RiseText text={"Productos\nemergentes"} at={W49.productos - 0.25} size={86} color="#fff" highlight={["emergentes"]} highlightColor={C.blueSoft} /> : null}
      </div>
    </AbsoluteFill>
  );
};

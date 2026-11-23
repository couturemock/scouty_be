import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, tw, useTime } from "../../animations/clock";
import { DarkBg, LogoIcon, LogoWordmark } from "../../components/primitives";
import { Browser, LandingHero, Laptop } from "../components44";
import { C, INTER } from "../../styles/theme";

const SCREEN_W = 800;
const BEZEL = SCREEN_W * 0.022;
const LAPTOP_W = SCREEN_W + BEZEL * 2;
const LEFT = (1080 - LAPTOP_W) / 2;
const TOP = 640;
// headline centre on screen (native 720,389 scaled into the screen)
const FOCUS = { x: LEFT + BEZEL + 720 * (SCREEN_W / 1440), y: TOP + BEZEL * 1.2 + 389 * (SCREEN_W / 1440) };

const LOGO_W = 840;
const s = LOGO_W / 1264;

export const A2Laptop: React.FC = () => {
  const t = useTime();
  const rise = p(t, 4.75, 0.7, E.out);
  const typed = tw(t, [4.95, 5.5], [0, 1], (x) => x);
  const enter = 5.55;
  const loading = tw(t, [enter, enter + 0.35], [0, 1], E.inOut);
  const hero = p(t, enter + 0.3, 0.8, E.out);
  const zoom = p(t, 6.35, 1.0, E.inOut);
  const logoT = 7.25;
  const iconIn = p(t, logoT, 0.7, E.out);
  const wordIn = p(t, logoT + 0.25, 0.6, E.inOut);
  const dim = p(t, logoT - 0.15, 0.5);
  const exit = p(t, 8.6, 0.3, E.in);

  const sc = mix(1, 2.4, zoom);
  const ty = mix(0, 960 - FOCUS.y, zoom);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <DarkBg glowY={50} glow={1} />

      {/* laptop with browser → sniperdrop.com */}
      <AbsoluteFill style={{ perspective: 2200, filter: `blur(${dim * 10}px)`, opacity: 1 - dim * 0.85 }}>
        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: TOP + (1 - rise) * 500,
            transformOrigin: `${FOCUS.x - LEFT}px ${FOCUS.y - TOP}px`,
            transform: `translateY(${ty}px) scale(${sc}) rotateX(${mix(28, 6, rise) * (1 - zoom)}deg)`,
            opacity: Math.min(1, rise * 2),
          }}
        >
          <Laptop width={SCREEN_W} deck={1 - zoom}>
            <Browser url="www.sniperdrop.com" typed={typed} caret={t < enter + 0.1} loading={loading}>
              {t > enter + 0.2 ? <LandingHero reveal={hero} /> : <div style={{ width: "100%", height: "100%", background: "#0B0C10" }} />}
            </Browser>
          </Laptop>
        </div>
      </AbsoluteFill>

      {/* "Enter" key hint */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1420, display: "flex", justifyContent: "center", opacity: tw(t, [5.0, 5.2]) * (1 - p(t, 5.9, 0.3)) }}>
        <div style={{ fontFamily: INTER, fontSize: 30, color: C.muted, display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ border: "2px solid rgba(255,255,255,0.25)", borderRadius: 10, padding: "6px 14px", color: "#fff", background: t > enter && t < enter + 0.2 ? "rgba(91,123,255,0.5)" : "transparent" }}>↵ Enter</span>
        </div>
      </div>

      {/* official logo reveal */}
      <div style={{ position: "absolute", left: 540 - LOGO_W / 2, top: 960 - (406 * s) / 2, width: LOGO_W, height: 406 * s, opacity: dim }}>
        <div style={{ position: "absolute", left: 0, top: 0, clipPath: `circle(${iconIn * 75}% at 57% 48%)`, scale: mix(1.2, 1, iconIn), rotate: `${mix(-20, 0, iconIn)}deg` }}>
          <LogoIcon width={425 * s} />
        </div>
        <div style={{ position: "absolute", left: 428 * s, top: 75 * s, clipPath: `inset(-10% ${(1 - wordIn) * 100}% -10% 0)`, translate: `${(1 - wordIn) * -40}px 0` }}>
          <LogoWordmark width={836 * s} />
        </div>
      </div>
      <div style={{ position: "absolute", top: 1200, left: 0, right: 0, textAlign: "center", fontFamily: INTER, fontWeight: 600, fontSize: 34, letterSpacing: "0.3em", color: C.blueSoft, opacity: p(t, logoT + 0.6, 0.5), marginRight: "-0.3em" }}>
        WWW.SNIPERDROP.COM
      </div>
    </AbsoluteFill>
  );
};

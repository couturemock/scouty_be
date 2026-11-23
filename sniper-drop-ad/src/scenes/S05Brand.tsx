import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, spr, tw, useTime } from "../animations/clock";
import { DarkBg, LogoIcon, LogoWordmark } from "../components/primitives";
import { Float25D } from "../components/Camera";
import { AdCard, ADS, RANKING_ROWS, RankRow, StatsStrip } from "../components/ui/DropSniperUI";
import { C, INTER } from "../styles/theme";
import { VO } from "../timeline";

/**
 * Official logo reveal. The logo is shown exactly as supplied; it is only
 * split into its two original layers (icon / wordmark) to animate them.
 */
const LOGO_W = 860;
const s = LOGO_W / 1264;

export const S05Brand: React.FC = () => {
  const t = useTime();
  const rings = p(t, 44.9, 0.9, E.out);
  const iconIn = p(t, VO.enter - 0.05, 0.8, E.out);
  const wordIn = p(t, VO.enter + 0.3, 0.7, E.inOut);
  const sweep = tw(t, [VO.enter + 0.5, VO.enter + 1.3], [-0.3, 1.3], E.inOut);
  const sub = p(t, VO.enter + 0.75, 0.6);
  const up = p(t, VO.sniperFinds - 0.05, 0.75, E.inOut);
  const frag = (d: number) => spr(t, VO.sniperFinds + d, 8, 0.6);
  const exit = p(t, 47.35, 0.35, E.in);

  const logoY = mix(860, 470, up);
  const logoScale = mix(1, 0.72, up);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <DarkBg glowY={45} glow={0.6 + rings * 0.6} />

      {/* crosshair construction lines */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 1 - up * 0.7 }}>
        <circle cx={540} cy={logoY + 30} r={mix(10, 470, rings)} fill="none" stroke="rgba(79,123,255,0.35)" strokeWidth={2} />
        <circle cx={540} cy={logoY + 30} r={mix(10, 360, rings)} fill="none" stroke="rgba(79,123,255,0.18)" strokeWidth={1.5} strokeDasharray="6 10" />
        <line x1={540} x2={540} y1={logoY + 30 - 560 * rings} y2={logoY + 30 + 560 * rings} stroke="rgba(79,123,255,0.25)" strokeWidth={1.5} />
        <line x1={540 - 560 * rings} x2={540 + 560 * rings} y1={logoY + 30} y2={logoY + 30} stroke="rgba(79,123,255,0.25)" strokeWidth={1.5} />
      </svg>

      {/* logo */}
      <div
        style={{
          position: "absolute",
          left: 540 - LOGO_W / 2,
          top: logoY - (406 * s) / 2,
          width: LOGO_W,
          height: 406 * s,
          scale: logoScale,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            clipPath: `circle(${iconIn * 75}% at 57% 48%)`,
            scale: mix(1.25, 1, iconIn),
            rotate: `${mix(-25, 0, iconIn)}deg`,
            filter: `drop-shadow(0 0 ${30 * (1 - iconIn) + 10}px rgba(79,123,255,0.5))`,
          }}
        >
          <LogoIcon width={425 * s} />
        </div>
        <div
          style={{
            position: "absolute",
            left: 428 * s,
            top: 75 * s,
            clipPath: `inset(-10% ${(1 - wordIn) * 100}% -10% 0)`,
            translate: `${(1 - wordIn) * -40}px 0`,
          }}
        >
          <LogoWordmark width={836 * s} />
          {/* light sweep */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(100deg, transparent ${sweep * 100 - 12}%, rgba(255,255,255,0.55) ${sweep * 100}%, transparent ${sweep * 100 + 12}%)`,
              mixBlendMode: "overlay",
            }}
          />
        </div>
      </div>

      {/* subtitle */}
      <div
        style={{
          position: "absolute",
          top: logoY + 210 * logoScale,
          left: 0,
          right: 0,
          textAlign: "center",
          fontFamily: INTER,
          fontWeight: 600,
          fontSize: 36,
          letterSpacing: `${mix(0.6, 0.32, sub)}em`,
          color: C.blueSoft,
          opacity: sub,
          marginRight: "-0.32em",
        }}
      >
        INTELIGENCIA DE PRODUCTOS
      </div>

      {/* real interface components orbit in around the logo */}
      <Float25D x={mix(1300, 560, frag(0))} y={1010} scale={1.7} rotY={-18} rotX={8} opacity={Math.min(1, frag(0) * 2)}>
        <div style={{ width: 520, borderRadius: 14, overflow: "hidden", background: "#111319", border: "1px solid rgba(255,255,255,0.1)", fontFamily: INTER, color: "#ECEEF2" }}>
          <RankRow i={2} row={RANKING_ROWS[2]} />
        </div>
      </Float25D>
      <Float25D x={mix(-500, 520, frag(0.12))} y={1240} scale={1.25} rotY={16} rotX={6} opacity={Math.min(1, frag(0.12) * 2)}>
        <div style={{ width: 760, fontFamily: INTER, color: "#ECEEF2" }}>
          <StatsStrip />
        </div>
      </Float25D>
      <Float25D x={mix(1400, 560, frag(0.24))} y={1500} scale={1.45} rotY={-14} rotX={10} opacity={Math.min(1, frag(0.24) * 2)}>
        <div style={{ width: 600, fontFamily: INTER, color: "#ECEEF2" }}>
          <AdCard ad={ADS[0]} />
        </div>
      </Float25D>
    </AbsoluteFill>
  );
};

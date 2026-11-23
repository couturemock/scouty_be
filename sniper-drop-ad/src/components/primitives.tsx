import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { C, INTER, SORA } from "../styles/theme";
import { E, p, tw, useTime } from "../animations/clock";

// ---------------------------------------------------------------------------
// Backgrounds
// ---------------------------------------------------------------------------

/** Light "photo studio" world used for the business-model explanation. */
export const StudioBg: React.FC<{ spotX?: number; spotY?: number; tint?: number }> = ({
  spotX = 50,
  spotY = 42,
  tint = 0,
}) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(ellipse 85% 55% at ${spotX}% ${spotY}%, #FFFFFF 0%, ${C.studio} 55%, ${C.studio2} 100%)`,
    }}
  >
    <AbsoluteFill
      style={{
        backgroundImage:
          "linear-gradient(rgba(13,19,36,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(13,19,36,0.045) 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        maskImage: "radial-gradient(ellipse 70% 60% at 50% 45%, black 0%, transparent 85%)",
      }}
    />
    {tint > 0 ? <AbsoluteFill style={{ background: C.ink, opacity: tint }} /> : null}
  </AbsoluteFill>
);

/** Dark Drop Sniper world. */
export const DarkBg: React.FC<{ glowX?: number; glowY?: number; glow?: number; grid?: number }> = ({
  glowX = 50,
  glowY = 40,
  glow = 1,
  grid = 1,
}) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, ${C.navy} 0%, ${C.ink} 100%)` }}>
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 70% 45% at ${glowX}% ${glowY}%, rgba(58,99,216,${0.32 * glow}) 0%, rgba(58,99,216,0) 70%)`,
      }}
    />
    <AbsoluteFill
      style={{
        opacity: grid,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 45%, black 10%, transparent 90%)",
      }}
    />
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

/**
 * Word-by-word masked rise. `at` = absolute second when the first word starts.
 */
export const RiseText: React.FC<{
  text: string;
  at: number;
  size?: number;
  color?: string;
  weight?: number;
  stagger?: number;
  font?: string;
  tracking?: number;
  align?: "left" | "center" | "right";
  lineHeight?: number;
  out?: number; // absolute second when the text leaves
  style?: React.CSSProperties;
  highlight?: string[]; // words drawn in brand blue
  highlightColor?: string;
}> = ({
  text,
  at,
  size = 84,
  color = C.studioInk,
  weight = 700,
  stagger = 0.06,
  font = SORA,
  tracking = -0.02,
  align = "center",
  lineHeight = 1.05,
  out,
  style,
  highlight = [],
  highlightColor = C.blue,
}) => {
  const t = useTime();
  const lines = text.split("\n");
  let idx = 0;
  const leave = out !== undefined ? p(t, out, 0.35, E.in) : 0;
  return (
    <div
      style={{
        fontFamily: font,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: `${tracking}em`,
        lineHeight,
        textAlign: align,
        color,
        ...style,
      }}
    >
      {lines.map((line, li) => (
        <div key={li} style={{ display: "block", whiteSpace: "nowrap" }}>
          {line.split(" ").map((w, wi) => {
            const k = p(t, at + idx++ * stagger, 0.7, E.out);
            const clean = w.replace(/[.,:¿?¡!]/g, "");
            const hl = highlight.includes(clean);
            return (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  overflow: "hidden",
                  verticalAlign: "top",
                  paddingBottom: "0.22em",
                  marginBottom: "-0.22em",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    translate: `0 ${(1 - k) * 130 + leave * -130}%`,
                    color: hl ? highlightColor : undefined,
                    opacity: Math.min(1, k * 3) * (1 - leave),
                  }}
                >
                  {w}
                  {wi < line.split(" ").length - 1 ? " " : ""}
                </span>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Small uppercase eyebrow label with a dot, like the real UI's "• ANUNCIOS". */
export const Eyebrow: React.FC<{
  children: React.ReactNode;
  color?: string;
  size?: number;
  dot?: boolean;
  style?: React.CSSProperties;
}> = ({ children, color = C.blueBright, size = 26, dot = true, style }) => (
  <div
    style={{
      fontFamily: INTER,
      fontSize: size,
      fontWeight: 600,
      letterSpacing: "0.16em",
      textTransform: "uppercase",
      color,
      display: "flex",
      alignItems: "center",
      gap: size * 0.5,
      ...style,
    }}
  >
    {dot ? (
      <span
        style={{
          width: size * 0.32,
          height: size * 0.32,
          borderRadius: 99,
          background: color,
          boxShadow: `0 0 ${size * 0.6}px ${color}`,
        }}
      />
    ) : null}
    {children}
  </div>
);

/** Pill-shaped tag (light or dark variant). */
export const Pill: React.FC<{
  children: React.ReactNode;
  dark?: boolean;
  size?: number;
  color?: string;
  bg?: string;
  border?: string;
  style?: React.CSSProperties;
}> = ({ children, dark, size = 28, color, bg, border, style }) => (
  <div
    style={{
      fontFamily: INTER,
      fontSize: size,
      fontWeight: 600,
      padding: `${size * 0.45}px ${size * 0.85}px`,
      borderRadius: 999,
      color: color ?? (dark ? C.text : C.studioInk),
      background: bg ?? (dark ? "rgba(255,255,255,0.06)" : "#FFFFFF"),
      border: `1.5px solid ${border ?? (dark ? C.line2 : "rgba(13,19,36,0.08)")}`,
      boxShadow: dark ? "none" : "0 10px 30px rgba(13,19,36,0.10)",
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.4,
      ...style,
    }}
  >
    {children}
  </div>
);

/** "Datos ilustrativos" disclaimer tag. */
export const DemoTag: React.FC<{ label?: string; dark?: boolean; style?: React.CSSProperties }> = ({
  label = "Datos ilustrativos",
  dark = true,
  style,
}) => (
  <div
    style={{
      fontFamily: INTER,
      fontSize: 20,
      fontWeight: 600,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: dark ? "rgba(255,255,255,0.55)" : "rgba(13,19,36,0.5)",
      border: `1px dashed ${dark ? "rgba(255,255,255,0.3)" : "rgba(13,19,36,0.3)"}`,
      borderRadius: 8,
      padding: "6px 12px",
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {label}
  </div>
);

// ---------------------------------------------------------------------------
// Brand
// ---------------------------------------------------------------------------

/** Official logo, untouched. Aspect ratio 1264:406. */
export const Logo: React.FC<{ width: number; style?: React.CSSProperties }> = ({ width, style }) => (
  <Img
    src={staticFile("brand/logo.png")}
    style={{ width, height: (width * 406) / 1264, objectFit: "contain", ...style }}
  />
);

/** Icon part (D + crosshair) of the official logo. Aspect 425:406. */
export const LogoIcon: React.FC<{ width: number; style?: React.CSSProperties }> = ({ width, style }) => (
  <Img
    src={staticFile("brand/logo-icon.png")}
    style={{ width, height: (width * 406) / 425, objectFit: "contain", ...style }}
  />
);

/** Wordmark part (DROP / SNIPER) of the official logo. Aspect 836:265. */
export const LogoWordmark: React.FC<{ width: number; style?: React.CSSProperties }> = ({
  width,
  style,
}) => (
  <Img
    src={staticFile("brand/logo-wordmark.png")}
    style={{ width, height: (width * 265) / 836, objectFit: "contain", ...style }}
  />
);

// ---------------------------------------------------------------------------
// Cursor
// ---------------------------------------------------------------------------

export const Cursor: React.FC<{ x: number; y: number; clickAt?: number; scale?: number; opacity?: number }> = ({
  x,
  y,
  clickAt,
  scale = 1,
  opacity = 1,
}) => {
  const t = useTime();
  const press = clickAt !== undefined ? tw(t, [clickAt, clickAt + 0.08], [0, 1]) - tw(t, [clickAt + 0.1, clickAt + 0.25], [0, 1]) : 0;
  const ring = clickAt !== undefined ? p(t, clickAt, 0.6, E.out) : 0;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity, zIndex: 50 }}>
      {clickAt !== undefined && t > clickAt ? (
        <div
          style={{
            position: "absolute",
            left: -40 * scale,
            top: -40 * scale,
            width: 80 * scale,
            height: 80 * scale,
            borderRadius: 999,
            border: `4px solid ${C.blueBright}`,
            scale: 0.3 + ring * 1.2,
            opacity: 1 - ring,
          }}
        />
      ) : null}
      <svg
        width={44 * scale}
        height={52 * scale}
        viewBox="0 0 44 52"
        style={{ scale: 1 - press * 0.15, transformOrigin: "0 0", filter: "drop-shadow(0 6px 10px rgba(0,0,0,0.35))" }}
      >
        <path d="M3 2 L3 40 L13 31 L20 48 L27 45 L20 29 L34 29 Z" fill="#0D1324" stroke="#FFFFFF" strokeWidth="3" strokeLinejoin="round" />
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Connector line drawn progressively (SVG)
// ---------------------------------------------------------------------------

export const DrawPath: React.FC<{
  d: string;
  progress: number;
  color?: string;
  width?: number;
  length?: number;
  dash?: boolean;
  glow?: boolean;
}> = ({ d, progress, color = C.blueBright, width = 3, length = 2000, dash, glow }) => (
  <path
    d={d}
    fill="none"
    stroke={color}
    strokeWidth={width}
    strokeLinecap="round"
    strokeDasharray={dash ? "10 14" : `${length} ${length}`}
    strokeDashoffset={dash ? undefined : length * (1 - progress)}
    opacity={dash ? progress : 1}
    style={glow ? { filter: `drop-shadow(0 0 8px ${color})` } : undefined}
  />
);

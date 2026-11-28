import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile } from "remotion";
import { E, mix, p, useTime } from "../animations/clock";
import { INTER, SORA } from "../styles/theme";
import { FPS, WORDS } from "./timelineR";

// ---------------------------------------------------------------------------
// Real footage from the client's iPhone recordings (portrait 1080×1920)
// ---------------------------------------------------------------------------
export const CLIPS = {
  ficha: "clips/IMG_0312.mp4", // product sheet (Piarhlie vacuum)
  rankings: "clips/IMG_0313.mp4", // best sellers + country tabs
  anunciosShowcase: "clips/IMG_0314.mp4", // "Cómo se anuncia en TikTok y Meta" (showcase)
  proveedores: "clips/IMG_0315.mp4", // suppliers
  anunciosApp: "clips/IMG_0319.mp4", // ads page in the live app
  analizar: "clips/IMG_0320.mp4", // "Analizar producto" in the live app
} as const;

/**
 * A real clip with a camera move. `from`/`to` are absolute audio seconds of
 * the shot, `clipStart` the second of the source clip shown at `from`.
 * `focus` is the point of the 1080×1920 clip that the camera pushes towards.
 */
export const ClipShot: React.FC<{
  src: string;
  clipStart?: number;
  from: number;
  zoom?: [number, number];
  focus?: { x: number; y: number };
  ease?: (n: number) => number;
  dur?: number;
  grade?: string;
  style?: React.CSSProperties;
}> = ({ src, clipStart = 0, from, zoom = [1, 1.15], focus = { x: 540, y: 900 }, ease = E.inOut, dur = 1.5, grade, style }) => {
  const t = useTime();
  const k = p(t, from, dur, ease);
  const s = mix(zoom[0], zoom[1], k);
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: "#05040C", ...style }}>
      <AbsoluteFill style={{ transformOrigin: `${focus.x}px ${focus.y}px`, scale: s, translate: `${(540 - focus.x) * (s - 1) / s * 0.6}px ${(960 - focus.y) * (s - 1) / s * 0.6}px`, filter: grade }}>
        <OffthreadVideo src={staticFile(src)} startFrom={Math.round(clipStart * FPS)} muted style={{ width: 1080, height: 1920 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Still frame of the laptop on the client's desk (for the day/night cut). */
export const DeskStill: React.FC<{ night: number; style?: React.CSSProperties }> = ({ night, style }) => (
  <AbsoluteFill style={style}>
    <AbsoluteFill style={{ opacity: 1 - night }}>
      <Img src={staticFile("ruleta/escritorio-dia.jpg")} style={{ width: 1080, height: 1920 }} />
    </AbsoluteFill>
    <AbsoluteFill style={{ opacity: night }}>
      <Img src={staticFile("ruleta/escritorio-noche.jpg")} style={{ width: 1080, height: 1920 }} />
    </AbsoluteFill>
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------
// Bold white accent words (reference style)
// ---------------------------------------------------------------------------
export const Accent: React.FC<{ text: string; at: number; out?: number; y?: number; size?: number; color?: string }> = ({ text, at, out, y = 300, size = 104, color = "#fff" }) => {
  const t = useTime();
  const k = p(t, at - 0.04, 0.18, E.out);
  const o = out !== undefined ? 1 - p(t, out - 0.12, 0.12) : 1;
  if (k <= 0 || o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: y, textAlign: "center", fontFamily: SORA, fontWeight: 800, fontSize: size, lineHeight: 1.0, letterSpacing: "-0.02em", color, textTransform: "uppercase", opacity: o, scale: mix(1.25, 1, k), textShadow: "0 6px 30px rgba(0,0,0,0.65), 0 2px 6px rgba(0,0,0,0.6)", whiteSpace: "pre-line" }}>
      {text}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Word-synced subtitles (short groups, white, heavy)
// ---------------------------------------------------------------------------
type Group = { s: number; e: number; text: string };
const GROUPS: Group[] = (() => {
  const out: Group[] = [];
  let cur: typeof WORDS = [];
  const flush = () => {
    if (!cur.length) return;
    out.push({ s: cur[0].s, e: cur[cur.length - 1].e, text: cur.map((w) => w.w).join(" ") });
    cur = [];
  };
  WORDS.forEach((w, i) => {
    cur.push(w);
    const len = cur.map((x) => x.w).join(" ").length;
    const punct = /[.,?!:]$/.test(w.w);
    const next = WORDS[i + 1];
    const gap = next ? next.s - w.e : 1;
    if (punct || len >= 16 || cur.length >= 4 || gap > 0.25) flush();
  });
  flush();
  // keep each group on screen until the next one starts
  return out.map((g, i) => ({ ...g, e: out[i + 1] ? Math.min(out[i + 1].s, g.e + 0.6) : g.e + 0.4 }));
})();

const clean = (s: string) => s.replace("SniperDrop", "Sniper Drop").replace("MetaAds", "Meta Ads").replace("-7", "/7");

export const Captions: React.FC<{ y: (t: number) => number }> = ({ y }) => {
  const t = useTime();
  const g = GROUPS.find((x) => t >= x.s - 0.05 && t < x.e);
  if (!g || t > 42.36) return null; // clean black end card with the logo
  const k = p(t, g.s - 0.05, 0.12, E.out);
  return (
    <div style={{ position: "absolute", left: 70, right: 70, top: y(t), textAlign: "center", fontFamily: INTER, fontWeight: 800, fontSize: 60, lineHeight: 1.1, color: "#fff", textShadow: "0 0 18px rgba(0,0,0,0.75), 0 3px 6px rgba(0,0,0,0.9)", scale: mix(0.92, 1, k), opacity: k }}>
      {clean(g.text)}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Natural-light table (product scenes) and product photo set on it
// ---------------------------------------------------------------------------
export const Table: React.FC<{ light?: number; children?: React.ReactNode }> = ({ light = 1, children }) => (
  <AbsoluteFill style={{ background: "linear-gradient(180deg, #E9DCC8 0%, #D9C2A0 40%, #C7A47A 100%)" }}>
    {/* wood grain */}
    <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(92deg, rgba(120,80,40,0.05) 0px, rgba(120,80,40,0.05) 2px, transparent 2px, transparent 19px), repeating-linear-gradient(91deg, rgba(255,255,255,0.05) 0px, transparent 3px, transparent 41px)" }} />
    {/* window light falling on the table */}
    <AbsoluteFill style={{ background: "linear-gradient(115deg, transparent 0%, rgba(255,246,225,0.55) 28%, rgba(255,246,225,0.15) 42%, transparent 55%, rgba(255,246,225,0.4) 70%, transparent 82%)", opacity: light, mixBlendMode: "screen" }} />
    {children}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 70% at 50% 45%, transparent 55%, rgba(40,25,10,0.45) 100%)" }} />
  </AbsoluteFill>
);

export const Photo: React.FC<{ src: string; width: number; style?: React.CSSProperties; shadow?: boolean }> = ({ src, width, style, shadow = true }) => (
  <div style={{ position: "relative", width, ...style }}>
    {shadow ? <div style={{ position: "absolute", left: "8%", right: "8%", bottom: -12, height: 40, borderRadius: "50%", background: "rgba(60,35,10,0.45)", filter: "blur(14px)" }} /> : null}
    <Img src={staticFile(src)} style={{ width: "100%", display: "block" }} />
  </div>
);

/**
 * The vacuum ad creative (recreation). `action` = product already working on
 * the first frame (shake, dust being pulled in). Otherwise it just sits there.
 */
export const VacuumAd: React.FC<{ action: boolean; t: number; width?: number; height?: number; ui?: boolean }> = ({ action, t, width = 1080, height = 1920, ui = true }) => {
  const s = width / 1080;
  const shake = action ? Math.sin(t * 70) * 3 : 0;
  return (
    <div style={{ width, height, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 1920, transformOrigin: "0 0", transform: `scale(${s})` }}>
        <Table light={action ? 1 : 0.6}>
          {/* crumbs on the table, pulled towards the nozzle when it is on */}
          {new Array(26).fill(0).map((_, i) => {
            const bx = 60 + ((i * 97) % 380);
            const by = 1060 + ((i * 53) % 260);
            const k = action ? ((t * 0.9 + i * 0.13) % 1) : 0;
            const tx = 380;
            const ty = 860;
            const x = mix(bx, tx, k * k);
            const y = mix(by, ty, k * k);
            return <div key={i} style={{ position: "absolute", left: x, top: y, width: 10 + (i % 3) * 4, height: 8 + (i % 2) * 5, borderRadius: 3, background: i % 4 ? "#6B4A2B" : "#EDE3D2", opacity: action ? 1 - k * 0.9 : 1, rotate: `${i * 37}deg` }} />;
          })}
          {action
            ? [0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{ position: "absolute", left: 80 + i * 30, top: 880 + i * 70, width: 260, height: 3, borderRadius: 3, background: "rgba(255,255,255,0.55)", rotate: "-38deg", opacity: (Math.sin(t * 12 + i) + 1) / 2 }} />
              ))
            : null}
          <div style={{ position: "absolute", left: 300 + shake, top: 560 + shake * 0.6, rotate: action ? `${-6 + Math.sin(t * 9) * 2}deg` : "0deg" }}>
            <Photo src="ruleta/aspiradora-cuerpo.png" width={640} />
          </div>
          {action ? <div style={{ position: "absolute", left: 290, top: 600, width: 220, height: 220, borderRadius: 999, background: "radial-gradient(circle, rgba(255,255,255,0.45) 0%, transparent 70%)", opacity: 0.6 + Math.sin(t * 20) * 0.2 }} /> : null}
        </Table>
        {ui ? (
          <>
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 620, background: "linear-gradient(180deg, transparent, rgba(0,0,0,0.6))" }} />
            <div style={{ position: "absolute", left: 50, right: 200, bottom: 230, fontFamily: INTER, color: "#fff" }}>
              <div style={{ fontSize: 44, fontWeight: 700 }}>@tienda.demo</div>
              <div style={{ fontSize: 38, marginTop: 10, opacity: 0.92 }}>{action ? "Mira cómo lo deja en 2 segundos" : "Aspiradora de mano inalámbrica"}</div>
            </div>
            <div style={{ position: "absolute", right: 40, top: 900, display: "flex", flexDirection: "column", gap: 56 }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ width: 92, height: 92, borderRadius: 99, background: "rgba(255,255,255,0.22)" }} />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

/** Finger in the foreground: dark, out of focus, rim-lit by the violet desk light. */
export const Thumb: React.FC<{ x: number; y: number; rot?: number }> = ({ x, y, rot = -18 }) => (
  <div style={{ position: "absolute", left: x, top: y, width: 200, height: 460, rotate: `${rot}deg`, filter: "blur(7px)" }}>
    <div style={{ position: "absolute", inset: 0, borderRadius: "100px 100px 80px 80px", background: "linear-gradient(90deg, #120C1C 0%, #2A1E33 45%, #3B2A44 75%, #6A4FD0 100%)", boxShadow: "0 30px 60px rgba(0,0,0,0.6)" }} />
    <div style={{ position: "absolute", left: 36, top: 22, width: 120, height: 96, borderRadius: "56px 56px 36px 36px", background: "rgba(120,100,150,0.35)" }} />
  </div>
);

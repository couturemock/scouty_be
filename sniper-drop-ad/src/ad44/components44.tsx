import React from "react";
import { Img, staticFile } from "remotion";
import { C, CTA_GRADIENT, INTER, SORA } from "../styles/theme";
import { DemoTag, Logo } from "../components/primitives";
import { IArrowR, IHeart, IPlay } from "../components/Icons";

// ---------------------------------------------------------------------------
// Laptop (2.5D): lid with bezel + keyboard deck in perspective.
// Content is authored at `nativeW × nativeH` and scaled into the screen.
// ---------------------------------------------------------------------------
export const Laptop: React.FC<{
  width: number; // screen width in px
  nativeW?: number;
  nativeH?: number;
  children: React.ReactNode;
  deck?: number; // 0..1 visibility of the base
  style?: React.CSSProperties;
}> = ({ width, nativeW = 1440, nativeH = 900, children, deck = 1, style }) => {
  const screenH = (width * nativeH) / nativeW;
  const bezel = width * 0.022;
  const s = width / nativeW;
  return (
    <div style={{ position: "relative", width: width + bezel * 2, ...style }}>
      {/* lid */}
      <div
        style={{
          width: width + bezel * 2,
          height: screenH + bezel * 2.4,
          borderRadius: width * 0.028,
          background: "linear-gradient(180deg, #2A2E37 0%, #15171C 100%)",
          padding: `${bezel * 1.2}px ${bezel}px ${bezel * 1.2}px`,
          boxShadow: "0 0 0 2px rgba(255,255,255,0.06) inset, 0 60px 120px rgba(0,0,0,0.55)",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", top: bezel * 0.45, left: "50%", width: bezel * 0.35, height: bezel * 0.35, marginLeft: -bezel * 0.17, borderRadius: 99, background: "#0A0B0E" }} />
        <div style={{ width, height: screenH, overflow: "hidden", borderRadius: width * 0.008, background: "#000", position: "relative" }}>
          <div style={{ width: nativeW, height: nativeH, transform: `scale(${s})`, transformOrigin: "0 0" }}>{children}</div>
          {/* glass reflection */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 35%)", pointerEvents: "none" }} />
        </div>
      </div>
      {/* deck */}
      <div style={{ position: "relative", height: width * 0.045, opacity: deck }}>
        <div
          style={{
            position: "absolute",
            left: -width * 0.07,
            right: -width * 0.07,
            top: 0,
            height: width * 0.03,
            borderRadius: `0 0 ${width * 0.03}px ${width * 0.03}px`,
            background: "linear-gradient(180deg, #C9CDD5 0%, #8E939D 55%, #5D626B 100%)",
            boxShadow: "0 30px 50px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ position: "absolute", left: "50%", width: width * 0.16, marginLeft: -width * 0.08, top: 0, height: width * 0.009, borderRadius: `0 0 ${width * 0.01}px ${width * 0.01}px`, background: "#7C818B" }} />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Browser window (neutral chrome) with an address bar that can be typed.
// ---------------------------------------------------------------------------
export const Browser: React.FC<{
  url: string;
  typed?: number; // 0..1 characters typed
  caret?: boolean;
  loading?: number; // 0..1 progress bar
  children?: React.ReactNode;
  width?: number;
  height?: number;
}> = ({ url, typed = 1, caret = false, loading = 0, children, width = 1440, height = 900 }) => {
  const shown = url.slice(0, Math.round(url.length * typed));
  return (
    <div style={{ width, height, background: "#0B0C10", display: "flex", flexDirection: "column", fontFamily: INTER }}>
      <div style={{ height: 64, background: "#2B2D33", display: "flex", alignItems: "center", padding: "0 22px", gap: 14, position: "relative", flexShrink: 0 }}>
        {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
          <div key={c} style={{ width: 14, height: 14, borderRadius: 99, background: c }} />
        ))}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{ width: 620, height: 38, borderRadius: 10, background: "#1C1D22", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, color: "#ECEEF2", gap: 2 }}>
            {shown}
            {caret ? <span style={{ width: 2, height: 22, background: "#5B7BFF" }} /> : null}
          </div>
        </div>
        <div style={{ width: 70 }} />
        {loading > 0 && loading < 1 ? <div style={{ position: "absolute", left: 0, bottom: 0, height: 3, width: `${loading * 100}%`, background: CTA_GRADIENT }} /> : null}
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>{children}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// sniperdrop.com home hero — reconstruction of the real landing page
// (reference: public/reference/07-home.jpg). The "plazas" counter is omitted.
// ---------------------------------------------------------------------------
export const LandingHero: React.FC<{ reveal?: number; width?: number; height?: number }> = ({ reveal = 1, width = 1440, height = 836 }) => {
  const line = (i: number) => Math.min(1, Math.max(0, reveal * 5 - i));
  return (
    <div style={{ width, height, background: "radial-gradient(ellipse 80% 70% at 50% 30%, #121A2E 0%, #0B0D13 60%, #08090D 100%)", fontFamily: INTER, color: "#fff", position: "relative" }}>
      {/* header */}
      <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 180px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Logo width={112} />
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <div style={{ display: "flex", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: 3, fontSize: 13 }}>
            <span style={{ background: "#1A2236", padding: "6px 10px", borderRadius: 7, fontWeight: 600 }}>ES</span>
            <span style={{ padding: "6px 10px", color: "#8B93A5" }}>EN</span>
          </div>
          <span style={{ fontSize: 14, color: "#AEB4C0" }}>Entrar</span>
          <div style={{ background: CTA_GRADIENT, borderRadius: 12, padding: "11px 18px", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            Solicitar acceso <IArrowR size={15} color="#fff" />
          </div>
        </div>
      </div>
      {/* hero */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", paddingTop: 120 }}>
        <div style={{ fontFamily: SORA, fontWeight: 500, fontSize: 64, lineHeight: 1.05, letterSpacing: "-0.035em" }}>
          {[
            { t: "Todo lo que necesita", c: "#FFFFFF" },
            { t: "para encontrar,", c: "#4F7BFF" },
            { t: "analizar y validar", c: "#6A6BF5" },
            { t: "una oportunidad.", c: "#9A5BF2" },
          ].map((l, i) => (
            <div key={l.t} style={{ color: l.c, opacity: line(i), translate: `0 ${(1 - line(i)) * 24}px` }}>
              {l.t}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 17, color: "#9AA1B0", lineHeight: 1.6, marginTop: 28, maxWidth: 680, opacity: line(4) }}>
          Drop Sniper detecta productos que ya están generando ventas o empiezan a ganar tracción, analiza en qué mercados están funcionando y encuentra proveedores que puede filtrar por precio, tiempos de entrega y cantidades mínimas.
        </div>
        <div style={{ fontSize: 14, color: "#5B7BFF", lineHeight: 1.6, marginTop: 22, maxWidth: 420, opacity: line(4) }}>
          Productos ganadores, proveedores competitivos y anuncios que ya están funcionando, reunidos en una sola plataforma.
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 34, opacity: line(4.5) }}>
          <div style={{ background: CTA_GRADIENT, borderRadius: 12, padding: "15px 22px", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
            Solicitar acceso <IArrowR size={15} color="#fff" />
          </div>
          <div style={{ border: "1px solid rgba(255,255,255,0.14)", borderRadius: 12, padding: "15px 22px", fontSize: 15 }}>Ver planes</div>
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Official platform logos (unaltered images on white tiles)
// ---------------------------------------------------------------------------
const PLATFORM_SRC = {
  tiktok: { src: "platforms/tiktok-shop.png", ratio: 457 / 445 },
  meta: { src: "platforms/meta.png", ratio: 1087 / 1085 },
  shopify: { src: "platforms/shopify.png", ratio: 941 / 1061 },
} as const;
export type Platform = keyof typeof PLATFORM_SRC;

export const PlatformTile: React.FC<{ platform: Platform; size?: number; glow?: number; style?: React.CSSProperties }> = ({ platform, size = 230, glow = 0, style }) => {
  const p = PLATFORM_SRC[platform];
  const inner = size * 0.74;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.22,
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 30px 60px rgba(0,0,0,0.45), 0 0 ${50 * glow}px rgba(91,123,255,${0.6 * glow})`,
        ...style,
      }}
    >
      <Img src={staticFile(p.src)} style={{ width: p.ratio >= 1 ? inner : inner * p.ratio, height: p.ratio >= 1 ? inner / p.ratio : inner, objectFit: "contain" }} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Trend chart (area + line drawn progressively). Always flagged illustrative.
// ---------------------------------------------------------------------------
export const TREND = [18, 20, 19, 23, 22, 27, 31, 30, 38, 45, 52, 63, 74];
export const TrendChart: React.FC<{ width?: number; height?: number; progress: number; title?: string; tag?: boolean; style?: React.CSSProperties }> = ({
  width = 520,
  height = 220,
  progress,
  title = "Tendencia",
  tag = true,
  style,
}) => {
  const pad = 10;
  const max = 80;
  const pts = TREND.map((v, i) => [pad + (i / (TREND.length - 1)) * (width - pad * 2), height - pad - (v / max) * (height - pad * 2)]);
  const n = Math.max(1, Math.round(progress * (pts.length - 1)));
  const frac = progress * (pts.length - 1) - (n - 1);
  const vis = pts.slice(0, n);
  const a = pts[n - 1];
  const b = pts[Math.min(n, pts.length - 1)];
  const tip = [a[0] + (b[0] - a[0]) * Math.min(1, Math.max(0, frac)), a[1] + (b[1] - a[1]) * Math.min(1, Math.max(0, frac))];
  const all = [...vis, tip];
  const line = all.map((q, i) => `${i ? "L" : "M"}${q[0]},${q[1]}`).join(" ");
  const area = `${line} L${tip[0]},${height} L${pad},${height} Z`;
  return (
    <div style={{ padding: "22px 24px", borderRadius: 24, background: "rgba(17,19,27,0.95)", border: "1px solid rgba(255,255,255,0.1)", fontFamily: INTER, ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 26, fontWeight: 600, color: "#fff" }}>{title}</div>
        {tag ? <DemoTag label="Ilustrativo" style={{ fontSize: 16 }} /> : null}
      </div>
      <svg width={width} height={height}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(91,123,255,0.45)" />
            <stop offset="1" stopColor="rgba(91,123,255,0)" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1={0} x2={width} y1={height * g} y2={height * g} stroke="rgba(255,255,255,0.06)" />
        ))}
        <path d={area} fill="url(#trendFill)" />
        <path d={line} fill="none" stroke="#5B7BFF" strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={tip[0]} cy={tip[1]} r={9} fill="#fff" stroke="#5B7BFF" strokeWidth={4} />
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Vertical ad creative (conceptual, flagged as example in scenes)
// ---------------------------------------------------------------------------
export const AdCreative: React.FC<{
  width?: number;
  hook: string;
  hue?: number;
  product?: React.ReactNode;
  highlight?: number;
  platform?: string;
  style?: React.CSSProperties;
}> = ({ width = 300, hook, hue = 220, product, highlight = 0, platform = "Patrocinado", style }) => {
  const h = width * (16 / 9);
  return (
    <div
      style={{
        width,
        height: h,
        borderRadius: width * 0.08,
        overflow: "hidden",
        position: "relative",
        background: `linear-gradient(165deg, hsl(${hue} 55% 46%) 0%, hsl(${hue} 50% 18%) 55%, #0A0D16 100%)`,
        border: `${Math.max(3, width * 0.012)}px solid ${highlight > 0.5 ? "#7B97FF" : "rgba(255,255,255,0.18)"}`,
        boxShadow: `0 30px 60px rgba(0,0,0,0.5), 0 0 ${70 * highlight}px rgba(91,123,255,${0.6 * highlight})`,
        fontFamily: INTER,
        ...style,
      }}
    >
      <div style={{ position: "absolute", top: width * 0.06, left: width * 0.06, right: width * 0.06, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: width * 0.05, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{platform}</div>
        <div style={{ width: width * 0.1, height: width * 0.1, borderRadius: 99, background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IPlay size={width * 0.05} />
        </div>
      </div>
      <div style={{ position: "absolute", top: h * 0.2, left: 0, right: 0, display: "flex", justifyContent: "center" }}>{product}</div>
      <div style={{ position: "absolute", left: width * 0.07, right: width * 0.07, top: h * 0.62, fontFamily: SORA, fontWeight: 700, fontSize: width * 0.085, lineHeight: 1.15, color: "#fff", textShadow: "0 4px 18px rgba(0,0,0,0.5)" }}>{hook}</div>
      <div style={{ position: "absolute", right: width * 0.05, top: h * 0.42, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "#fff", fontSize: width * 0.04 }}>
        <IHeart size={width * 0.09} color="#fff" />
      </div>
      <div style={{ position: "absolute", left: width * 0.07, right: width * 0.07, bottom: width * 0.08, height: width * 0.12, borderRadius: width * 0.03, background: "rgba(255,255,255,0.92)", color: C.studioInk, fontWeight: 700, fontSize: width * 0.05, display: "flex", alignItems: "center", justifyContent: "center" }}>
        Comprar ahora
      </div>
    </div>
  );
};

/** Real product photo (from the "Analizar producto" screenshot) as a cut-out tile. */
export const ProductPhoto: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.12, background: "#fff", overflow: "hidden", padding: size * 0.04, boxShadow: "0 20px 40px rgba(0,0,0,0.35)", ...style }}>
    <Img src={staticFile("ui/producto-aspiradora.png")} style={{ width: "100%", height: "100%", objectFit: "cover", scale: 1.06 }} />
  </div>
);

import React from "react";
import { C, INTER, SORA } from "../styles/theme";
import { IHeart, IPlay } from "../components/Icons";
import { Earbuds } from "../components/product/Products";
import { ProductPhoto } from "../ad44/components44";

// ---------------------------------------------------------------------------
// Generic premium smartphone (no brand)
// ---------------------------------------------------------------------------
export const Phone: React.FC<{ width?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ width = 440, children, style }) => {
  const h = width * 2.08;
  return (
    <div style={{ width, height: h, borderRadius: width * 0.13, background: "linear-gradient(145deg, #3A3F4A 0%, #15171C 60%, #2A2E36 100%)", padding: width * 0.025, boxShadow: "0 70px 140px rgba(0,0,0,0.6), inset 0 0 0 2px rgba(255,255,255,0.08)", ...style }}>
      <div style={{ width: "100%", height: "100%", borderRadius: width * 0.11, overflow: "hidden", position: "relative", background: "#000" }}>
        {children}
        <div style={{ position: "absolute", top: width * 0.03, left: "50%", width: width * 0.28, height: width * 0.075, marginLeft: -width * 0.14, borderRadius: 99, background: "#000", zIndex: 10 }} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Product visuals for the vertical feed
// ---------------------------------------------------------------------------
export const Serum: React.FC<{ size?: number }> = ({ size = 220 }) => (
  <div style={{ width: size * 0.45, height: size, position: "relative" }}>
    <div style={{ position: "absolute", left: "30%", width: "40%", top: 0, height: "22%", borderRadius: "40% 40% 8px 8px", background: "linear-gradient(90deg, #2B2B2B, #6A6A6A 40%, #1E1E1E)" }} />
    <div style={{ position: "absolute", left: "36%", width: "28%", top: "20%", height: "8%", background: "#C9A66B" }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: "27%", bottom: 0, borderRadius: size * 0.06, background: "linear-gradient(90deg, #D98A6C 0%, #F6C3A8 35%, #FFE3D3 45%, #E49B7E 75%, #B86A50 100%)", boxShadow: "inset 0 -10px 20px rgba(0,0,0,0.2)" }}>
      <div style={{ position: "absolute", left: "15%", right: "15%", top: "35%", height: "28%", borderRadius: 6, background: "rgba(255,255,255,0.85)" }} />
    </div>
  </div>
);

export const Blender: React.FC<{ size?: number }> = ({ size = 240 }) => (
  <div style={{ width: size * 0.6, height: size, position: "relative" }}>
    <div style={{ position: "absolute", left: "8%", right: "8%", top: 0, height: "10%", borderRadius: "12px 12px 4px 4px", background: "#1E2230" }} />
    <div style={{ position: "absolute", left: "5%", right: "5%", top: "9%", height: "58%", borderRadius: "6px 6px 18px 18px", background: "linear-gradient(90deg, rgba(200,230,255,0.35), rgba(255,255,255,0.75) 35%, rgba(200,230,255,0.25))", border: "2px solid rgba(255,255,255,0.6)", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "55%", background: "linear-gradient(180deg, #8EE07A, #4FB548)" }} />
    </div>
    <div style={{ position: "absolute", left: 0, right: 0, top: "67%", bottom: 0, borderRadius: "10px 10px 18px 18px", background: "linear-gradient(90deg, #3A3F4A, #6B717E 40%, #2A2E36)" }}>
      <div style={{ position: "absolute", left: "40%", top: "35%", width: "20%", height: "30%", borderRadius: 99, background: "#9FE6FF" }} />
    </div>
  </div>
);

export const FEED = [
  { key: "gadget", label: "Gadget tecnológico", hue: 215, visual: () => <Earbuds size={260} lid={1} /> },
  { key: "home", label: "Accesorio de hogar", hue: 35, visual: () => <ProductPhoto size={230} /> },
  { key: "beauty", label: "Belleza", hue: 330, visual: () => <Serum size={250} /> },
  { key: "kitchen", label: "Cocina", hue: 140, visual: () => <Blender size={260} /> },
];

/** One full-screen vertical video in a TikTok-style feed (unbranded). */
export const FeedVideo: React.FC<{ item: (typeof FEED)[number]; width: number; height: number; t: number; repeat?: boolean }> = ({ item, width, height, t, repeat }) => (
  <div style={{ width, height, position: "relative", overflow: "hidden", background: `radial-gradient(ellipse at 50% 38%, hsl(${item.hue} 45% 42%) 0%, hsl(${item.hue} 40% 16%) 55%, #07080C 100%)`, fontFamily: INTER }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: height * 0.26, display: "flex", justifyContent: "center", rotate: `${Math.sin(t * 2) * 4}deg`, scale: 1 + Math.sin(t * 1.5) * 0.03 }}>{item.visual()}</div>
    {/* right rail */}
    <div style={{ position: "absolute", right: width * 0.04, top: height * 0.5, display: "flex", flexDirection: "column", gap: width * 0.06, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: width * 0.11, height: width * 0.11, borderRadius: 99, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {i === 0 ? <IHeart size={width * 0.06} color="#fff" /> : <div style={{ width: width * 0.05, height: width * 0.05, borderRadius: 4, background: "rgba(255,255,255,0.8)" }} />}
        </div>
      ))}
    </div>
    {/* caption */}
    <div style={{ position: "absolute", left: width * 0.06, right: width * 0.2, bottom: height * 0.07 }}>
      <div style={{ fontSize: width * 0.05, fontWeight: 700, color: "#fff" }}>@tienda.viral</div>
      <div style={{ fontSize: width * 0.042, color: "rgba(255,255,255,0.85)", marginTop: 6 }}>{repeat ? "El producto que todos tienen #viral" : `${item.label} que lo está petando #fyp`}</div>
      <div style={{ height: 4, borderRadius: 4, background: "rgba(255,255,255,0.25)", marginTop: 12 }}>
        <div style={{ width: `${(t * 37) % 100}%`, height: "100%", borderRadius: 4, background: "#fff" }} />
      </div>
    </div>
    <div style={{ position: "absolute", left: "50%", top: "45%", translate: "-50% -50%", opacity: 0 }}>
      <IPlay size={40} />
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Bedroom at night (stylised 2.5D illustration, SVG)
// ---------------------------------------------------------------------------
export const Bedroom: React.FC<{ dawn: number; t: number; screen: React.ReactNode }> = ({ dawn, t, screen }) => {
  const breathe = Math.sin(t * 1.6) * 4;
  const sky = (n: string, d: string) => (dawn > 0 ? `color-mix(in srgb, ${n} ${100 - dawn * 100}%, ${d})` : n);
  return (
    <div style={{ width: 1080, height: 1920, position: "relative", overflow: "hidden", background: sky("#070B18", "#2B2338") }}>
      {/* window */}
      <div style={{ position: "absolute", left: 90, top: 330, width: 420, height: 560, borderRadius: 16, border: "14px solid #1A2033", background: `linear-gradient(180deg, ${sky("#0D1838", "#F2A66B")} 0%, ${sky("#16244A", "#F7C98E")} 70%, ${sky("#1E2E58", "#FBE3B5")} 100%)`, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 10, background: "#1A2033" }} />
        <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 10, background: "#1A2033" }} />
        <div style={{ position: "absolute", left: 250, top: 70, width: 70, height: 70, borderRadius: 99, background: "#E8ECF8", boxShadow: "0 0 40px rgba(232,236,248,0.6)", opacity: 1 - dawn }} />
        <div style={{ position: "absolute", left: 60, bottom: -40, width: 160, height: 160, borderRadius: 99, background: "#FFD58A", boxShadow: "0 0 80px rgba(255,200,120,0.9)", opacity: dawn, translate: `0 ${(1 - dawn) * 60}px` }} />
        {/* city silhouette */}
        <svg width={420} height={560} style={{ position: "absolute", inset: 0 }}>
          <path d="M0 460 L0 400 L40 400 L40 360 L90 360 L90 420 L130 420 L130 330 L180 330 L180 390 L230 390 L230 350 L280 350 L280 410 L330 410 L330 370 L380 370 L380 430 L420 430 L420 560 L0 560 Z" fill={sky("#0A1024", "#7C5A6E")} />
          {[[60, 380], [150, 350], [160, 380], [250, 370], [350, 390]].map(([x, y], i) => (
            <rect key={i} x={x} y={y} width={8} height={10} fill="#FFD58A" opacity={(1 - dawn) * (0.5 + 0.5 * Math.sin(t * 2 + i))} />
          ))}
        </svg>
      </div>
      {/* moonlight / dawn light on the wall */}
      <div style={{ position: "absolute", left: 40, top: 900, width: 700, height: 900, background: `radial-gradient(ellipse at 30% 0%, ${dawn > 0.3 ? "rgba(255,190,120,0.25)" : "rgba(120,150,255,0.12)"} 0%, transparent 60%)` }} />
      {/* floor */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1480, bottom: 0, background: sky("#05070F", "#1D1724") }} />
      {/* bed */}
      <div style={{ position: "absolute", left: 40, top: 1150, width: 640, height: 360 }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 40, height: 340, borderRadius: 12, background: "#1B2236" }} />
        <div style={{ position: "absolute", left: 20, right: 0, top: 170, height: 150, borderRadius: 18, background: "#141A2B" }} />
        {/* pillow */}
        <div style={{ position: "absolute", left: 60, top: 120, width: 190, height: 80, borderRadius: 40, background: sky("#C9CFDD", "#F1D9CC") }} />
        {/* head */}
        <div style={{ position: "absolute", left: 130, top: 98, width: 96, height: 96, borderRadius: 99, background: sky("#8A7262", "#C69A80") }}>
          <div style={{ position: "absolute", left: -6, top: -6, width: 108, height: 62, borderRadius: "60px 60px 20px 30px", background: "#2A1E1A" }} />
        </div>
        {/* blanket (breathing) */}
        <div style={{ position: "absolute", left: 180, right: 10, top: 130 - breathe, height: 120 + breathe, borderRadius: "70px 30px 16px 16px", background: `linear-gradient(180deg, ${sky("#3A4F8F", "#7F8FC4")} 0%, ${sky("#26356A", "#5B6AA0")} 100%)`, boxShadow: "0 -10px 30px rgba(0,0,0,0.3)" }} />
      </div>
      {/* desk + monitor */}
      <div style={{ position: "absolute", left: 600, top: 1220, width: 440, height: 22, borderRadius: 6, background: "#2A2F3D" }} />
      <div style={{ position: "absolute", left: 630, top: 1242, width: 18, height: 240, background: "#20242F" }} />
      <div style={{ position: "absolute", left: 990, top: 1242, width: 18, height: 240, background: "#20242F" }} />
      <div style={{ position: "absolute", left: 800, top: 1150, width: 40, height: 70, background: "#1A1D25" }} />
      <div style={{ position: "absolute", left: MONITOR.x, top: MONITOR.y, width: MONITOR.w, height: MONITOR.h, borderRadius: 12, background: "#0B0C10", border: "10px solid #1A1D25", boxShadow: "0 0 120px 30px rgba(91,123,255,0.35)", overflow: "hidden" }}>
        {screen}
      </div>
      {/* screen glow on the room */}
      <div style={{ position: "absolute", left: 300, top: 700, width: 900, height: 1000, background: "radial-gradient(ellipse at 70% 40%, rgba(91,123,255,0.22) 0%, transparent 60%)" }} />
    </div>
  );
};
export const MONITOR = { x: 590, y: 880, w: 460, h: 290 };

// ---------------------------------------------------------------------------
// Week-by-week research timeline (fictional example)
// ---------------------------------------------------------------------------
export const WEEKS = [
  { w: "Semana 1", a: "Investigación del producto" },
  { w: "Semana 2", a: "Comparación de proveedores" },
  { w: "Semana 3", a: "Pruebas de creativos" },
  { w: "Semana 4", a: "Lanzamiento de anuncios" },
  { w: "Semana 5", a: "Actividad comercial" },
];

export const Stage: React.FC<{ label: string; active: number; done: number; x: number }> = ({ label, active, done, x }) => (
  <div style={{ position: "absolute", left: x, top: 0, translate: "-50% 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
    <div style={{ width: 44, height: 44, borderRadius: 99, background: done ? "#5B7BFF" : "#141A2C", border: "4px solid #5B7BFF", boxShadow: `0 0 ${30 * active}px rgba(91,123,255,0.9)`, scale: 1 + active * 0.25 }} />
    <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 24, letterSpacing: "0.08em", color: done || active ? "#fff" : C.muted }}>{label}</div>
  </div>
);

export const WarnBadge: React.FC<{ text: string; k: number }> = ({ text, k }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "22px 34px", borderRadius: 24, background: "rgba(20,10,12,0.92)", border: "2px solid rgba(255,107,74,0.85)", boxShadow: `0 0 ${50 * k}px rgba(255,107,74,0.45)`, opacity: Math.min(1, k * 2), scale: 0.85 + 0.15 * Math.min(1, k), fontFamily: SORA }}>
    <svg width={54} height={50} viewBox="0 0 54 50">
      <path d="M27 3 L51 46 L3 46 Z" fill="none" stroke="#FF6B4A" strokeWidth={4.5} strokeLinejoin="round" />
      <path d="M27 18 L27 32" stroke="#FF6B4A" strokeWidth={5} strokeLinecap="round" />
      <circle cx={27} cy={39} r={3.2} fill="#FF6B4A" />
    </svg>
    <span style={{ fontSize: 48, fontWeight: 800, color: "#fff", letterSpacing: "-0.01em", whiteSpace: "nowrap" }}>{text}</span>
  </div>
);

import React from "react";
import { C, INTER, SORA } from "../../styles/theme";

// ---------------------------------------------------------------------------
// Dropshipping product: wireless earbuds charging case (studio render, SVG)
// ---------------------------------------------------------------------------
export const Earbuds: React.FC<{ size?: number; lid?: number; style?: React.CSSProperties }> = ({
  size = 420,
  lid = 1,
  style,
}) => {
  const s = size / 420;
  return (
    <div style={{ width: size, height: size, position: "relative", ...style }}>
      <svg width={size} height={size} viewBox="0 0 420 420">
        <defs>
          <linearGradient id="caseBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.55" stopColor="#EEF0F4" />
            <stop offset="1" stopColor="#C9CED8" />
          </linearGradient>
          <linearGradient id="caseLid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#DCE0E8" />
          </linearGradient>
          <radialGradient id="bud" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.6" stopColor="#E9ECF2" />
            <stop offset="1" stopColor="#B9C0CC" />
          </radialGradient>
          <radialGradient id="inner" cx="0.5" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#2A3142" />
            <stop offset="1" stopColor="#0E121B" />
          </radialGradient>
        </defs>
        {/* contact shadow */}
        <ellipse cx="210" cy="372" rx="150" ry="16" fill="rgba(13,19,36,0.22)" />
        {/* lid (rotates open around hinge) */}
        <g transform={`translate(210 196) rotate(${-38 * lid}) translate(-210 -196)`}>
          <path d="M70 196 Q70 110 210 106 Q350 110 350 196 Z" fill="url(#caseLid)" stroke="#C3C9D4" strokeWidth="2" />
          <path d="M100 176 Q120 132 210 128" stroke="rgba(255,255,255,0.9)" strokeWidth="6" fill="none" strokeLinecap="round" />
        </g>
        {/* inner cavity + buds */}
        <path d="M84 200 Q84 186 100 186 L320 186 Q336 186 336 200 L336 210 L84 210Z" fill="url(#inner)" opacity={lid} />
        <g opacity={lid}>
          <ellipse cx="160" cy="186" rx="40" ry="34" fill="url(#bud)" />
          <rect x="150" y="150" width="20" height="34" rx="10" fill="#E6E9EF" />
          <ellipse cx="260" cy="186" rx="40" ry="34" fill="url(#bud)" />
          <rect x="250" y="150" width="20" height="34" rx="10" fill="#E6E9EF" />
        </g>
        {/* body */}
        <path d="M70 200 L350 200 Q350 350 210 352 Q70 350 70 200 Z" fill="url(#caseBody)" stroke="#C3C9D4" strokeWidth="2" />
        <path d="M96 222 Q100 318 190 334" stroke="rgba(255,255,255,0.95)" strokeWidth="8" fill="none" strokeLinecap="round" />
        <rect x="70" y="198" width="280" height="5" fill="#B8BFCB" />
        <circle cx="210" cy="296" r="5" fill="#34D399" />
      </svg>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${s})`, transformOrigin: "0 0" }} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Bottle (stainless, cylinder shading + label wrapped around the body)
// ---------------------------------------------------------------------------
export const BRAND_NAME = "NÓMADA"; // fictional demo brand

export const BrandMark: React.FC<{ size?: number; color?: string }> = ({ size = 60, color = "#fff" }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: size * 0.12 }}>
    <svg width={size * 0.9} height={size * 0.55} viewBox="0 0 90 55">
      <path d="M4 50 L32 12 L46 30 L58 18 L86 50" fill="none" stroke={color} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="66" cy="10" r="6" fill={color} />
    </svg>
    <div
      style={{
        fontFamily: SORA,
        fontWeight: 700,
        fontSize: size * 0.32,
        letterSpacing: "0.28em",
        color,
        marginRight: "-0.28em",
      }}
    >
      {BRAND_NAME}
    </div>
  </div>
);

export const Bottle: React.FC<{
  height?: number;
  angle?: number; // degrees of spin around vertical axis
  brand?: number; // 0 = generic steel, 1 = branded
  style?: React.CSSProperties;
  shadow?: boolean;
}> = ({ height = 760, angle = 0, brand = 0, style, shadow = true }) => {
  const w = height * 0.34;
  const bodyH = height * 0.78;
  const neckH = height * 0.06;
  const capH = height * 0.16;
  const rad = (angle * Math.PI) / 180;
  const shift = Math.sin(rad) * 12; // specular drift
  const steel = `linear-gradient(90deg, #6F7682 0%, #A9B0BB ${18 + shift}%, #F4F6F9 ${32 + shift}%, #C3C9D2 ${46 + shift}%, #8C939F 72%, #5C626D 100%)`;
  const ink = `linear-gradient(90deg, #0C1220 0%, #1D2840 ${18 + shift}%, #3B4A6B ${32 + shift}%, #22304D ${46 + shift}%, #141C2E 72%, #0A0F1A 100%)`;
  // label wrap: front-facing when cos > 0
  const labelX = Math.sin(rad) * w * 0.42;
  const labelSX = Math.max(0, Math.cos(rad));
  return (
    <div style={{ width: w, height, position: "relative", ...style }}>
      {shadow ? (
        <div
          style={{
            position: "absolute",
            left: -w * 0.25,
            right: -w * 0.25,
            bottom: -height * 0.03,
            height: height * 0.06,
            borderRadius: "50%",
            background: "radial-gradient(ellipse at center, rgba(13,19,36,0.35) 0%, rgba(13,19,36,0) 70%)",
          }}
        />
      ) : null}
      {/* cap */}
      <div
        style={{
          position: "absolute",
          left: w * 0.2,
          width: w * 0.6,
          top: 0,
          height: capH,
          borderRadius: `${w * 0.12}px ${w * 0.12}px ${w * 0.04}px ${w * 0.04}px`,
          background: `linear-gradient(90deg, #15181F 0%, #3A3F4A ${30 + shift}%, #5C6270 ${40 + shift}%, #22262E 80%, #101218 100%)`,
          boxShadow: "inset 0 -6px 10px rgba(0,0,0,0.35)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: -capH * 0.18,
            width: w * 0.28,
            marginLeft: -w * 0.14,
            height: capH * 0.32,
            borderRadius: `${w}px ${w}px 0 0`,
            border: `${w * 0.05}px solid #2A2E37`,
            borderBottom: "none",
          }}
        />
      </div>
      {/* neck */}
      <div
        style={{
          position: "absolute",
          left: w * 0.24,
          width: w * 0.52,
          top: capH,
          height: neckH,
          background: steel,
        }}
      />
      {/* body generic */}
      <div
        style={{
          position: "absolute",
          left: 0,
          width: w,
          top: capH + neckH,
          height: bodyH,
          borderRadius: `${w * 0.32}px ${w * 0.32}px ${w * 0.16}px ${w * 0.16}px`,
          background: steel,
          overflow: "hidden",
        }}
      >
        {/* branded finish fades over the steel */}
        <div style={{ position: "absolute", inset: 0, background: ink, opacity: brand }} />
        {/* soft top bevel */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 12%, rgba(0,0,0,0) 85%, rgba(0,0,0,0.25) 100%)",
          }}
        />
        {/* label */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "38%",
            translate: `calc(-50% + ${labelX}px) 0`,
            scale: `${labelSX} 1`,
            opacity: brand * Math.min(1, labelSX * 2),
          }}
        >
          <BrandMark size={w * 0.5} color="#F2F4F8" />
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 3D box (CSS preserve-3d). Used for branded packaging and shipping parcels.
// ---------------------------------------------------------------------------
export const Box3D: React.FC<{
  w: number;
  h: number;
  d: number;
  rx?: number;
  ry?: number;
  lid?: number; // 0 closed, 1 open
  variant?: "kraft" | "brand";
  front?: React.ReactNode;
  side?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ w, h, d, rx = -18, ry = -32, lid = 0, variant = "kraft", front, side, style }) => {
  const pal =
    variant === "kraft"
      ? { front: "#C99A62", side: "#A97C47", top: "#D9AE78", inner: "#8A6337", tape: "rgba(235,215,180,0.85)" }
      : { front: "#121A2C", side: "#0B111E", top: "#1C2740", inner: "#070B14", tape: "transparent" };
  const face = (extra: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    left: "50%",
    top: "50%",
    backfaceVisibility: "hidden",
    ...extra,
  });
  return (
    <div style={{ width: w, height: h, perspective: 2400, ...style }}>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          transformStyle: "preserve-3d",
          transform: `rotateX(${rx}deg) rotateY(${ry}deg)`,
        }}
      >
        {/* front */}
        <div
          style={face({
            width: w,
            height: h,
            marginLeft: -w / 2,
            marginTop: -h / 2,
            background: pal.front,
            transform: `translateZ(${d / 2}px)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "inset 0 0 40px rgba(0,0,0,0.12)",
          })}
        >
          {front}
        </div>
        {/* back */}
        <div style={face({ width: w, height: h, marginLeft: -w / 2, marginTop: -h / 2, background: pal.side, transform: `rotateY(180deg) translateZ(${d / 2}px)` })} />
        {/* right */}
        <div
          style={face({
            width: d,
            height: h,
            marginLeft: -d / 2,
            marginTop: -h / 2,
            background: pal.side,
            transform: `rotateY(90deg) translateZ(${w / 2}px)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          {side}
        </div>
        {/* left */}
        <div style={face({ width: d, height: h, marginLeft: -d / 2, marginTop: -h / 2, background: pal.side, transform: `rotateY(-90deg) translateZ(${w / 2}px)` })} />
        {/* bottom */}
        <div style={face({ width: w, height: d, marginLeft: -w / 2, marginTop: -d / 2, background: pal.inner, transform: `rotateX(-90deg) translateZ(${h / 2}px)` })} />
        {/* inner floor visible when open */}
        <div style={face({ width: w, height: d, marginLeft: -w / 2, marginTop: -d / 2, background: pal.inner, transform: `rotateX(90deg) translateZ(${h / 2 - 4}px)`, opacity: lid > 0 ? 1 : 0 })} />
        {/* lid hinged at the back-top edge: 90deg = closed, 200deg = open */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: w,
            height: d,
            marginLeft: -w / 2,
            transformOrigin: "50% 0%",
            transform: `translateY(${-h / 2}px) translateZ(${-d / 2}px) rotateX(${90 + lid * 110}deg)`,
            background: pal.top,
          }}
        >
          {variant === "kraft" ? (
            <div style={{ position: "absolute", left: "44%", width: "12%", top: 0, bottom: 0, background: pal.tape }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.9, rotate: "180deg" }}>
              <BrandMark size={Math.min(w, d) * 0.45} color="#E8ECF4" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Generic e-commerce store product page (phone). Deliberately unbranded:
// evokes Shopify / TikTok Shop without imitating either one.
// ---------------------------------------------------------------------------
export const StorePhone: React.FC<{
  width?: number;
  price: string;
  confirmed?: number; // 0..1 morph to order confirmation
  pressed?: number;
  productSlot?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ width = 560, price, confirmed = 0, pressed = 0, productSlot, style }) => {
  const h = width * 2.02;
  const r = width * 0.11;
  return (
    <div
      style={{
        width,
        height: h,
        borderRadius: r,
        background: "#0D1324",
        padding: width * 0.03,
        boxShadow: "0 60px 120px rgba(13,19,36,0.35), 0 20px 40px rgba(13,19,36,0.2)",
        ...style,
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: r * 0.8,
          background: "#FFFFFF",
          overflow: "hidden",
          position: "relative",
          fontFamily: INTER,
        }}
      >
        {/* status / store header */}
        <div style={{ height: width * 0.2, display: "flex", alignItems: "flex-end", justifyContent: "space-between", padding: `0 ${width * 0.07}px ${width * 0.035}px` }}>
          <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: width * 0.05, color: C.studioInk }}>tu-tienda</div>
          <div style={{ display: "flex", gap: width * 0.03 }}>
            <div style={{ width: width * 0.05, height: width * 0.05, borderRadius: 99, border: `3px solid ${C.studioInk}` }} />
            <div style={{ width: width * 0.05, height: width * 0.05, borderRadius: 8, border: `3px solid ${C.studioInk}` }} />
          </div>
        </div>
        {/* product stage */}
        <div
          style={{
            margin: `0 ${width * 0.05}px`,
            height: width * 0.86,
            borderRadius: width * 0.05,
            background: "radial-gradient(ellipse at 50% 40%, #FFFFFF 0%, #EEF1F6 70%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 1 - confirmed,
          }}
        >
          {productSlot}
        </div>
        <div style={{ padding: `${width * 0.05}px ${width * 0.07}px`, opacity: 1 - confirmed }}>
          <div style={{ fontSize: width * 0.045, color: C.studioMuted, fontWeight: 500 }}>Auriculares inalámbricos</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <svg key={i} width={width * 0.04} height={width * 0.04} viewBox="0 0 24 24">
                <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8Z" fill="#F5B544" />
              </svg>
            ))}
          </div>
          <div style={{ fontFamily: SORA, fontSize: width * 0.115, fontWeight: 700, color: C.studioInk, marginTop: width * 0.02, letterSpacing: "-0.02em" }}>
            {price}
          </div>
        </div>
        {/* buy button */}
        <div
          style={{
            position: "absolute",
            left: width * 0.07,
            right: width * 0.07,
            bottom: width * 0.1,
            height: width * 0.15,
            borderRadius: width * 0.075,
            background: C.studioInk,
            color: "#fff",
            fontWeight: 700,
            fontSize: width * 0.05,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            scale: 1 - pressed * 0.05,
            opacity: 1 - confirmed,
          }}
        >
          Comprar ahora
        </div>
        {/* order confirmation */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: width * 0.04,
            opacity: confirmed,
            scale: 0.9 + confirmed * 0.1,
          }}
        >
          <div
            style={{
              width: width * 0.28,
              height: width * 0.28,
              borderRadius: 999,
              background: "#E8F8EE",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width={width * 0.15} height={width * 0.15} viewBox="0 0 24 24">
              <path
                d="m5 12.5 4.5 4.5L19 7.5"
                fill="none"
                stroke={C.green}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="30"
                strokeDashoffset={30 * (1 - Math.min(1, confirmed * 1.4))}
              />
            </svg>
          </div>
          <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: width * 0.07, color: C.studioInk }}>Pedido confirmado</div>
          <div style={{ fontSize: width * 0.042, color: C.studioMuted }}>Pedido #1048 · 1 artículo</div>
        </div>
      </div>
    </div>
  );
};

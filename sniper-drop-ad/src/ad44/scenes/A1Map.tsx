import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, spr, tw, useTime } from "../../animations/clock";
import { DarkBg, RiseText } from "../../components/primitives";
import { Box3D } from "../../components/product/Products";
import { AdCreative } from "../components44";
import { Chopper, DogBottle, ProductTile44 } from "../products44";
import { C, INTER, SORA } from "../../styles/theme";
import { V } from "../timeline44";

const NODES = [
  { x: 230, y: 760 }, // store
  { x: 790, y: 690 }, // product
  { x: 300, y: 1230 }, // parcel
  { x: 800, y: 1190 }, // ad
];
const EXTRA = [
  { x: 540, y: 900 },
  { x: 160, y: 1000 },
  { x: 930, y: 930 },
  { x: 560, y: 1120 },
  { x: 200, y: 1460 },
  { x: 900, y: 1470 },
  { x: 420, y: 640 },
];
const TARGET = { x: 560, y: 1420 };
const ROUTE = [NODES[0], EXTRA[0], NODES[1], EXTRA[2], NODES[3], EXTRA[3], TARGET];

const routeLen = (pts: { x: number; y: number }[]) => pts.slice(1).reduce((s, q, i) => s + Math.hypot(q.x - pts[i].x, q.y - pts[i].y), 0);
const pointAt = (pts: { x: number; y: number }[], k: number) => {
  const L = routeLen(pts) * k;
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (acc + d >= L) {
      const u = (L - acc) / d;
      return { x: mix(pts[i - 1].x, pts[i].x, u), y: mix(pts[i - 1].y, pts[i].y, u) };
    }
    acc += d;
  }
  return pts[pts.length - 1];
};

const MiniStore: React.FC = () => (
  <div style={{ width: 340, borderRadius: 22, background: "#fff", overflow: "hidden", boxShadow: "0 30px 60px rgba(0,0,0,0.45)", fontFamily: INTER }}>
    <div style={{ height: 34, background: "#ECEFF5", display: "flex", alignItems: "center", gap: 7, padding: "0 14px" }}>
      {["#FF5F57", "#FEBC2E", "#28C840"].map((c) => (
        <div key={c} style={{ width: 10, height: 10, borderRadius: 9, background: c }} />
      ))}
      <div style={{ flex: 1, height: 16, borderRadius: 6, background: "#fff", marginLeft: 8 }} />
    </div>
    <div style={{ padding: 16, display: "flex", gap: 14, alignItems: "center" }}>
      <ProductTile44 kind="chopper" size={120} style={{ border: "1px solid #E3E7EF" }} />
      <div>
        <div style={{ fontSize: 17, color: C.studioMuted }}>Tienda online</div>
        <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 32, color: C.studioInk, marginTop: 4 }}>29,99 €</div>
        <div style={{ marginTop: 10, background: C.studioInk, color: "#fff", fontSize: 15, fontWeight: 700, borderRadius: 10, padding: "8px 12px", textAlign: "center" }}>Comprar</div>
      </div>
    </div>
  </div>
);

export const A1Map: React.FC = () => {
  const t = useTime();
  // opening demo: the hand presses the chopper lid on frame 1, dice fall into the container
  const press = Math.min(1, 0.12 + p(t, 0, 0.55, E.inOut) * 0.88);
  const dice = p(t, 0.5, 1.0, E.in);
  const objIn = [spr(t, 2.35, 8, 0.6), 1, spr(t, 2.45, 8, 0.6), spr(t, 2.55, 8, 0.6)];
  const toMap = p(t, 2.45, 0.9, E.inOut); // objects condense into nodes
  const lines = p(t, 2.75, 0.8, E.inOut);
  const extraIn = EXTRA.map((_, i) => p(t, 2.7 + i * 0.06, 0.45));
  const route = tw(t, [V.mapa - 0.05, 4.35], [0, 1], E.inOut);
  const target = spr(t, 4.25, 9, 0.5);
  const dive = p(t, 4.55, 0.4, E.in);
  const head = route > 0 ? pointAt(ROUTE, route) : ROUTE[0];
  const floatY = (i: number) => Math.sin(t * 1.6 + i * 1.7) * 10 * (1 - toMap);

  const objects = [
    <MiniStore key="s" />,
    <Chopper key="e" size={860} press={press} dice={dice} hand={toMap < 0.6} />,
    <Box3D key="b" w={230} h={190} d={210} rx={-18} ry={-32 + t * 12} variant="kraft" />,
    <AdCreative key="a" width={210} hook="Lo que todos están comprando" hue={225} product={<DogBottle height={160} bowl={0.7} level={0.6} />} />,
  ];

  return (
    <AbsoluteFill style={{ scale: 1 + dive * 0.9, transformOrigin: `${TARGET.x}px ${TARGET.y}px`, opacity: 1 - dive * 0.6 }}>
      <DarkBg glowY={55} glow={0.8} />

      {/* technological map: topographic lines + grid */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.2 + toMap * 0.8 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <path
            key={i}
            d={`M -50 ${560 + i * 190} C 250 ${470 + i * 190 + Math.sin(i) * 80}, 650 ${700 + i * 170}, 1130 ${560 + i * 200}`}
            fill="none"
            stroke="rgba(91,123,255,0.16)"
            strokeWidth={1.5}
          />
        ))}
        {/* connections between nodes */}
        {[
          [NODES[0], EXTRA[0]],
          [EXTRA[0], NODES[1]],
          [NODES[1], EXTRA[2]],
          [EXTRA[2], NODES[3]],
          [NODES[0], EXTRA[1]],
          [EXTRA[1], NODES[2]],
          [NODES[2], EXTRA[3]],
          [EXTRA[3], NODES[3]],
          [NODES[2], EXTRA[4]],
          [NODES[3], EXTRA[5]],
          [EXTRA[0], EXTRA[3]],
          [EXTRA[6], NODES[1]],
          [EXTRA[6], NODES[0]],
          [EXTRA[3], TARGET],
        ].map(([a, b], i) => {
          const len = Math.hypot(b.x - a.x, b.y - a.y);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="rgba(123,151,255,0.35)" strokeWidth={2} strokeDasharray={`${len} ${len}`} strokeDashoffset={len * (1 - lines)} />;
        })}
        {/* luminous route */}
        {route > 0 ? (
          <>
            <path
              d={ROUTE.map((q, i) => `${i ? "L" : "M"}${q.x},${q.y}`).join(" ")}
              fill="none"
              stroke="#7B97FF"
              strokeWidth={7}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={`${routeLen(ROUTE)} ${routeLen(ROUTE)}`}
              strokeDashoffset={routeLen(ROUTE) * (1 - route)}
              style={{ filter: "drop-shadow(0 0 10px rgba(91,123,255,0.9))" }}
            />
            <circle cx={head.x} cy={head.y} r={14} fill="#fff" style={{ filter: "drop-shadow(0 0 16px #7B97FF)" }} />
          </>
        ) : null}
      </svg>

      {/* studio light behind the opening demo */}
      <div style={{ position: "absolute", left: 540 - 520, top: 1010 - 520, width: 1040, height: 1040, borderRadius: 999, background: "radial-gradient(circle, rgba(236,240,248,0.95) 0%, rgba(214,222,238,0.75) 45%, rgba(214,222,238,0) 70%)", opacity: 1 - toMap, scale: mix(1, 0.3, toMap) }} />

      {/* small market-signal nodes */}
      {EXTRA.map((n, i) => (
        <div key={i} style={{ position: "absolute", left: n.x - 15, top: n.y - 15, width: 30, height: 30, borderRadius: 99, background: "#141A2C", border: "3px solid #5B7BFF", scale: extraIn[i], boxShadow: "0 0 18px rgba(91,123,255,0.6)" }} />
      ))}

      {/* the four e-commerce objects → map nodes */}
      {objects.map((o, i) => {
        const k = objIn[i];
        const n = NODES[i];
        const demo = i === 1;
        const x = demo ? mix(540, n.x, toMap) : n.x;
        const y = demo ? mix(1010, n.y, toMap) : n.y + floatY(i);
        const sc = demo ? mix(1, 0.27, toMap) : 0.42 * Math.min(1, k);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, translate: "-50% -50%", scale: sc, opacity: demo ? 1 : Math.min(1, k * 2), rotate: `${demo ? 0 : mix([-6, 5, -4, 6][i], 0, toMap)}deg`, zIndex: demo ? 4 : 2 }}>
            <div style={{ borderRadius: 40, boxShadow: toMap > 0.5 ? "0 0 0 10px rgba(91,123,255,0.35)" : undefined }}>{o}</div>
          </div>
        );
      })}

      {/* highlighted opportunity: crosshair target (logo motif) */}
      <div style={{ position: "absolute", left: TARGET.x, top: TARGET.y, translate: "-50% -50%", scale: target, opacity: Math.min(1, target * 2), zIndex: 3 }}>
        <svg width={260} height={260} viewBox="-130 -130 260 260">
          <circle r={70} fill="rgba(91,123,255,0.15)" stroke="#7B97FF" strokeWidth={4} />
          <circle r={110} fill="none" stroke="rgba(123,151,255,0.5)" strokeWidth={2} strokeDasharray="8 10" />
          <line x1={0} x2={0} y1={-128} y2={-80} stroke="#7B97FF" strokeWidth={3} />
          <line x1={0} x2={0} y1={80} y2={128} stroke="#7B97FF" strokeWidth={3} />
          <line y1={0} y2={0} x1={-128} x2={-80} stroke="#7B97FF" strokeWidth={3} />
          <line y1={0} y2={0} x1={80} x2={128} stroke="#7B97FF" strokeWidth={3} />
          <circle r={14} fill="#fff" />
        </svg>
        <div style={{ position: "absolute", top: 230, left: "50%", translate: "-50% 0", whiteSpace: "nowrap", fontFamily: INTER, fontWeight: 700, fontSize: 30, letterSpacing: "0.12em", color: "#C8D2F5" }}>OPORTUNIDAD</div>
      </div>

      {/* labels while objects are big */}
      <div style={{ position: "absolute", top: 1560, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 20, fontFamily: SORA, fontWeight: 700, fontSize: 44, color: "#fff", opacity: (1 - toMap) * p(t, V.dropshipping - 0.1, 0.4) }}>
        <span>Dropshipping</span>
        <span style={{ color: C.blueSoft, opacity: p(t, V.ecommerce - 0.1, 0.3) }}>· E-commerce</span>
      </div>

      <div style={{ position: "absolute", top: 240, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {t > V.conocer ? <RiseText text={"El mapa del tesoro\ndel e-commerce"} at={V.mapa - 0.35} size={80} color="#fff" highlight={["tesoro"]} highlightColor={C.blueSoft} /> : null}
      </div>
    </AbsoluteFill>
  );
};

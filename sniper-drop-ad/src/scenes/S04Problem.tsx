import React from "react";
import { AbsoluteFill, random } from "remotion";
import { E, mix, p, spr, tw, useTime } from "../animations/clock";
import { RiseText, StudioBg } from "../components/primitives";
import { IPlay, IQuestion } from "../components/Icons";
import { Bottle, Box3D, BrandMark, Earbuds, StorePhone } from "../components/product/Products";
import { C, INTER, SORA } from "../styles/theme";
import { VO } from "../timeline";

const PLATFORMS = ["TikTok Shop", "Meta Ads", "Shopify", "Amazon", "Instagram", "AliExpress", "YouTube", "Google"];
const PRODUCT_HUES = [210, 330, 30, 150, 260, 190, 0, 45];

type Tile = { kind: "product" | "ad" | "platform"; x: number; y: number; rot: number; depth: number; born: number; i: number };

const TILES: Tile[] = new Array(46).fill(0).map((_, i) => {
  const r = (k: string) => random(`tile-${i}-${k}`);
  const kinds: Tile["kind"][] = ["product", "ad", "platform"];
  return {
    kind: kinds[i % 3],
    x: 60 + r("x") * 960,
    y: 280 + r("y") * 1320,
    rot: (r("r") - 0.5) * 26,
    depth: r("d"),
    born: 38.7 + (i / 46) * 5.3 + r("b") * 0.25,
    i,
  };
});

const TileView: React.FC<{ tile: Tile }> = ({ tile }) => {
  const hue = PRODUCT_HUES[tile.i % PRODUCT_HUES.length];
  if (tile.kind === "platform") {
    return (
      <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 30, padding: "14px 24px", borderRadius: 99, background: "#fff", color: C.studioInk, boxShadow: "0 14px 30px rgba(13,19,36,0.14)", whiteSpace: "nowrap" }}>
        {PLATFORMS[tile.i % PLATFORMS.length]}
      </div>
    );
  }
  if (tile.kind === "ad") {
    return (
      <div style={{ width: 150, height: 266, borderRadius: 20, background: `linear-gradient(160deg, hsl(${hue} 60% 55%), #0D1324)`, border: "4px solid #fff", boxShadow: "0 18px 36px rgba(13,19,36,0.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 50, height: 50, borderRadius: 99, background: "rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IPlay size={24} />
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: 190, borderRadius: 22, background: "#fff", padding: 12, boxShadow: "0 18px 36px rgba(13,19,36,0.16)" }}>
      <div style={{ height: 130, borderRadius: 14, background: `linear-gradient(135deg, hsl(${hue} 70% 92%), hsl(${hue} 50% 80%))`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 54, height: 70, borderRadius: 14, background: `hsl(${hue} 55% 58%)` }} />
      </div>
      <div style={{ height: 12, borderRadius: 6, background: "#E3E7EF", marginTop: 12, width: "85%" }} />
      <div style={{ height: 12, borderRadius: 6, background: "#EEF1F6", marginTop: 8, width: "55%" }} />
    </div>
  );
};

const Question: React.FC<{ text: string; at: number }> = ({ text, at }) => {
  const t = useTime();
  const k = spr(t, at - 0.05, 10, 0.55);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, opacity: Math.min(1, k * 2), translate: `${(1 - k) * 60}px 0` }}>
      <div style={{ width: 66, height: 66, borderRadius: 20, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <IQuestion size={40} color="#fff" stroke={2.2} />
      </div>
      <div style={{ fontFamily: SORA, fontWeight: 800, fontSize: 62, color: C.studioInk, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
};

export const S04Problem: React.FC = () => {
  const t = useTime();
  const cardsIn = p(t, 37.5, 0.8, E.out);
  const merge = p(t, VO.problem + 0.4, 0.8, E.inOut);
  const cardsOut = p(t, 40.1, 0.5, E.in);
  const panel = spr(t, VO.q1 - 0.25, 9, 0.6);
  const collapse = p(t, 44.35, 0.85, E.in); // everything gets sucked into one point
  const dark = p(t, 44.45, 0.7, E.inOut);

  return (
    <AbsoluteFill>
      <StudioBg tint={dark} />

      {/* Two models converge into the same space */}
      <AbsoluteFill style={{ opacity: 1 - cardsOut, scale: 1 - cardsOut * 0.1 }}>
        <div style={{ position: "absolute", left: mix(-400, mix(110, 250, merge), cardsIn), top: 760, rotate: `${mix(-14, -6, merge)}deg` }}>
          <div style={{ scale: 0.6, transformOrigin: "0 0" }}>
            <StorePhone width={460} price="29,99 €" productSlot={<Earbuds size={300} lid={1} />} />
          </div>
        </div>
        <div style={{ position: "absolute", left: mix(1200, mix(600, 470, merge), cardsIn), top: 860, rotate: `${mix(14, 6, merge)}deg`, display: "flex", alignItems: "flex-end" }}>
          <Bottle height={380} brand={1} angle={10} />
          <div style={{ marginLeft: -20, scale: 0.75, transformOrigin: "0 100%" }}>
            <Box3D w={300} h={340} d={250} rx={-14} ry={-28} variant="brand" front={<BrandMark size={120} color="#E8ECF4" />} />
          </div>
        </div>
      </AbsoluteFill>

      <div style={{ position: "absolute", top: 330, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: 1 - p(t, VO.q1 - 0.4, 0.4) }}>
        <RiseText text={"Los dos modelos,\nel mismo problema"} at={VO.problem} size={74} highlight={["mismo", "problema"]} />
      </div>

      {/* Catalog overload: products, ads and platforms keep piling up */}
      <AbsoluteFill>
        {TILES.map((tile) => {
          const k = spr(t, tile.born, 9, 0.55);
          if (k <= 0) return null;
          const drift = (t - tile.born) * (tile.depth - 0.5) * 30;
          const scale = (0.65 + tile.depth * 0.5) * mix(1, 0, collapse);
          const x = mix(tile.x + drift, 540, collapse);
          const y = mix(tile.y, 960, collapse);
          return (
            <div
              key={tile.i}
              style={{
                position: "absolute",
                left: x,
                top: y,
                translate: "-50% -50%",
                scale: scale * Math.min(1, k),
                rotate: `${tile.rot + (1 - k) * 20}deg`,
                opacity: Math.min(1, k * 2) * (0.55 + tile.depth * 0.45),
                filter: tile.depth < 0.3 ? `blur(${(0.3 - tile.depth) * 10}px)` : undefined,
                zIndex: Math.round(tile.depth * 10),
              }}
            >
              <TileView tile={tile} />
            </div>
          );
        })}
      </AbsoluteFill>

      {/* The three questions, synced to the voice */}
      <div
        style={{
          position: "absolute",
          left: 70,
          right: 70,
          top: 690,
          padding: "52px 44px",
          borderRadius: 40,
          background: "rgba(255,255,255,0.92)",
          boxShadow: "0 50px 120px rgba(13,19,36,0.28)",
          display: "flex",
          flexDirection: "column",
          gap: 40,
          zIndex: 20,
          opacity: Math.min(1, panel * 2) * (1 - collapse),
          scale: mix(0.9, 1, Math.min(1, panel)) * mix(1, 0.2, collapse),
          translate: `0 ${tw(t, [44.35, 45.1], [0, 0])}px`,
        }}
      >
        <Question text="¿Qué producto elijo?" at={VO.q1} />
        <Question text="¿Qué anuncio hago?" at={VO.q2} />
        <Question text="¿Dónde me anuncio?" at={VO.q3} />
      </div>

      {/* collapse point glow */}
      <div style={{ position: "absolute", left: 540 - 10, top: 960 - 10, width: 20, height: 20, borderRadius: 99, background: C.blueBright, boxShadow: `0 0 ${60 * collapse}px ${20 * collapse}px rgba(79,123,255,0.8)`, opacity: collapse, zIndex: 30 }} />
    </AbsoluteFill>
  );
};

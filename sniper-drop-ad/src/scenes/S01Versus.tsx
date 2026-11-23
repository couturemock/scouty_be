import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, spr, tw, useTime } from "../animations/clock";
import { Eyebrow, StudioBg } from "../components/primitives";
import { IBox, IStack, IStore, ITruck, IBadge, ISparkles } from "../components/Icons";
import { Bottle, Earbuds } from "../components/product/Products";
import { C, INTER, SORA } from "../styles/theme";
import { VO } from "../timeline";

const ModelCard: React.FC<{
  title: string;
  accent: string;
  items: { icon: React.ReactNode; label: string }[];
  visual: React.ReactNode;
  itemsIn: number;
  focus: number;
}> = ({ title, accent, items, visual, itemsIn, focus }) => (
  <div
    style={{
      width: 440,
      height: 820,
      borderRadius: 44,
      background: "linear-gradient(180deg, #FFFFFF 0%, #F6F8FB 100%)",
      border: `2px solid ${focus > 0.5 ? accent : "rgba(13,19,36,0.06)"}`,
      boxShadow: `0 ${40 + focus * 30}px ${90 + focus * 40}px rgba(13,19,36,${0.14 + focus * 0.08})`,
      padding: "44px 36px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: INTER,
    }}
  >
    <div style={{ fontFamily: SORA, fontWeight: 800, fontSize: 44, letterSpacing: "-0.01em", color: C.studioInk }}>{title}</div>
    <div style={{ width: 60, height: 6, borderRadius: 6, background: accent, marginTop: 16 }} />
    <div style={{ height: 380, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 10 }}>{visual}</div>
    <div style={{ display: "flex", flexDirection: "column", gap: 22, width: "100%" }}>
      {items.map((it, i) => {
        const k = Math.min(1, Math.max(0, itemsIn * items.length - i));
        return (
          <div
            key={it.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: 34,
              fontWeight: 600,
              color: C.studioInk,
              opacity: k,
              translate: `${(1 - k) * 30}px 0`,
            }}
          >
            <div style={{ width: 52, height: 52, borderRadius: 16, background: `${accent}18`, display: "flex", alignItems: "center", justifyContent: "center" }}>{it.icon}</div>
            {it.label}
          </div>
        );
      })}
    </div>
  </div>
);

export const S01Versus: React.FC = () => {
  const t = useTime();
  const inL = spr(t, 0.05, 7, 0.6);
  const inR = spr(t, 0.3, 7, 0.6);
  const vs = spr(t, 0.85, 10, 0.45);
  const fL = tw(t, [VO.introDrop - 0.1, VO.introDrop + 0.3]) - tw(t, [VO.introEcom - 0.1, VO.introEcom + 0.2]);
  const fR = tw(t, [VO.introEcom - 0.1, VO.introEcom + 0.3]);
  // exit: right card slides away, left card zooms toward camera (into scene 2)
  const out = p(t, 3.55, 0.5, E.inOut);
  const drift = tw(t, [0, 4], [0, 1], E.linear);

  const iconC = (c: string) => ({ size: 30, color: c, stroke: 2 });

  return (
    <AbsoluteFill>
      <StudioBg />
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 300, opacity: 1 - out }}>
        <Eyebrow color={C.blue} size={28} style={{ opacity: p(t, 0.2, 0.6) }}>
          Dos modelos de negocio
        </Eyebrow>
      </AbsoluteFill>
      <AbsoluteFill style={{ perspective: 2000 }}>
        {/* LEFT · DROPSHIPPING */}
        <div
          style={{
            position: "absolute",
            left: mix(-520, 70, inL) + mix(0, 255, out),
            top: 470 + mix(0, 40, out),
            transform: `rotateY(${mix(28, 14, inL) - 14 * out}deg) rotateZ(${mix(-6, -1.5, inL) + 1.5 * out}deg) translateZ(${fL * 40 + out * 140}px)`,
            opacity: 1 - p(t, 3.8, 0.25),
          }}
        >
          <ModelCard
            title="DROPSHIPPING"
            accent={C.blue}
            focus={fL}
            itemsIn={p(t, 0.6, 1.1, E.soft)}
            visual={<Earbuds size={340} lid={0.9} style={{ rotate: `${-4 + drift * 6}deg` }} />}
            items={[
              { icon: <ISparkles {...iconC(C.blue)} />, label: "Producto" },
              { icon: <IStore {...iconC(C.blue)} />, label: "Tienda online" },
              { icon: <ITruck {...iconC(C.blue)} />, label: "Envío directo" },
            ]}
          />
        </div>
        {/* RIGHT · E-COMMERCE */}
        <div
          style={{
            position: "absolute",
            left: mix(1100, 570, inR) + out * 600,
            top: 470,
            transform: `rotateY(${mix(-28, -14, inR)}deg) rotateZ(${mix(6, 1.5, inR)}deg) translateZ(${fR * 40}px)`,
          }}
        >
          <ModelCard
            title="E-COMMERCE"
            accent={C.coral}
            focus={fR}
            itemsIn={p(t, 0.9, 1.2, E.soft)}
            visual={<Bottle height={360} angle={-20 + drift * 30} brand={0.0} />}
            items={[
              { icon: <ISparkles {...iconC(C.coral)} />, label: "Producto" },
              { icon: <IBadge {...iconC(C.coral)} />, label: "Marca propia" },
              { icon: <IBox {...iconC(C.coral)} />, label: "Packaging" },
              { icon: <IStack {...iconC(C.coral)} />, label: "Inventario" },
            ]}
          />
        </div>
      </AbsoluteFill>
      {/* VS badge */}
      <div
        style={{
          position: "absolute",
          left: 540 - 70,
          top: 880 - 70,
          width: 140,
          height: 140,
          borderRadius: 999,
          background: C.studioInk,
          color: "#fff",
          fontFamily: SORA,
          fontWeight: 800,
          fontSize: 54,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          scale: vs * (1 - out),
          rotate: `${(1 - vs) * -40}deg`,
          boxShadow: "0 30px 60px rgba(13,19,36,0.35), 0 0 0 10px rgba(255,255,255,0.9)",
        }}
      >
        VS
      </div>
    </AbsoluteFill>
  );
};

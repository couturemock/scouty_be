import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, spr, useTime } from "../../animations/clock";
import { DarkBg, DemoTag, RiseText } from "../../components/primitives";
import { Float25D } from "../../components/Camera";
import { IEye, IHeart } from "../../components/Icons";
import { Earbuds } from "../../components/product/Products";
import { AdCard, ADS, UI } from "../../components/ui/DropSniperUI";
import { AdCreative, ProductPhoto } from "../../ad44/components44";
import { Serum } from "../components49";
import { C, INTER } from "../../styles/theme";
import { W49 } from "../timeline49";

const CREATIVES = [
  { hook: "Así quedó mi coche", hue: 225, product: () => <ProductPhoto size={150} />, net: "TikTok" },
  { hook: "No sabía que existía", hue: 330, product: () => <div style={{ scale: 0.6 }}><Serum size={240} /></div>, net: "Meta" },
  { hook: "El gadget del mes", hue: 150, product: () => <Earbuds size={160} lid={1} />, net: "TikTok" },
];

export const B06Ads: React.FC = () => {
  const t = useTime();
  const enter = p(t, 23.85, 0.4, E.out);
  const filters = p(t, 24.1, 0.4);
  const ads = CREATIVES.map((_, i) => spr(t, W49.anuncios - 0.05 + i * 0.12, 8, 0.6));
  const card = spr(t, W49.creativos, 8, 0.6);
  const best = p(t, W49.senales - 0.1, 0.5, E.inOut);
  const metrics = [spr(t, W49.senales + 0.1, 9, 0.55), spr(t, W49.senales + 0.25, 9, 0.55)];
  const exit = p(t, 26.95, 0.25, E.in);
  const activeCountry = Math.floor((t - 24.1) / 0.45) % 4;

  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, 1 - exit) }}>
      <DarkBg glowY={45} />

      {/* real filter: country pills from the "Anuncios" screen */}
      <div style={{ position: "absolute", top: 440, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12, opacity: filters, fontFamily: INTER }}>
        {["ES", "US", "MX", "UK"].map((c, i) => (
          <div key={c} style={{ width: 96, height: 60, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: i === activeCountry ? "#fff" : C.muted, background: i === activeCountry ? "rgba(76,104,255,0.25)" : "rgba(255,255,255,0.05)", border: `2px solid ${i === activeCountry ? "rgba(110,140,255,0.8)" : "rgba(255,255,255,0.1)"}` }}>
            {c}
          </div>
        ))}
      </div>

      {/* vertical creatives */}
      {CREATIVES.map((c, i) => {
        const k = ads[i];
        const isBest = i === 0;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 540 + (i - 1) * 300 + (isBest ? mix(0, 300, best) : i === 1 ? mix(0, 80, best) : 0),
              top: 830,
              translate: "-50% -50%",
              scale: Math.min(1, k) * (isBest ? mix(0.95, 1.12, best) : mix(0.95, 0.8, best)),
              opacity: Math.min(1, k * 2) * (isBest ? 1 : 1 - best * 0.5),
              rotate: `${(i - 1) * 4 * (1 - best)}deg`,
              zIndex: isBest ? 3 : 1,
            }}
          >
            <AdCreative width={250} hook={c.hook} hue={c.hue} product={c.product()} platform={c.net} highlight={isBest ? best : 0} />
          </div>
        );
      })}
      {/* best signals: real indicators */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1100, display: "flex", justifyContent: "center", gap: 16, zIndex: 4 }}>
        {[
          { icon: <IEye size={30} color={C.blueBright} />, l: "Vistas", v: "84M" },
          { icon: <IHeart size={30} color={C.blueBright} />, l: "Me gusta", v: "18K" },
        ].map((m, i) => (
          <div key={m.l} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", borderRadius: 18, background: "rgba(20,24,36,0.95)", border: "1.5px solid rgba(110,140,255,0.5)", fontFamily: INTER, opacity: metrics[i], scale: 0.8 + 0.2 * Math.min(1, metrics[i]), translate: `${(1 - Math.min(1, metrics[i])) * -40}px 0` }}>
            {m.icon}
            <span style={{ fontSize: 24, color: C.muted }}>{m.l}</span>
            <span style={{ fontSize: 34, fontWeight: 700, color: "#fff" }}>{m.v}</span>
          </div>
        ))}
      </div>

      {/* real ad card from the Drop Sniper ads library */}
      <Float25D x={540} y={mix(1500, 1400, card)} scale={1.4} rotX={mix(20, 3, card)} lift={card} opacity={Math.min(1, card * 2)}>
        <div style={{ width: 600, fontFamily: INTER, color: UI.text }}>
          <AdCard ad={ADS[0]} glow={best} />
        </div>
      </Float25D>
      <div style={{ position: "absolute", top: 1640, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: ads[0] }}>
        <DemoTag label="Creativos ilustrativos · indicadores reales de la plataforma" />
      </div>

      <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <RiseText text={"Analiza anuncios\ny creativos"} at={W49.anuncios - 0.2} size={78} color="#fff" highlight={["creativos"]} highlightColor={C.blueSoft} />
      </div>
    </AbsoluteFill>
  );
};

import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, spr, useTime } from "../animations/clock";
import { DarkBg, RiseText } from "../components/primitives";
import { Camera, Float25D } from "../components/Camera";
import { IEye, IGlobe, IHeart, IPlay } from "../components/Icons";
import { AdCard, ADS, AdsContent, AppShell } from "../components/ui/DropSniperUI";
import { C, INTER } from "../styles/theme";
import { VO } from "../timeline";
import { TopShade } from "./S06Discovery";

/** Format indicator for "Video vertical 9:16" (no fake creative content). */
const VerticalFrame: React.FC<{ net: string }> = ({ net }) => (
  <div style={{ width: 150, height: 266, borderRadius: 22, border: "2px solid rgba(255,255,255,0.25)", background: "linear-gradient(160deg, #1B2340 0%, #0C1020 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, fontFamily: INTER }}>
    <div style={{ width: 54, height: 54, borderRadius: 99, background: "rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <IPlay size={26} />
    </div>
    <div style={{ fontSize: 15, color: "#C3C8D3", fontWeight: 600 }}>{net}</div>
    <div style={{ fontSize: 13, color: "#8B93A5" }}>9:16</div>
  </div>
);

const Metric: React.FC<{ icon: React.ReactNode; label: string; value: string; k: number }> = ({ icon, label, value, k }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 26px", borderRadius: 22, background: "rgba(20,24,36,0.92)", border: "1.5px solid rgba(110,140,255,0.4)", fontFamily: INTER, opacity: k, scale: 0.8 + 0.2 * k, boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
    {icon}
    <span style={{ fontSize: 28, color: C.muted }}>{label}</span>
    <span style={{ fontSize: 38, fontWeight: 700, color: "#fff" }}>{value}</span>
  </div>
);

export const S07Ads: React.FC = () => {
  const t = useTime();
  const enter = p(t, 53.2, 0.6, E.out);
  const typed = p(t, 53.5, 0.7, E.linear);
  const panDown = p(t, 54.0, 0.9, E.inOut);
  const lift = p(t, 54.55, 0.9, E.inOut);
  const pass = p(t, 55.0, 0.9, E.inOut); // camera passes between the ads, #1 comes forward
  const money = p(t, VO.moneySpent - 0.1, 0.5);
  const exit = p(t, 57.3, 0.3, E.in);

  const cam = { x: mix(790, 790, panDown), y: mix(220, 760, panDown), s: mix(1.18, 1.05, panDown) };

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <DarkBg glowY={60} />
      <Camera x={cam.x} y={cam.y} scale={cam.s * mix(1.1, 1, enter)} sy={1180} rotX={mix(10, 0, enter) + lift * 10} blur={(1 - enter) * 10}>
        <div style={{ opacity: enter * (1 - 0.65 * lift) }}>
          <AppShell active="Anuncios" height={1250}>
            <AdsContent typed={typed} cardsIn={[1 - lift, 1 - lift]} />
          </AppShell>
        </div>
      </Camera>

      {/* ad #2 drifts back, ad #1 comes forward and grows */}
      <Float25D x={mix(760, mix(700, 860, pass), lift)} y={mix(1330, mix(1080, 980, pass), lift)} scale={mix(1.05, mix(1.35, 1.0, pass), lift)} rotY={mix(0, -24, lift)} rotX={6} lift={lift} opacity={Math.min(1, lift * 3) * (1 - 0.5 * pass)}>
        <div style={{ width: 560, fontFamily: INTER, color: "#ECEEF2" }}>
          <AdCard ad={ADS[1]} />
        </div>
      </Float25D>
      <Float25D x={mix(330, mix(400, 540, pass), lift)} y={mix(1330, mix(1180, 1230, pass), lift)} scale={mix(1.05, mix(1.35, 1.75, pass), lift)} rotY={mix(0, mix(18, 0, pass), lift)} rotX={mix(0, 4, lift)} lift={lift} opacity={Math.min(1, lift * 3)}>
        <div style={{ width: 560, fontFamily: INTER, color: "#ECEEF2", display: "flex", gap: 0, position: "relative" }}>
          <AdCard ad={ADS[0]} glow={pass} style={{ width: 560 }} />
          <div style={{ position: "absolute", right: 10, top: -235, opacity: pass, rotate: `${(1 - pass) * 20 + 6}deg`, scale: 0.75 }}>
            <VerticalFrame net="TikTok" />
          </div>
        </div>
      </Float25D>

      {/* where money is being invested: public engagement + country */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 1500, display: "flex", justifyContent: "center", gap: 18 }}>
        <Metric icon={<IEye size={34} color={C.blueBright} />} label="Vistas" value="84M" k={spr(t, VO.moneySpent, 9, 0.6) * (1 - exit)} />
        <Metric icon={<IHeart size={34} color={C.blueBright} />} label="Me gusta" value="18K" k={spr(t, VO.moneySpent + 0.15, 9, 0.6)} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 590, display: "flex", justifyContent: "center", gap: 14, opacity: money, fontFamily: INTER }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 28, color: C.muted, marginRight: 8 }}>
          <IGlobe size={30} color={C.muted} /> País
        </div>
        {["ES", "US", "MX", "UK"].map((c, i) => {
          const active = Math.floor((t - VO.moneySpent) / 0.3) % 4 === i && t > VO.moneySpent;
          return (
            <div key={c} style={{ width: 92, height: 64, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, fontWeight: 700, color: active ? "#fff" : C.muted, background: active ? "rgba(76,104,255,0.25)" : "rgba(255,255,255,0.05)", border: `2px solid ${active ? "rgba(110,140,255,0.8)" : "rgba(255,255,255,0.1)"}`, boxShadow: active ? "0 0 24px rgba(91,123,255,0.5)" : undefined }}>
              {c}
            </div>
          );
        })}
      </div>

      <TopShade height={560} opacity={0.95} />
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <RiseText text={"Analiza los\ncreativos"} at={VO.ads} size={88} color="#fff" highlight={["creativos"]} highlightColor={C.blueSoft} />
      </div>
    </AbsoluteFill>
  );
};

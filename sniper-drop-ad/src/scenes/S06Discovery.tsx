import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, spr, tw, useTime } from "../animations/clock";
import { DarkBg, RiseText } from "../components/primitives";
import { Camera, Float25D } from "../components/Camera";
import { AnalysisContent, AppShell, RANKING_ROWS, RankRow, RankingsContent, WhyHere } from "../components/ui/DropSniperUI";
import { C, INTER } from "../styles/theme";
import { VO } from "../timeline";

const APP_H = 1250;

/** Gradient behind the headline so the UI never fights with the copy. */
export const TopShade: React.FC<{ height?: number; opacity?: number }> = ({ height = 520, opacity = 1 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: 0, height, background: `linear-gradient(180deg, ${C.ink} 0%, ${C.ink}EE 45%, ${C.ink}00 100%)`, opacity }} />
);
export const BottomShade: React.FC<{ height?: number; opacity?: number }> = ({ height = 520, opacity = 1 }) => (
  <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height, background: `linear-gradient(0deg, ${C.ink} 0%, ${C.ink}DD 40%, ${C.ink}00 100%)`, opacity }} />
);

export const S06Discovery: React.FC = () => {
  const t = useTime();
  const enter = p(t, 47.4, 0.9, E.out);
  const zoomRank = p(t, 48.0, 1.1, E.inOut);
  const rowsIn = [0, 1, 2, 3, 4, 5].map((i) => p(t, 47.75 + i * 0.12, 0.5));
  const hl = p(t, 49.3, 0.4);
  const lift = spr(t, 49.55, 8, 0.6);
  const toAnalysis = p(t, VO.traction - 0.25, 0.6, E.inOut);
  const panWhy = p(t, 52.25, 0.8, E.inOut);
  const exit = p(t, 53.2, 0.3, E.in);

  const onRank = toAnalysis < 0.5;

  // camera
  let cam = { x: 720, y: 640, s: mix(0.6, 0.72, enter), rx: mix(24, 0, enter), ry: mix(-16, 0, enter) };
  if (onRank) {
    cam = { ...cam, x: mix(720, 790, zoomRank), y: mix(640, 560, zoomRank), s: mix(cam.s, 1.15, zoomRank) };
  } else {
    cam = { x: mix(845, 845, panWhy), y: mix(330, 560, panWhy), s: mix(1.02, 1.0, panWhy), rx: 0, ry: 0 };
  }
  const whip = 1 - Math.abs(toAnalysis - 0.5) * 2; // 0→1→0 around the cut
  const lifted = RANKING_ROWS[2];

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <DarkBg glowY={55} />
      <Camera x={cam.x} y={cam.y + whip * 120} scale={cam.s} sy={1060} rotX={cam.rx} rotY={cam.ry} blur={whip * 14}>
        <div style={{ opacity: enter * (1 - 0.85 * p(t, 52.2, 0.4)) }}>
          {onRank ? (
            <AppShell active="Inicio" height={APP_H}>
              <RankingsContent rowsIn={rowsIn} highlightRow={2} highlight={hl} />
            </AppShell>
          ) : (
            <AppShell active="Analizar producto" height={APP_H}>
              <AnalysisContent ring={p(t, 52.4, 0.9, E.out)} />
            </AppShell>
          )}
        </div>
      </Camera>

      {/* the strongest ranking row lifts off the dashboard */}
      {onRank ? (
        <Float25D x={540} y={mix(1060, 1400, lift)} scale={mix(1.15, 1.9, lift)} rotX={mix(0, 8, lift)} rotY={mix(0, -6, lift)} lift={lift} opacity={Math.min(1, lift * 3) * (1 - p(t, VO.traction - 0.3, 0.3))}>
          <div style={{ width: 520, borderRadius: 14, overflow: "hidden", background: "#111319", border: "1.5px solid rgba(110,140,255,0.6)", boxShadow: "0 0 40px rgba(91,123,255,0.35)", fontFamily: INTER, color: "#ECEEF2" }}>
            <RankRow i={2} row={lifted} highlight={1} />
          </div>
        </Float25D>
      ) : (
        <Float25D x={540} y={mix(1200, 1060, p(t, 52.2, 0.6))} scale={mix(1.0, 1.25, p(t, 52.2, 0.6))} rotX={6} lift={1} opacity={p(t, 52.3, 0.4)}>
          <div style={{ width: 820, fontFamily: INTER, color: "#ECEEF2" }}>
            <WhyHere progress={p(t, 52.4, 0.9, E.out)} />
          </div>
        </Float25D>
      )}

      <TopShade height={560} />
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <RiseText text={"Detecta\noportunidades"} at={47.6} size={88} color="#fff" highlight={["oportunidades"]} highlightColor={C.blueSoft} />
      </div>
      <div style={{ position: "absolute", top: 1585, left: 0, right: 0, textAlign: "center", fontFamily: INTER, fontSize: 30, color: C.muted, opacity: tw(t, [48.3, 48.8]) * (1 - toAnalysis) }}>
        Más vendidos y mejores señales · por país
      </div>
    </AbsoluteFill>
  );
};

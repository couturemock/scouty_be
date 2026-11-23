import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, spr, useTime } from "../../animations/clock";
import { Cursor, DarkBg, RiseText } from "../../components/primitives";
import { Float25D } from "../../components/Camera";
import { AnalysisContent, AppShell, RankingsContent, StatsStrip, UI, WhyHere } from "../../components/ui/DropSniperUI";
import { Laptop } from "../components44";
import { C, INTER } from "../../styles/theme";
import { V } from "../timeline44";

const SCREEN_W = 800;
const BEZEL = SCREEN_W * 0.022;
const LEFT = (1080 - (SCREEN_W + BEZEL * 2)) / 2;
const TOP = 700;
const K = SCREEN_W / 1440;
// focus: rankings rows area in native coords (~ x 840, y 470)
const FOCUS = { x: LEFT + BEZEL + 840 * K, y: TOP + BEZEL * 1.2 + 470 * K };

export const A6Analyze: React.FC = () => {
  const t = useTime();
  const rise = p(t, 33.6, 0.6, E.out);
  const zoom = p(t, 34.0, 0.7, E.inOut);
  const clickAt = V.senales + 0.15;
  const opened = t > clickAt + 0.2;
  const sheet = p(t, clickAt + 0.2, 0.4, E.out);
  const lift = spr(t, V.analizar, 8, 0.6);
  const why = spr(t, V.analizar + 0.35, 8, 0.6);
  const hl = p(t, V.funcionando, 0.4);
  const exit = p(t, 37.15, 0.3, E.in);

  const sc = mix(1, 1.95, zoom);
  const ty = mix(0, 900 - FOCUS.y, zoom);
  const tx = mix(0, 540 - FOCUS.x, zoom);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <DarkBg glowY={55} />
      <AbsoluteFill style={{ perspective: 2200, opacity: 1 - lift * 0.85, filter: `blur(${lift * 6}px)` }}>
        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: TOP + (1 - rise) * -500,
            transformOrigin: `${FOCUS.x - LEFT}px ${FOCUS.y - TOP}px`,
            transform: `translate(${tx}px, ${ty}px) scale(${sc}) rotateX(${mix(-20, 4, rise) * (1 - zoom)}deg)`,
            opacity: rise,
          }}
        >
          <Laptop width={SCREEN_W} deck={1 - zoom}>
            {opened ? (
              <div style={{ opacity: sheet }}>
                <AppShell active="Analizar producto" height={900} style={{ borderRadius: 0, border: "none" }}>
                  <AnalysisContent />
                </AppShell>
              </div>
            ) : (
              <AppShell active="Inicio" height={900} style={{ borderRadius: 0, border: "none" }}>
                <RankingsContent highlightRow={1} highlight={p(t, clickAt - 0.3, 0.3)} />
              </AppShell>
            )}
          </Laptop>
        </div>
      </AbsoluteFill>

      {/* cursor selects a product */}
      {t > V.senales - 0.5 && t < clickAt + 0.5 ? (
        <Cursor x={mix(880, 600, p(t, V.senales - 0.45, 0.45, E.inOut))} y={mix(1500, FOCUS.y + 10, p(t, V.senales - 0.45, 0.45, E.inOut))} clickAt={clickAt} scale={1.4} opacity={1 - p(t, clickAt + 0.3, 0.2)} />
      ) : null}

      {/* metrics lifted out of the screen */}
      <Float25D x={540} y={mix(1000, 900, lift)} scale={mix(0.8, 1.18, lift)} rotX={mix(20, 4, lift)} lift={lift} opacity={Math.min(1, lift * 2)}>
        <div style={{ width: 860, fontFamily: INTER, color: UI.text }}>
          <StatsStrip style={{ border: `1.5px solid rgba(110,140,255,${0.3 + hl * 0.5})`, boxShadow: `0 0 ${50 * hl}px rgba(91,123,255,0.45)` }} />
        </div>
      </Float25D>
      <Float25D x={540} y={mix(1450, 1290, why)} scale={mix(0.8, 1.12, why)} rotX={mix(20, 4, why)} lift={why} opacity={Math.min(1, why * 2)}>
        <div style={{ width: 860, fontFamily: INTER, color: UI.text }}>
          <WhyHere progress={p(t, V.analizar + 0.4, 0.8)} />
        </div>
      </Float25D>

      <div style={{ position: "absolute", top: 240, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <RiseText text={"Decide\ncon datos"} at={V.tu - 0.05} size={92} color="#fff" highlight={["datos"]} highlightColor={C.blueSoft} />
      </div>
      <div style={{ position: "absolute", top: 1560, left: 0, right: 0, textAlign: "center", fontFamily: INTER, fontSize: 28, color: C.muted, opacity: lift }}>
        Analiza cada producto antes de invertir
      </div>
    </AbsoluteFill>
  );
};

import React from "react";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { SceneClock } from "../animations/clock";
import { C } from "../styles/theme";
import { FPS, HAS_AUDIO, SCENES44, Scene44 } from "./timeline44";
import { A1Map } from "./scenes/A1Map";
import { A2Laptop } from "./scenes/A2Laptop";
import { A3Modules } from "./scenes/A3Modules";
import { A4Platforms } from "./scenes/A4Platforms";
import { A5Testing } from "./scenes/A5Testing";
import { A6Analyze } from "./scenes/A6Analyze";
import { A7Formula } from "./scenes/A7Formula";
import { A8Close } from "./scenes/A8Close";

export const SCENES44_COMPONENTS: Record<Scene44, React.FC> = {
  a1: A1Map,
  a2: A2Laptop,
  a3: A3Modules,
  a4: A4Platforms,
  a5: A5Testing,
  a6: A6Analyze,
  a7: A7Formula,
  a8: A8Close,
};

export const SCENES44_TITLES: Record<Scene44, string> = {
  a1: "44-1-Mapa",
  a2: "44-2-Ordenador-Web",
  a3: "44-3-Modulos",
  a4: "44-4-Plataformas",
  a5: "44-5-Pruebas",
  a6: "44-6-Analizar",
  a7: "44-7-Formula",
  a8: "44-8-Cierre",
};

const f = (s: number) => Math.round(s * FPS);

export const SniperDrop44: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    {(Object.keys(SCENES44) as Scene44[]).map((k) => {
      const [a, b] = SCENES44[k];
      const Comp = SCENES44_COMPONENTS[k];
      return (
        <Sequence key={k} name={SCENES44_TITLES[k]} from={f(a)} durationInFrames={f(b) - f(a)} premountFor={30}>
          <SceneClock start={f(a) / FPS}>
            <Comp />
          </SceneClock>
        </Sequence>
      );
    })}
    {HAS_AUDIO ? <Audio src={staticFile("audio/narracion-44.m4a")} /> : null}
  </AbsoluteFill>
);

export const Scene44Preview: React.FC<{ scene: Scene44 }> = ({ scene }) => {
  const Comp = SCENES44_COMPONENTS[scene];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <SceneClock start={f(SCENES44[scene][0]) / FPS}>
        <Comp />
      </SceneClock>
    </AbsoluteFill>
  );
};

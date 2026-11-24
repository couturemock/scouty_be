import React from "react";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { SceneClock } from "../animations/clock";
import { C } from "../styles/theme";
import { FPS, SCENES49, Scene49 } from "./timeline49";
import { B01Feed } from "./scenes/B01Feed";
import { B02Market } from "./scenes/B02Market";
import { B03Weeks } from "./scenes/B03Weeks";
import { B04Question } from "./scenes/B04Question";
import { B05SniperDrop } from "./scenes/B05SniperDrop";
import { B06Ads } from "./scenes/B06Ads";
import { B07AdAge } from "./scenes/B07AdAge";
import { B08Suppliers } from "./scenes/B08Suppliers";
import { B09Engines } from "./scenes/B09Engines";
import { B10Platforms } from "./scenes/B10Platforms";
import { B11Sleep } from "./scenes/B11Sleep";

export const SCENES49_COMPONENTS: Record<Scene49, React.FC> = {
  b01: B01Feed,
  b02: B02Market,
  b03: B03Weeks,
  b04: B04Question,
  b05: B05SniperDrop,
  b06: B06Ads,
  b07: B07AdAge,
  b08: B08Suppliers,
  b09: B09Engines,
  b10: B10Platforms,
  b11: B11Sleep,
};

export const SCENES49_TITLES: Record<Scene49, string> = {
  b01: "49-01-Feed-TikTok",
  b02: "49-02-Mercado",
  b03: "49-03-Semanas",
  b04: "49-04-Pregunta",
  b05: "49-05-SniperDrop-Web",
  b06: "49-06-Anuncios",
  b07: "49-07-Dinero-Antiguedad",
  b08: "49-08-Proveedores-Margen",
  b09: "49-09-Motores",
  b10: "49-10-Plataformas",
  b11: "49-11-Duermes-Cierre",
};

const f = (s: number) => Math.round(s * FPS);

export const SniperDrop49: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    {(Object.keys(SCENES49) as Scene49[]).map((k) => {
      const [a, b] = SCENES49[k];
      const Comp = SCENES49_COMPONENTS[k];
      return (
        <Sequence key={k} name={SCENES49_TITLES[k]} from={f(a)} durationInFrames={f(b) - f(a) + 1} premountFor={30}>
          <SceneClock start={f(a) / FPS}>
            <Comp />
          </SceneClock>
        </Sequence>
      );
    })}
    <Audio src={staticFile("audio/narracion-49.mp3")} />
  </AbsoluteFill>
);

export const Scene49Preview: React.FC<{ scene: Scene49 }> = ({ scene }) => {
  const Comp = SCENES49_COMPONENTS[scene];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <SceneClock start={f(SCENES49[scene][0]) / FPS}>
        <Comp />
      </SceneClock>
      <Audio src={staticFile("audio/narracion-49.mp3")} trimBefore={f(SCENES49[scene][0])} />
    </AbsoluteFill>
  );
};

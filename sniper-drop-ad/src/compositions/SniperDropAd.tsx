import React from "react";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { SceneClock } from "../animations/clock";
import { SCENES, SceneKey, sec } from "../timeline";
import { C } from "../styles/theme";
import { SCENE_COMPONENTS } from "../scenes";

/**
 * Master timeline. Each scene lives in its own <Sequence> placed at the
 * absolute narration time defined in timeline.ts. Scenes overlap a few
 * frames so they can hand off with their own transitions.
 */
export const SniperDropAd: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => (
  <AbsoluteFill style={{ background: C.ink }}>
    {(Object.keys(SCENES) as SceneKey[]).map((key) => {
      const [start, end] = SCENES[key];
      const Comp = SCENE_COMPONENTS[key];
      return (
        <Sequence key={key} name={key} from={sec(start)} durationInFrames={sec(end) - sec(start)} premountFor={30}>
          <SceneClock start={sec(start) / 30}>
            <Comp />
          </SceneClock>
        </Sequence>
      );
    })}
    {withAudio ? <Audio src={staticFile("audio/narracion.m4a")} /> : null}
  </AbsoluteFill>
);

/** Stand-alone wrapper so each scene can be previewed as its own composition. */
export const ScenePreview: React.FC<{ scene: SceneKey }> = ({ scene }) => {
  const Comp = SCENE_COMPONENTS[scene];
  const [start] = SCENES[scene];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <SceneClock start={sec(start) / 30}>
        <Comp />
      </SceneClock>
      <Audio src={staticFile("audio/narracion.m4a")} trimBefore={sec(start)} />
    </AbsoluteFill>
  );
};

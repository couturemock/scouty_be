import React from "react";
import { Composition, Folder } from "remotion";
import { ScenePreview, SniperDropAd } from "./compositions/SniperDropAd";
import { SCENE_TITLES } from "./scenes";
import { FPS, SCENES, SceneKey, TOTAL_FRAMES, sec } from "./timeline";
import { H, W } from "./styles/theme";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="SniperDropAd" component={SniperDropAd} width={W} height={H} fps={FPS} durationInFrames={TOTAL_FRAMES} defaultProps={{ withAudio: true }} />
    <Folder name="Escenas">
      {(Object.keys(SCENES) as SceneKey[]).map((k) => (
        <Composition
          key={k}
          id={SCENE_TITLES[k]}
          component={ScenePreview}
          width={W}
          height={H}
          fps={FPS}
          durationInFrames={sec(SCENES[k][1]) - sec(SCENES[k][0])}
          defaultProps={{ scene: k }}
        />
      ))}
    </Folder>
  </>
);

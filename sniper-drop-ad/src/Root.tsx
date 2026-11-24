import React from "react";
import { Composition, Folder } from "remotion";
import { ScenePreview, SniperDropAd } from "./compositions/SniperDropAd";
import { SCENE_TITLES } from "./scenes";
import { FPS, SCENES, SceneKey, TOTAL_FRAMES, sec } from "./timeline";
import { H, W } from "./styles/theme";
import { Scene44Preview, SCENES44_TITLES, SniperDrop44 } from "./ad44/SniperDrop44";
import { SCENES44, Scene44, TOTAL_FRAMES as TOTAL44, toReal44 } from "./ad44/timeline44";
import { ProductsQA } from "./ad44/ProductsQA";
import { Scene49Preview, SCENES49_TITLES, SniperDrop49 } from "./ad49/SniperDrop49";
import { SCENES49, Scene49, TOTAL_FRAMES as TOTAL49, toReal } from "./ad49/timeline49";

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
    <Folder name="QA">
      <Composition id="QA-Productos44" component={ProductsQA} width={W} height={H} fps={FPS} durationInFrames={1} />
    </Folder>
    <Composition id="SniperDrop44" component={SniperDrop44} width={W} height={H} fps={FPS} durationInFrames={TOTAL44} />
    <Folder name="Escenas-44s">
      {(Object.keys(SCENES44) as Scene44[]).map((k) => (
        <Composition
          key={k}
          id={SCENES44_TITLES[k]}
          component={Scene44Preview}
          width={W}
          height={H}
          fps={FPS}
          durationInFrames={Math.round((toReal44(SCENES44[k][1]) - toReal44(SCENES44[k][0])) * FPS)}
          defaultProps={{ scene: k }}
        />
      ))}
    </Folder>
    <Composition id="SniperDrop49" component={SniperDrop49} width={W} height={H} fps={FPS} durationInFrames={TOTAL49} />
    <Folder name="Escenas-49s">
      {(Object.keys(SCENES49) as Scene49[]).map((k) => (
        <Composition
          key={k}
          id={SCENES49_TITLES[k]}
          component={Scene49Preview}
          width={W}
          height={H}
          fps={FPS}
          durationInFrames={Math.round((toReal(SCENES49[k][1]) - toReal(SCENES49[k][0])) * FPS)}
          defaultProps={{ scene: k }}
        />
      ))}
    </Folder>
  </>
);

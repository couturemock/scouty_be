import React from "react";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { SceneClock } from "../animations/clock";
import { Captions } from "./componentsR";
import { R01, R02, R03, R04, R05, R06, R07, R08, R09 } from "./scenesR";
import { FPS, K, SHOTS, ShotKey } from "./timelineR";

const COMPONENTS: Record<ShotKey, React.FC> = { r01: R01, r02: R02, r03: R03, r04: R04, r05: R05, r06: R06, r07: R07, r08: R08, r09: R09 };
const f = (s: number) => Math.round(s * FPS);

/** Sound effects synced to what we see (synthesised, see scripts/make_audio_ruleta.py). */
const SFX: { src: string; at: number; vol: number }[] = [
  { src: "audio/sfx-tap.wav", at: 0.42, vol: 0.9 }, // sample touches the table
  { src: "audio/sfx-whoosh.wav", at: 1.3, vol: 0.35 },
  { src: "audio/sfx-swipe.wav", at: 5.22, vol: 0.8 }, // thumb passes the static video
  { src: "audio/sfx-swipe.wav", at: 6.3, vol: 0.55 }, // thumb starts again… and stops
  { src: "audio/sfx-click.wav", at: K.sniperDrop - 0.02, vol: 1 }, // trackpad click on "Sniper Drop"
  { src: "audio/sfx-whoosh.wav", at: 20.8, vol: 0.35 }, // day → night
  { src: "audio/sfx-click.wav", at: K.pais, vol: 0.6 }, // country selected
  { src: "audio/sfx-click.wav", at: K.abres - 0.02, vol: 0.6 },
  { src: "audio/sfx-click.wav", at: K.cuanto - 0.08, vol: 0.6 }, // "Calcular"
  { src: "audio/sfx-roll.wav", at: 40.85, vol: 0.8 }, // ball rolling
  { src: "audio/sfx-hit.wav", at: K.ganar, vol: 1 }, // ball drops on red on "ganar"
];

/** Captions: below the action; lower during the product/phone shots, kept off prices, country and metrics. */
const captionY = (t: number) => (t >= 21.96 && t < 36.7 ? 1500 : t >= 4.32 && t < 13.44 ? 1560 : 1470);

export const SniperDropRuleta: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    {(Object.keys(SHOTS) as ShotKey[]).map((k) => {
      const [a, b] = SHOTS[k];
      const Comp = COMPONENTS[k];
      return (
        <Sequence key={k} name={k} from={f(a)} durationInFrames={f(b) - f(a) + (k === "r09" ? 1 : 0)} premountFor={30}>
          <SceneClock start={f(a) / FPS}>
            <Comp />
          </SceneClock>
        </Sequence>
      );
    })}
    <SceneClock start={0}>
      <Captions y={captionY} />
    </SceneClock>
    <Audio src={staticFile("audio/locucion-ruleta.mp3")} volume={1} />
    <Audio src={staticFile("audio/ruleta-music.wav")} volume={0.32} />
    {SFX.map((s, i) => (
      <Sequence key={i} from={Math.max(0, f(s.at))} name={`sfx-${i}`} layout="none">
        <Audio src={staticFile(s.src)} volume={s.vol} />
      </Sequence>
    ))}
  </AbsoluteFill>
);

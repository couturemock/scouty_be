import React, { createContext, useContext } from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { FPS } from "../timeline";

/**
 * Every scene is authored in ABSOLUTE narration seconds, so animations can be
 * keyed directly to the words of the voice-over. The provider tells the scene
 * at which absolute second its <Sequence> starts.
 */
const OffsetCtx = createContext<{ start: number; map?: (t: number) => number }>({ start: 0 });

/**
 * `map` (optional) converts real audio time into the time base the scene was
 * authored in. Used to lock a scene to measured word timestamps.
 */
export const SceneClock: React.FC<{ start: number; map?: (t: number) => number; children: React.ReactNode }> = ({
  start,
  map,
  children,
}) => <OffsetCtx.Provider value={{ start, map }}>{children}</OffsetCtx.Provider>;

/** Absolute time in seconds (narration time). */
export const useTime = () => {
  const frame = useCurrentFrame();
  const { start, map } = useContext(OffsetCtx);
  const t = start + frame / FPS;
  return map ? map(t) : t;
};

// ---- easing library -------------------------------------------------------
export const E = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // expo-out, editorial
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.55, 0, 1, 0.45),
  soft: Easing.bezier(0.33, 1, 0.68, 1),
  back: Easing.bezier(0.34, 1.56, 0.64, 1), // slight overshoot
  linear: Easing.linear,
};

type EaseFn = (n: number) => number;

/** Clamped interpolation over time (seconds). */
export const tw = (
  t: number,
  [t0, t1]: [number, number],
  [a, b]: [number, number] = [0, 1],
  ease: EaseFn = E.out,
) =>
  interpolate(t, [t0, t1], [a, b], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

/** Progress 0→1 in a window. */
export const p = (t: number, t0: number, dur: number, ease: EaseFn = E.out) =>
  tw(t, [t0, t0 + dur], [0, 1], ease);

/** In → hold → out envelope (0..1). */
export const env = (
  t: number,
  tin: number,
  tout: number,
  dIn = 0.5,
  dOut = 0.4,
  easeIn: EaseFn = E.out,
  easeOut: EaseFn = E.in,
) => Math.min(p(t, tin, dIn, easeIn), 1 - p(t, tout - dOut, dOut, easeOut));

/** Damped spring (0→1, slight overshoot) evaluated in seconds. */
export const spr = (t: number, t0: number, stiffness = 9, damping = 0.55) => {
  const x = Math.max(0, t - t0);
  if (x === 0) return 0;
  return 1 - Math.exp(-x * stiffness * damping) * Math.cos(x * stiffness);
};

export const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/** Velocity-based directional blur amount (px) for a 1D motion value. */
export const motionBlur = (f: (t: number) => number, t: number, gain = 0.35, max = 14) => {
  const v = Math.abs(f(t + 1 / FPS) - f(t));
  return Math.min(max, v * gain);
};

/** Euro formatting with Spanish decimal comma. */
export const eur = (n: number, digits = 2) => {
  const [i, d] = n.toFixed(digits).split(".");
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (d ? `${int},${d}` : int) + " €";
};

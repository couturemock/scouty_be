import React from "react";
import { AbsoluteFill } from "remotion";
import { W } from "../styles/theme";

/**
 * 2.5D camera. Places world point (x, y) at screen point (sx, sy) with zoom
 * `scale`, then tilts the whole plane with rotateX / rotateY for depth.
 */
export const Camera: React.FC<{
  x: number;
  y: number;
  scale: number;
  sx?: number;
  sy?: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  perspective?: number;
  blur?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ x, y, scale, sx = W / 2, sy = 960, rotX = 0, rotY = 0, rotZ = 0, perspective = 2200, blur = 0, children, style }) => (
  <AbsoluteFill style={{ perspective, perspectiveOrigin: `${sx}px ${sy}px`, ...style }}>
    <AbsoluteFill
      style={{
        transformOrigin: `${sx}px ${sy}px`,
        transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg)`,
        transformStyle: "preserve-3d",
        filter: blur > 0.2 ? `blur(${blur}px)` : undefined,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transformOrigin: "0 0",
          transform: `translate(${sx - x * scale}px, ${sy - y * scale}px) scale(${scale})`,
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  </AbsoluteFill>
);

/** Floating 2.5D card container with dynamic shadow. */
export const Float25D: React.FC<{
  children: React.ReactNode;
  x: number;
  y: number;
  scale?: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  lift?: number; // 0..1 shadow depth
  opacity?: number;
  origin?: string;
  style?: React.CSSProperties;
}> = ({ children, x, y, scale = 1, rotX = 0, rotY = 0, rotZ = 0, lift = 1, opacity = 1, origin = "50% 50%", style }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      translate: "-50% -50%",
      opacity,
      perspective: 1800,
      ...style,
    }}
  >
    <div
      style={{
        transform: `rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`,
        transformOrigin: origin,
        filter: `drop-shadow(0 ${30 * lift}px ${50 * lift}px rgba(0,0,0,${0.45 * lift}))`,
      }}
    >
      {children}
    </div>
  </div>
);

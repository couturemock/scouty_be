import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, useTime } from "../../animations/clock";
import { DarkBg, RiseText } from "../../components/primitives";
import { FEED, FeedVideo, Phone, WarnBadge } from "../components49";
import { C } from "../../styles/theme";
import { W49 } from "../timeline49";

const PW = 520;
const SW = PW * 0.95; // screen width
const SH = PW * 2.08 - PW * 0.05;

// feed steps: 4 different products, then the same product again and again
const STEPS = [0.55, 1.25, 1.95, 2.65, 3.3, 3.85, 4.35, 4.8, 5.2, 5.55, 5.85];
const SEQ = [0, 1, 2, 3, 0, 0, 0, 0, 0, 0, 0, 0];

export const B01Feed: React.FC = () => {
  const t = useTime();
  // continuous scroll index with eased snaps
  let idx = 0;
  STEPS.forEach((s) => (idx += p(t, s, 0.32, E.inOut)));
  const enter = p(t, 0, 0.9, E.out);
  const zoom = p(t, 2.4, 1.3, E.inOut);
  const warn = p(t, W49.problema - 0.05, 0.35);
  const late = p(t, W49.llegandoTarde - 0.15, 0.35);
  const exit = p(t, 6.25, 0.35, E.in);

  return (
    <AbsoluteFill>
      <DarkBg glowY={50} glow={1 + late * 0.3} />
      <AbsoluteFill style={{ perspective: 2000 }}>
        <div
          style={{
            position: "absolute",
            left: 540 - PW / 2 + mix(0, -560, exit),
            top: 470 + mix(260, 0, enter),
            transform: `rotateY(${mix(-24, -8, enter) + zoom * 8}deg) rotateX(${mix(14, 6, enter) - zoom * 6}deg) scale(${mix(0.9, 1.12, zoom)})`,
            opacity: enter,
          }}
        >
          <Phone width={PW}>
            <div style={{ position: "absolute", left: 0, top: -idx * SH, width: SW, transformOrigin: "0 0" }}>
              {SEQ.map((k, i) => (
                <FeedVideo key={i} item={FEED[k]} width={SW} height={SH} t={t + i} repeat={i >= 4} />
              ))}
            </div>
            {/* warning overlay on the screen when the same product keeps appearing */}
            <div style={{ position: "absolute", inset: 0, background: `rgba(255,107,74,${0.12 * warn})`, boxShadow: `inset 0 0 ${80 * warn}px rgba(255,107,74,${0.6 * warn})` }} />
          </Phone>
        </div>
      </AbsoluteFill>

      {/* repeated counter */}
      <div style={{ position: "absolute", right: 150, top: 560, opacity: p(t, 3.4, 0.3) * (1 - exit), fontFamily: "Sora", fontWeight: 800, fontSize: 64, color: "#FF8A6F" }}>
        ×{Math.min(9, Math.max(1, Math.floor(idx) - 3))}
      </div>

      <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <RiseText text={"¿Buscas productos\nvirales en TikTok?"} at={0.15} out={W49.problema - 0.3} size={74} color="#fff" highlight={["TikTok"]} highlightColor={C.blueSoft} />
      </div>
      <div style={{ position: "absolute", top: 1600, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: 1 - exit }}>
        {late > 0 ? <WarnBadge text="Estás llegando tarde" k={late} /> : <WarnBadge text="Tienes un problema" k={warn} />}
      </div>
    </AbsoluteFill>
  );
};

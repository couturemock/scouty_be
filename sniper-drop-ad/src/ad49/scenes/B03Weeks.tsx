import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, spr, useTime } from "../../animations/clock";
import { DarkBg, DemoTag, RiseText } from "../../components/primitives";
import { ICheck } from "../../components/Icons";
import { FEED, FeedVideo, Phone, WEEKS } from "../components49";
import { C, INTER, SORA } from "../../styles/theme";
import { W49 } from "../timeline49";

const WEEK_AT = [W49.analizandolo - 0.05, W49.analizandolo + 0.45, W49.testeandolo - 0.05, W49.testeandolo + 0.3, W49.vendiendolo];

export const B03Weeks: React.FC = () => {
  const t = useTime();
  const enter = p(t, 8.7, 0.4, E.out);
  const split = p(t, W49.hayGente - 0.2, 0.7, E.inOut);
  const zoomTl = p(t, W49.semanas - 0.1, 0.8, E.inOut);
  const exit = p(t, 16.45, 0.3, E.in);
  const count = Math.min(20, Math.max(1, Math.round(((t - 9.2) / (W49.veinteVeces + 0.8 - 9.2)) * 20)));
  const scroll = (t - 8.7) * 2.2; // same product keeps scrolling past

  const PW = mix(460, 360, split);
  const SW = PW * 0.95;
  const SH = PW * 2.08 - PW * 0.05;
  const phoneX = mix(540, mix(280, 200, zoomTl), split);

  return (
    <AbsoluteFill style={{ opacity: Math.min(enter, 1 - exit) }}>
      <DarkBg glowY={55} />

      {/* LEFT · what you see today */}
      <div style={{ position: "absolute", left: phoneX - PW / 2, top: 620 + mix(0, 80, zoomTl), scale: mix(1, 0.85, zoomTl), opacity: mix(1, 0.75, zoomTl) }}>
        <Phone width={PW}>
          <div style={{ position: "absolute", left: 0, top: -(scroll % 1) * SH, width: SW }}>
            {[0, 1].map((i) => (
              <FeedVideo key={i} item={FEED[0]} width={SW} height={SH} t={t + i} repeat />
            ))}
          </div>
        </Phone>
        <div style={{ position: "absolute", top: -90, left: 0, right: 0, textAlign: "center", fontFamily: INTER, fontWeight: 700, fontSize: 28, letterSpacing: "0.12em", color: C.muted, opacity: split }}>TÚ · HOY</div>
        <div style={{ position: "absolute", right: -30, top: 40, padding: "14px 22px", borderRadius: 20, background: "#FF6B4A", color: "#fff", fontFamily: SORA, fontWeight: 800, fontSize: 46, boxShadow: "0 16px 40px rgba(255,107,74,0.45)", scale: spr(t, 9.3, 10, 0.5) }}>×{count}</div>
      </div>

      {/* RIGHT · weeks of research by other sellers */}
      <div style={{ position: "absolute", left: mix(1200, mix(560, 430, zoomTl), split), top: 560, width: mix(470, 590, zoomTl), opacity: split }}>
        <div style={{ fontFamily: INTER, fontWeight: 700, fontSize: 28, letterSpacing: "0.12em", color: "#9FB3FF", marginBottom: 26 }}>OTROS · SEMANAS ANTES</div>
        <div style={{ position: "relative", paddingLeft: 46 }}>
          <div style={{ position: "absolute", left: 16, top: 10, bottom: 10, width: 4, borderRadius: 4, background: "rgba(123,151,255,0.25)" }}>
            <div style={{ width: "100%", height: `${p(t, W49.semanas, 2.6, E.inOut) * 100}%`, background: "#5B7BFF", borderRadius: 4 }} />
          </div>
          {WEEKS.map((wk, i) => {
            const k = p(t, WEEK_AT[i], 0.35);
            return (
              <div key={wk.w} style={{ position: "relative", marginBottom: 22, padding: "18px 22px", borderRadius: 20, background: k > 0.5 ? "rgba(76,104,255,0.14)" : "#121520", border: `1.5px solid rgba(110,140,255,${0.12 + 0.5 * k})`, fontFamily: INTER, opacity: 0.45 + 0.55 * k }}>
                <div style={{ position: "absolute", left: -46, top: 22, width: 36, height: 36, borderRadius: 99, background: k > 0.5 ? "#5B7BFF" : "#141A2C", border: "3px solid #5B7BFF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {k > 0.5 ? <ICheck size={22} color="#fff" stroke={3} /> : null}
                </div>
                <div style={{ fontSize: 22, color: "#9FB3FF", fontWeight: 600 }}>{wk.w}</div>
                <div style={{ fontSize: 28, color: "#fff", fontWeight: 600, marginTop: 4 }}>{wk.a}</div>
              </div>
            );
          })}
        </div>
        <DemoTag label="Ejemplo ficticio" style={{ display: "inline-block", marginTop: 6 }} />
      </div>

      <div style={{ position: "absolute", top: 240, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {t < W49.hayGente - 0.1 ? (
          <RiseText text={"Te aparece\n20 veces al día"} at={W49.cuando + 0.1} out={W49.hayGente - 0.4} size={80} color="#fff" highlight={["20"]} highlightColor="#FF8A6F" />
        ) : (
          <RiseText text={"Otros llevan semanas\ncon él"} at={W49.hayGente} size={72} color="#fff" highlight={["semanas"]} highlightColor={C.blueSoft} />
        )}
      </div>
    </AbsoluteFill>
  );
};

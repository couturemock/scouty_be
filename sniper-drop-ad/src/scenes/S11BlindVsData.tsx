import React from "react";
import { AbsoluteFill, random } from "remotion";
import { E, mix, p, spr, useTime } from "../animations/clock";
import { DarkBg } from "../components/primitives";
import { IPlay, IQuestion, ISearch } from "../components/Icons";
import { RANKING_ROWS } from "../components/ui/DropSniperUI";
import { C, INTER, SORA } from "../styles/theme";
import { VO } from "../timeline";

const CHAOS = new Array(16).fill(0).map((_, i) => ({
  x: 40 + random(`c-x-${i}`) * 400,
  y: 520 + random(`c-y-${i}`) * 900,
  rot: (random(`c-r-${i}`) - 0.5) * 30,
  kind: i % 4,
  hue: Math.floor(random(`c-h-${i}`) * 360),
}));

const ChaosItem: React.FC<{ kind: number; hue: number }> = ({ kind, hue }) => {
  if (kind === 0)
    return (
      <div style={{ width: 230, height: 150, borderRadius: 12, background: "#1A1E29", border: "1px solid rgba(255,255,255,0.12)", overflow: "hidden" }}>
        <div style={{ height: 26, background: "#252A37", display: "flex", gap: 6, padding: "8px 10px" }}>
          {[0, 1, 2].map((j) => (
            <div key={j} style={{ width: 10, height: 10, borderRadius: 9, background: "#3A4050" }} />
          ))}
        </div>
        <div style={{ padding: 12 }}>
          <div style={{ height: 10, borderRadius: 5, background: "#2E3443", width: "80%" }} />
          <div style={{ height: 10, borderRadius: 5, background: "#2A2F3C", width: "55%", marginTop: 8 }} />
          <div style={{ height: 40, borderRadius: 8, background: `hsl(${hue} 30% 25%)`, marginTop: 10 }} />
        </div>
      </div>
    );
  if (kind === 1)
    return (
      <div style={{ width: 110, height: 196, borderRadius: 16, background: `linear-gradient(160deg, hsl(${hue} 45% 40%), #10131B)`, border: "2px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <IPlay size={30} />
      </div>
    );
  if (kind === 2)
    return (
      <div style={{ width: 84, height: 84, borderRadius: 99, background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <IQuestion size={52} color="#9AA1B0" />
      </div>
    );
  return (
    <div style={{ width: 150, padding: 10, borderRadius: 14, background: "#1A1E29", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div style={{ height: 90, borderRadius: 10, background: `hsl(${hue} 30% 30%)` }} />
      <div style={{ height: 9, borderRadius: 5, background: "#2E3443", marginTop: 10 }} />
    </div>
  );
};

const DataRow: React.FC<{ i: number; k: number; hl?: number }> = ({ i, k, hl = 0 }) => {
  const r = RANKING_ROWS[i];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "16px 18px",
        borderRadius: 18,
        background: hl ? "rgba(76,104,255,0.16)" : "#121520",
        border: `1.5px solid ${hl ? "rgba(110,140,255,0.8)" : "rgba(255,255,255,0.08)"}`,
        boxShadow: hl ? "0 0 30px rgba(91,123,255,0.35)" : undefined,
        opacity: k,
        translate: `${(1 - k) * 40}px 0`,
        fontFamily: INTER,
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 99, background: i < 3 ? "#5B5FEF" : "#1F2330", color: "#fff", fontWeight: 700, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</div>
      <div style={{ width: 62, height: 62, borderRadius: 12, background: `linear-gradient(135deg, hsl(${r.hue} 30% 28%), hsl(${r.hue} 25% 16%))`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 24, height: 30, borderRadius: 6, background: `hsl(${r.hue} 45% 62%)` }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: "#fff" }}>{r.price}</div>
        <div style={{ fontSize: 20, color: C.muted, marginTop: 2 }}>
          {r.bsr} · {r.sales.replace(" est.", "")}
        </div>
      </div>
    </div>
  );
};

export const S11BlindVsData: React.FC = () => {
  const t = useTime();
  const split = p(t, 72.0, 0.6, E.out);
  const typed = p(t, VO.whatToSell - 0.05, 0.6, E.linear);
  const sweep = p(t, VO.machine + 0.2, 1.6, E.inOut); // divider travels left: chaos → order
  const rows = [0, 1, 2, 3, 4].map((i) => p(t, 72.4 + i * 0.12, 0.5));
  const hl = p(t, 76.3, 0.4);
  const exit = p(t, 77.8, 0.35, E.in);
  const divX = mix(540, 0, sweep);
  const rightW = 1080 - divX;

  return (
    <AbsoluteFill style={{ opacity: 1 - exit * 0.0 }}>
      <DarkBg glowX={75} glowY={50} />

      {/* LEFT: blind search */}
      <div style={{ position: "absolute", left: 0, top: 0, width: divX, height: 1920, overflow: "hidden", background: "#0B0D13" }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: 540, height: 1920 }}>
          <div style={{ position: "absolute", top: 260, left: 0, right: 0, textAlign: "center", fontFamily: SORA, fontWeight: 700, fontSize: 40, color: "#9AA1B0", opacity: split }}>
            BÚSQUEDA
            <br />A CIEGAS
          </div>
          {CHAOS.map((c, i) => {
            const jitter = Math.sin(t * 3 + i) * 6;
            const k = spr(t, 72.05 + i * 0.05, 9, 0.6);
            return (
              <div key={i} style={{ position: "absolute", left: c.x + jitter, top: c.y + Math.cos(t * 2.4 + i) * 6, translate: "-50% -50%", rotate: `${c.rot + jitter}deg`, scale: k * 0.95, opacity: Math.min(1, k * 2) * 0.9 }}>
                <ChaosItem kind={c.kind} hue={c.hue} />
              </div>
            );
          })}
          {/* manual search that gives no clear answer */}
          <div style={{ position: "absolute", left: 40, right: 40, top: 430, height: 76, borderRadius: 38, background: "#1A1E29", border: "1.5px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", gap: 14, padding: "0 24px", fontFamily: INTER, fontSize: 28, color: "#fff", opacity: p(t, VO.insteadOf, 0.4), zIndex: 5 }}>
            <ISearch size={28} color="#9AA1B0" />
            {"¿qué vendo?".slice(0, Math.round(typed * 11))}
            <span style={{ width: 3, height: 32, background: "#fff", opacity: Math.floor(t * 3) % 2 }} />
          </div>
        </div>
      </div>

      {/* RIGHT: search with data (Drop Sniper) */}
      <div style={{ position: "absolute", left: divX, top: 0, width: rightW, height: 1920, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: (rightW - mix(500, 900, sweep)) / 2, top: 0, width: mix(500, 900, sweep), height: 1920 }}>
          <div style={{ position: "absolute", top: 260, left: 0, right: 0, textAlign: "center", fontFamily: SORA, fontWeight: 700, fontSize: mix(40, 64, sweep), color: "#fff", opacity: split }}>
            BÚSQUEDA
            <br />
            <span style={{ color: C.blueSoft }}>CON DATOS</span>
          </div>
          <div style={{ position: "absolute", top: mix(470, 560, sweep), left: 0, right: 0, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", opacity: split, fontFamily: INTER }}>
            {["España", "BSR", "Ventas/mes"].map((f, i) => (
              <div key={f} style={{ fontSize: 22, fontWeight: 600, padding: "10px 16px", borderRadius: 99, color: i === 0 ? "#fff" : "#C3C8D3", background: i === 0 ? "rgba(76,104,255,0.2)" : "rgba(255,255,255,0.05)", border: `1.5px solid ${i === 0 ? "rgba(110,140,255,0.7)" : "rgba(255,255,255,0.1)"}` }}>
                {f}
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", top: mix(620, 720, sweep), left: 0, right: 0, display: "flex", flexDirection: "column", gap: 14, scale: mix(1, 1, sweep) }}>
            {[2, 4, 0, 1, 3].map((ri, j) => (
              <DataRow key={ri} i={ri} k={rows[j]} hl={j === 0 ? hl : 0} />
            ))}
          </div>
        </div>
      </div>

      {/* divider */}
      <div style={{ position: "absolute", left: divX - 2, top: 0, width: 4, height: 1920, background: "linear-gradient(180deg, transparent, #5B7BFF 20%, #A855F7 80%, transparent)", boxShadow: "0 0 30px rgba(91,123,255,0.8)", opacity: split * (1 - p(t, 76.1, 0.3)) }} />
    </AbsoluteFill>
  );
};

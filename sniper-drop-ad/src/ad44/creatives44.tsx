/**
 * Full-width ad views for "Creativos que funcionan".
 * Both creatives are RECREATIONS (no real ad material was supplied), so the
 * Sniper Drop tags name the signal type but never show invented figures.
 */
import React from "react";
import { INTER, SORA } from "../styles/theme";
import { LogoIcon } from "../components/primitives";
import { IHeart } from "../components/Icons";
import { PlatformTile } from "./components44";
import { DogBottle, DogHead, DogWalking } from "./products44";

// ---------------------------------------------------------------------------
// Sniper Drop signal tag that accompanies each ad
// ---------------------------------------------------------------------------
export const SniperTag: React.FC<{
  platform: "tiktok" | "meta";
  format: string;
  signal: string;
  glyph: "views" | "time";
  k: number;
  t: number;
  style?: React.CSSProperties;
}> = ({ platform, format, signal, glyph, k, t, style }) => (
  <div
    style={{
      width: 600,
      padding: "24px 26px",
      borderRadius: 30,
      background: "rgba(10,14,28,0.88)",
      border: "2px solid rgba(110,140,255,0.7)",
      boxShadow: "0 30px 60px rgba(0,0,0,0.45), 0 0 40px rgba(91,123,255,0.35)",
      fontFamily: INTER,
      opacity: Math.min(1, k * 2),
      scale: 0.85 + 0.15 * Math.min(1, k),
      transformOrigin: "0 0",
      ...style,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <PlatformTile platform={platform} size={92} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 21, letterSpacing: "0.14em", color: "#9FB3FF", fontWeight: 700 }}>
          <LogoIcon width={34} /> SNIPER DROP
        </div>
        <div style={{ fontSize: 24, color: "#C3C8D3", marginTop: 6 }}>{format}</div>
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18, padding: "16px 18px", borderRadius: 18, background: "rgba(76,104,255,0.16)", border: "1.5px solid rgba(110,140,255,0.5)" }}>
      {glyph === "views" ? (
        <svg width={92} height={46}>
          <polyline points="4,40 20,34 36,36 52,24 68,16 88,6" fill="none" stroke="#7B97FF" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="120" strokeDashoffset={120 * (1 - Math.min(1, k * 1.3))} />
        </svg>
      ) : (
        <svg width={64} height={56} viewBox="0 0 24 21">
          <rect x={2} y={3} width={20} height={17} rx={3} fill="none" stroke="#7B97FF" strokeWidth={1.8} />
          <path d="M2 8h20M7 1v4M17 1v4" stroke="#7B97FF" strokeWidth={1.8} strokeLinecap="round" />
          <rect x={5} y={11} width={4 + Math.min(1, k) * 10} height={5} rx={1.5} fill="#7B97FF" />
        </svg>
      )}
      <div>
        <div style={{ fontSize: 20, color: "#9AA6C8", letterSpacing: "0.08em", fontWeight: 600 }}>SEÑAL QUE DESTACA</div>
        <div style={{ fontSize: 31, color: "#fff", fontWeight: 700, marginTop: 2 }}>{signal}</div>
      </div>
    </div>
    <div style={{ fontSize: 18, color: "rgba(255,255,255,0.55)", marginTop: 14, letterSpacing: "0.06em", textTransform: "uppercase" }}>
      Recreación de ejemplo · sin datos reales
    </div>
  </div>
);

// small white line icons for the TikTok rail
const RailIcon: React.FC<{ d: React.ReactNode }> = ({ d }) => (
  <svg width={78} height={78} viewBox="0 0 24 24" fill="#fff" style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.4))" }}>
    {d}
  </svg>
);

// ---------------------------------------------------------------------------
// 1 · TikTok Shop vertical video (hand presses the button, dog drinks)
// lt = local time in seconds since the view started
// ---------------------------------------------------------------------------
export const TikTokAdView: React.FC<{ lt: number; tagK: number }> = ({ lt, tagK }) => {
  // the hand is already moving on frame 1
  const press = lt < 1.0 ? (Math.sin(lt * 9 + 1.2) + 1) / 2 : 0.85 + Math.sin(lt * 3) * 0.05;
  const bowl = Math.min(0.85, 0.25 + lt * 0.8);
  const lap = (Math.sin(lt * 15) + 1) / 2;
  return (
    <div style={{ width: 1080, height: 1920, position: "relative", overflow: "hidden", fontFamily: INTER, background: "linear-gradient(180deg, #EADBC7 0%, #DCC5A6 58%, #B8946D 58%, #A9845F 100%)" }}>
      {/* scene */}
      <div style={{ position: "absolute", left: 70, top: 640 }}>
        <DogBottle height={980} bowl={bowl} level={0.72 - bowl * 0.25} press={press} flow={press > 0.5 ? 1 : 0} t={lt} hand />
      </div>
      <div style={{ position: "absolute", left: 380, top: 650, rotate: "-4deg" }}>
        <DogHead size={700} lap={lap} />
      </div>
      {/* vignette for UI legibility */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 18%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.6) 100%)" }} />
      {/* top tabs */}
      <div style={{ position: "absolute", top: 120, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 44, fontSize: 34, fontWeight: 700, color: "rgba(255,255,255,0.7)" }}>
        <span>Siguiendo</span>
        <span style={{ color: "#fff", borderBottom: "4px solid #fff", paddingBottom: 8 }}>Para ti</span>
      </div>
      {/* right rail */}
      <div style={{ position: "absolute", right: 34, top: 960, display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <div style={{ position: "relative", width: 100, height: 100, borderRadius: 99, border: "4px solid #fff", background: "linear-gradient(135deg, #F5B544, #E04F3A)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: SORA, fontWeight: 800, fontSize: 40, color: "#fff" }}>
          P<div style={{ position: "absolute", bottom: -18, width: 40, height: 40, borderRadius: 99, background: "#FE2C55", color: "#fff", fontSize: 32, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: INTER }}>+</div>
        </div>
        <IHeart size={80} color="#fff" stroke={2.4} />
        <RailIcon d={<path d="M12 3C6.5 3 2 6.6 2 11c0 2.3 1.2 4.4 3.2 5.9L4.5 21l4.4-2.4c1 .3 2 .4 3.1.4 5.5 0 10-3.6 10-8S17.5 3 12 3Z" />} />
        <RailIcon d={<path d="M6 2h12a1 1 0 0 1 1 1v19l-7-4.5L5 22V3a1 1 0 0 1 1-1Z" />} />
        <RailIcon d={<path d="M14 4l8 7-8 7v-4.2C8.5 13.8 5 15.6 2 20c1-6 4.5-11 12-12V4Z" />} />
      </div>
      {/* shop anchor + account + caption */}
      <div style={{ position: "absolute", left: 40, right: 170, bottom: 330 }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 14, padding: "14px 20px", borderRadius: 14, background: "rgba(255,255,255,0.95)", boxShadow: "0 8px 20px rgba(0,0,0,0.3)" }}>
          <div style={{ width: 52, height: 52, borderRadius: 10, background: "#FE6B2C", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={30} height={30} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round">
              <path d="M5 8h14l-1.2 12H6.2Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, color: "#161823" }}>Botella bebedero para perros</div>
            <div style={{ fontSize: 22, color: "#FE6B2C", fontWeight: 700 }}>Comprar · TikTok Shop</div>
          </div>
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, color: "#fff", marginTop: 26 }}>@paseosfelices</div>
        <div style={{ fontSize: 30, color: "rgba(255,255,255,0.92)", marginTop: 10, lineHeight: 1.35 }}>Aprieta y bebe. Agua limpia en cada salida. #perros #paseo</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 300, height: 5, background: "rgba(255,255,255,0.3)" }}>
        <div style={{ width: `${Math.min(100, 20 + lt * 30)}%`, height: "100%", background: "#fff" }} />
      </div>
      {/* Sniper Drop signal */}
      <div style={{ position: "absolute", left: 40, top: 250 }}>
        <SniperTag platform="tiktok" format="TikTok Shop · vídeo vertical 9:16" signal="Evolución de visualizaciones" glyph="views" k={tagK} t={lt} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 2 · Facebook (Meta) in-feed ad: walk scene → close-up of water returning
// ---------------------------------------------------------------------------
export const FacebookAdView: React.FC<{ lt: number; tagK: number }> = ({ lt, tagK }) => {
  const closeUp = lt > 0.95;
  const back = Math.min(1, Math.max(0, (lt - 0.95) / 1.0));
  return (
    <div style={{ width: 1080, height: 1920, position: "relative", overflow: "hidden", fontFamily: INTER, background: "#F0F2F5" }}>
      {/* app bar (generic) */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 210, background: "#fff", borderBottom: "1px solid #DADDE1", display: "flex", alignItems: "flex-end", padding: "0 34px 26px", gap: 20 }}>
        <div style={{ flex: 1, height: 64, borderRadius: 99, background: "#F0F2F5" }} />
        {[0, 1].map((i) => (
          <div key={i} style={{ width: 64, height: 64, borderRadius: 99, background: "#E4E6EB" }} />
        ))}
      </div>
      {/* post */}
      <div style={{ position: "absolute", top: 236, left: 0, right: 0, background: "#fff", paddingBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "28px 34px 18px" }}>
          <div style={{ width: 92, height: 92, borderRadius: 99, background: "linear-gradient(135deg, #2F9BE0, #1E6FB8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width={52} height={52} viewBox="0 0 24 24" fill="#fff">
              <ellipse cx={12} cy={16} rx={5} ry={4} />
              <circle cx={6} cy={9} r={2.2} />
              <circle cx={10} cy={6} r={2.2} />
              <circle cx={14} cy={6} r={2.2} />
              <circle cx={18} cy={9} r={2.2} />
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: "#050505" }}>Paseo Perfecto</div>
            <div style={{ fontSize: 27, color: "#65676B", marginTop: 4 }}>Publicidad</div>
          </div>
          <div style={{ fontSize: 44, color: "#65676B", fontWeight: 700 }}>···</div>
        </div>
        <div style={{ fontSize: 31, color: "#050505", padding: "0 34px 22px", lineHeight: 1.4 }}>El agua que tu perro no bebe vuelve al depósito. Cero derrames en el paseo.</div>
        {/* video */}
        <div style={{ width: 1080, height: 1000, position: "relative", overflow: "hidden", background: closeUp ? "linear-gradient(180deg, #CFE7F7, #9FCBE8)" : "linear-gradient(180deg, #BFE3F7 0%, #E6F4FB 45%, #8CC66E 45%, #6FAE52 100%)" }}>
          {!closeUp ? (
            <>
              {[120, 380, 820].map((x, i) => (
                <div key={x} style={{ position: "absolute", left: x - ((lt * 160) % 1400) + (i === 2 ? 0 : 0), top: 250 + i * 10, width: 180, height: 180, borderRadius: 99, background: "#5E9E45" }} />
              ))}
              <div style={{ position: "absolute", left: 0, right: 0, top: 610, height: 120, background: "#D9C7A3" }} />
              <div style={{ position: "absolute", left: 140 + lt * 60, top: 300 }}>
                <DogWalking size={720} t={lt} />
              </div>
            </>
          ) : (
            <>
              <div style={{ position: "absolute", left: 330, top: -95 }}>
                <DogBottle height={1100} bowl={Math.max(0, 0.75 - back * 0.75)} level={0.45 + back * 0.25} flow={back < 1 ? -1 : 0} t={lt} />
              </div>
              <div style={{ position: "absolute", left: 40, top: 40, width: 300, padding: "14px 22px", borderRadius: 14, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 30, fontWeight: 700, lineHeight: 1.25 }}>El agua sobrante vuelve al depósito</div>
              <svg width={120} height={260} style={{ position: "absolute", left: 210, top: 300 }}>
                <path d="M60 10 L60 230 M30 200 L60 235 L90 200" stroke="#1E6FB8" strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="300" strokeDashoffset={300 * (1 - back)} />
              </svg>
            </>
          )}
          <div style={{ position: "absolute", right: 30, bottom: 30, padding: "8px 16px", borderRadius: 10, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 24 }}>0:{String(Math.floor(3 + lt)).padStart(2, "0")}</div>
        </div>
        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 34px", background: "#F7F8FA" }}>
          <div>
            <div style={{ fontSize: 22, color: "#65676B", letterSpacing: "0.04em" }}>PASEOPERFECTO.ES</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#050505", marginTop: 4 }}>Botella bebedero para perros</div>
          </div>
          <div style={{ padding: "18px 34px", borderRadius: 12, background: "#E4E6EB", fontSize: 30, fontWeight: 700, color: "#050505" }}>Comprar</div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", padding: "20px 0 10px", fontSize: 28, color: "#65676B", fontWeight: 600, borderTop: "1px solid #E4E6EB" }}>
          <span>Me gusta</span>
          <span>Comentar</span>
          <span>Compartir</span>
        </div>
      </div>
      {/* Sniper Drop signal over the ad */}
      <div style={{ position: "absolute", left: 30, top: 1210, scale: 0.82, transformOrigin: "0 0" }}>
        <SniperTag platform="meta" format="Facebook · anuncio en el feed" signal="Tiempo activo del anuncio" glyph="time" k={tagK} t={lt} />
      </div>
    </div>
  );
};

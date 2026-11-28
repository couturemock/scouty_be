import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { E, eur, mix, p, spr, tw, useTime } from "../animations/clock";
import { Camera } from "../components/Camera";
import { Cursor, Logo } from "../components/primitives";
import { IGlobe } from "../components/Icons";
import { AdsContent, AnalysisContent, AppShell, CALC, calcMargin, CalculatorContent, RankingsContent, SuppliersContent, UI } from "../components/ui/DropSniperUI";
import { MOTORS, MotorCard } from "../components/ui/Engines";
import { Phone } from "../ad49/components49";
import { PlatformTile } from "../ad44/components44";
import { INTER, SORA } from "../styles/theme";
import { Accent, ClipShot, CLIPS, DeskStill, Photo, Table, Thumb, VacuumAd } from "./componentsR";
import { K } from "./timelineR";

const VIOLET_BG = "linear-gradient(180deg, #2A1468 0%, #12082E 60%, #06040E 100%)";

/** Crisp interface (React reconstruction of the client's screens) with its own camera. */
const Crisp: React.FC<{ children: React.ReactNode; x: number; y: number; s: number; opacity?: number; active: "Inicio" | "Analizar producto" | "Anuncios" | "Calculadora" }> = ({ children, x, y, s, opacity = 1, active }) => (
  <AbsoluteFill style={{ opacity, background: "#0C0D11" }}>
    <Camera x={x} y={y} scale={s} sy={900}>
      <AppShell active={active} height={1100} style={{ borderRadius: 0, border: "none", boxShadow: "none" }}>
        {children}
      </AppShell>
    </Camera>
    {/* soft violet spill from the desk light, as in the footage */}
    <AbsoluteFill style={{ background: "linear-gradient(115deg, transparent 55%, rgba(120,70,255,0.10) 75%, transparent 90%)", pointerEvents: "none" }} />
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------
// R01 · sample set in front of a recording phone · other samples
// ---------------------------------------------------------------------------
export const R01: React.FC = () => {
  const t = useTime();
  const drop = p(t, 0, 0.42, E.out);
  const settle = spr(t, 0.42, 14, 0.5);
  const prodY = mix(-420, 620, drop) + (t > 0.42 ? (1 - settle) * -14 : 0);
  const sample = t < K.cadaProducto ? -1 : t < 1.95 ? 0 : t < 2.5 ? 1 : 2;
  const samples = [
    { src: "ruleta/muestra-boquillas.png", w: 560, x: 260, y: 620, r: -6 },
    { src: "ruleta/muestra-filtros.png", w: 640, x: 220, y: 700, r: 4 },
    { src: "ruleta/muestra-cepillo.png", w: 900, x: 90, y: 760, r: -3 },
  ];
  const push = (t0: number) => mix(1, 1.08, p(t, t0, 0.6, E.linear));
  return (
    <AbsoluteFill>
      {sample < 0 ? (
        <Table>
          <div style={{ position: "absolute", left: 230, top: prodY, width: 620 }}>
            <Photo src="ruleta/aspiradora-cuerpo.png" width={620} />
          </div>
          {/* the phone that is already recording, in the foreground */}
          <div style={{ position: "absolute", left: -60, top: 1020, rotate: "-8deg", filter: "blur(0.5px)" }}>
            <Phone width={460}>
              <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: -220, top: -120, scale: 0.55, transformOrigin: "0 0" }}>
                  <div style={{ width: 1080, height: 1920, position: "relative" }}>
                    <Table>
                      <div style={{ position: "absolute", left: 230, top: prodY, width: 620 }}>
                        <Photo src="ruleta/aspiradora-cuerpo.png" width={620} />
                      </div>
                    </Table>
                  </div>
                </div>
                <div style={{ position: "absolute", top: 70, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(0,0,0,0.5)", borderRadius: 10, padding: "6px 12px", fontFamily: INTER, fontSize: 22, color: "#fff", fontWeight: 700 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 99, background: "#FF3B30", opacity: Math.floor(t * 2.5) % 2 ? 1 : 0.35 }} />
                    00:0{Math.floor(3 + t)}
                  </div>
                </div>
                <div style={{ position: "absolute", bottom: 50, left: "50%", marginLeft: -42, width: 84, height: 84, borderRadius: 99, border: "6px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, background: "#FF3B30" }} />
                </div>
              </div>
            </Phone>
          </div>
        </Table>
      ) : (
        <AbsoluteFill style={{ scale: push([K.cadaProducto, 1.95, 2.5][sample]) }}>
          <Table light={0.8}>
            {samples.map((s, i) =>
              i === sample ? (
                <div key={s.src} style={{ position: "absolute", left: s.x, top: s.y, rotate: `${s.r}deg` }}>
                  <Photo src={s.src} width={s.w} />
                </div>
              ) : null,
            )}
            {/* other opened boxes on the table, out of focus */}
            <div style={{ position: "absolute", left: 680, top: 260, width: 320, height: 240, borderRadius: 12, background: "#B98E5C", boxShadow: "inset 0 -20px 40px rgba(0,0,0,0.25)", filter: "blur(6px)", rotate: "12deg" }} />
            <div style={{ position: "absolute", left: 40, top: 1380, width: 360, height: 260, borderRadius: 12, background: "#E8E2D6", filter: "blur(8px)", rotate: "-8deg" }} />
          </Table>
        </AbsoluteFill>
      )}
      <Accent text="Cada producto" at={K.producto1} y={260} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// R02 · same desk: monitor comparing two takes → the real person at the laptop
// ---------------------------------------------------------------------------
export const R02: React.FC = () => {
  const t = useTime();
  const real = t > 3.78;
  return (
    <AbsoluteFill>
      {!real ? (
        <AbsoluteFill style={{ background: VIOLET_BG }}>
          <Img src={staticFile("ruleta/escritorio-noche.jpg")} style={{ position: "absolute", inset: 0, width: 1080, height: 1920, filter: "blur(22px) brightness(0.6)", scale: 1.15 }} />
          <div style={{ position: "absolute", left: 40, top: 560, width: 1000, padding: 18, borderRadius: 22, background: "#0B0B10", boxShadow: "0 40px 90px rgba(0,0,0,0.6), 0 0 0 2px rgba(255,255,255,0.05)", scale: mix(1, 1.05, p(t, 3.18, 0.6, E.linear)) }}>
            <div style={{ display: "flex", gap: 14 }}>
              {[false, true].map((a, i) => (
                <div key={i} style={{ flex: 1, position: "relative", borderRadius: 10, overflow: "hidden", border: `3px solid ${i ? "#7B97FF" : "transparent"}` }}>
                  <VacuumAd action={a} t={t} width={474} height={842} ui={false} />
                  <div style={{ position: "absolute", left: 12, top: 12, fontFamily: INTER, fontWeight: 800, fontSize: 24, color: "#fff", background: "rgba(0,0,0,0.55)", padding: "6px 12px", borderRadius: 8 }}>TOMA {i ? "B" : "A"}</div>
                </div>
              ))}
            </div>
            <div style={{ height: 34, marginTop: 14, borderRadius: 6, background: "#1A1B22", position: "relative" }}>
              <div style={{ position: "absolute", left: `${mix(10, 70, p(t, 3.18, 0.6, E.linear))}%`, top: 0, bottom: 0, width: 3, background: "#FF3B30" }} />
            </div>
          </div>
        </AbsoluteFill>
      ) : (
        <ClipShot src={CLIPS.anunciosApp} clipStart={1.4} from={3.78} zoom={[1.35, 1.5]} focus={{ x: 640, y: 980 }} dur={0.6} />
      )}
      <Accent text="Cada anuncio" at={K.anuncio1} y={260} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// R03 · over the shoulder: the thumb passes one video and stops on the other
// ---------------------------------------------------------------------------
const PW = 560;
const SH = PW * 2.08 - PW * 0.05;
export const R03: React.FC = () => {
  const t = useTime();
  const swipe = p(t, 5.25, 0.34, E.inOut); // passes the static video
  const rise = p(t, 6.32, 0.38, E.out) * 0.35; // starts swiping again… and stops
  const back = p(t, 6.7, 0.25, E.out) * 0.35;
  const feed = swipe + rise - back;
  const push = p(t, 6.7, 4.4, E.inOut);
  const ghost = p(t, K.otro, 1.6, E.inOut);
  const thumbY = 1080 - swipe * 200 + (swipe >= 1 ? 200 : 0) - (rise - back) * 520;
  return (
    <AbsoluteFill style={{ background: "#07050F" }}>
      <Img src={staticFile("ruleta/escritorio-noche.jpg")} style={{ position: "absolute", inset: 0, width: 1080, height: 1920, filter: "blur(30px) brightness(0.45)", scale: 1.3 }} />
      <AbsoluteFill style={{ scale: mix(1, 1.18, push), transformOrigin: "540px 820px" }}>
        {/* shoulder of the viewer, out of focus */}
        <div style={{ position: "absolute", left: -260, top: 1180, width: 700, height: 1000, borderRadius: "50% 50% 0 0", background: "linear-gradient(160deg, #1B1830, #0A0912)", filter: "blur(18px)" }} />
        <div style={{ position: "absolute", left: 540 - PW / 2, top: 260, rotate: "-3deg" }}>
          <Phone width={PW}>
            <div style={{ position: "absolute", left: 0, top: -feed * SH, width: PW * 0.95 }}>
              <VacuumAd action={false} t={t} width={PW * 0.95} height={SH} />
              <VacuumAd action t={t - 5.4} width={PW * 0.95} height={SH} />
              <VacuumAd action={false} t={t} width={PW * 0.95} height={SH} />
            </div>
          </Phone>
        </div>
        <Thumb x={600} y={thumbY} rot={-24} />
      </AbsoluteFill>
      {/* "the other one goes unnoticed": the static video slides by */}
      {ghost > 0 && ghost < 1 ? (
        <div style={{ position: "absolute", left: 640, top: mix(1300, 200, ghost), opacity: Math.sin(ghost * Math.PI) * 0.85, rotate: "6deg", filter: "grayscale(0.7) blur(1px)" }}>
          <div style={{ borderRadius: 26, overflow: "hidden", border: "4px solid rgba(255,255,255,0.4)" }}>
            <VacuumAd action={false} t={t} width={300} height={533} ui={false} />
          </div>
        </div>
      ) : null}
      <Accent text={"Primer\nsegundo"} at={K.primerSegundo} out={K.otro} y={180} />
      <Accent text="Desapercibido" at={K.desapercibido} out={K.pregunta} y={200} size={92} />
      <Accent text={"¿En cuál sigue\ninvirtiendo\nsemanas después?"} at={K.pregunta} y={170} size={78} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// R04 · index on the trackpad, click on "Sniper Drop" → the real recording
// ---------------------------------------------------------------------------
export const R04: React.FC = () => {
  const t = useTime();
  const press = tw(t, [K.sniperDrop - 0.08, K.sniperDrop], [0, 1]) - tw(t, [K.sniperDrop + 0.05, K.sniperDrop + 0.2], [0, 1]);
  const flash = Math.max(0, 1 - Math.abs(t - K.sniperDrop - 0.03) / 0.08);
  const inClip = t > K.sniperDrop + 0.04;
  const crisp = p(t, 14.45, 0.35, E.inOut);
  return (
    <AbsoluteFill style={{ background: "#08070C" }}>
      {!inClip ? (
        <AbsoluteFill style={{ background: "linear-gradient(180deg, #2B2A33 0%, #1C1B22 60%, #121117 100%)" }}>
          <div style={{ position: "absolute", left: 90, right: 90, top: 520, height: 900, borderRadius: 40, background: "linear-gradient(180deg, #34333D, #26252D)", boxShadow: "inset 0 2px 0 rgba(255,255,255,0.06), inset 0 -30px 60px rgba(0,0,0,0.4)" }} />
          <AbsoluteFill style={{ background: "linear-gradient(120deg, transparent 30%, rgba(124,77,255,0.35) 55%, transparent 75%)", mixBlendMode: "screen" }} />
          <div style={{ position: "absolute", left: 0, top: 0, translate: `0 ${mix(-260, 0, p(t, 13.44, 0.22, E.out)) + press * 40}px`, scale: 1 - press * 0.04 }}>
            <Thumb x={420} y={400} rot={180} />
          </div>
        </AbsoluteFill>
      ) : (
        <>
          <ClipShot src={CLIPS.anunciosApp} clipStart={0.2} from={K.sniperDrop} zoom={[1, 1.55]} focus={{ x: 600, y: 820 }} dur={0.8} />
          <Crisp active="Anuncios" x={760} y={mix(330, 720, p(t, 14.5, 0.8, E.inOut))} s={mix(0.8, 1.25, p(t, 14.4, 0.8, E.inOut))} opacity={crisp}>
            <AdsContent />
          </Crisp>
        </>
      )}
      <AbsoluteFill style={{ background: "#fff", opacity: flash * 0.7 }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 230, display: "flex", justifyContent: "center", opacity: p(t, K.sniperDrop, 0.15) * (1 - p(t, 14.9, 0.3)) }}>
        <div style={{ padding: "18px 28px", borderRadius: 24, background: "rgba(6,6,12,0.75)" }}>
          <Logo width={460} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// R05 · 4 engines + platforms; same laptop, day → night at "las 24 horas"
// ---------------------------------------------------------------------------
const PLAT: { key: "shopify" | "tiktok" | "meta" | "other"; at: number }[] = [
  { key: "shopify", at: K.shopify },
  { key: "tiktok", at: K.tiktok },
  { key: "meta", at: K.meta },
  { key: "other", at: K.otras },
];
const PlatformBadge: React.FC<{ k: "shopify" | "tiktok" | "meta" | "other"; size: number }> = ({ k, size }) =>
  k === "other" ? (
    <div style={{ width: size, height: size, borderRadius: size * 0.22, background: "#141826", border: "3px dashed rgba(150,170,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <IGlobe size={size * 0.5} color="#9FB3FF" />
    </div>
  ) : (
    <PlatformTile platform={k} size={size} />
  );

export const R05: React.FC = () => {
  const t = useTime();
  const pushIn = p(t, K.sus, 0.6, E.in);
  const board = t > K.sus + 0.5;
  const night = t > 20.85;
  const wide = t > K.las24 && !night ? 1 : 0;
  return (
    <AbsoluteFill style={{ background: "#07060D" }}>
      {(!board || wide || night) && (
        <AbsoluteFill style={{ scale: board ? 1 : mix(1, 1.9, pushIn), transformOrigin: "560px 820px" }}>
          <DeskStill night={night ? 1 : 0} />
          {night ? (
            /* the four platforms regrouped on the same screen, at night */
            <div style={{ position: "absolute", left: 140, top: 640, width: 800, display: "flex", justifyContent: "center", gap: 22, flexWrap: "wrap" }}>
              {PLAT.map((pl, i) => (
                <div key={pl.key} style={{ scale: spr(t, 20.85 + i * 0.05, 12, 0.5) }}>
                  <PlatformBadge k={pl.key} size={150} />
                </div>
              ))}
            </div>
          ) : null}
        </AbsoluteFill>
      )}
      {board && !wide && !night ? (
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 35%, #161A33 0%, #0A0B14 70%)" }}>
          {/* engines as published on sniperdrop.com */}
          <div style={{ position: "absolute", left: 40, right: 40, top: 230, display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "center", scale: mix(1, 0.72, p(t, K.recopilan, 0.5, E.inOut)), transformOrigin: "50% 0%" }}>
            {MOTORS.map((m, i) => (
              <div key={m.n} style={{ scale: spr(t, K.motores + i * 0.12, 10, 0.55), opacity: p(t, K.motores + i * 0.12, 0.2) }}>
                <MotorCard motor={m} width={470} active={p(t, K.recopilan + i * 0.1, 0.3)} />
              </div>
            ))}
          </div>
          {/* each platform enters on its name */}
          <div style={{ position: "absolute", left: 0, right: 0, top: 1110, display: "flex", justifyContent: "center", gap: 26 }}>
            {PLAT.map((pl) => {
              const k = spr(t, pl.at - 0.04, 11, 0.5);
              return (
                <div key={pl.key} style={{ scale: Math.min(1.15, k), opacity: Math.min(1, k * 2), translate: `0 ${(1 - Math.min(1, k)) * 60}px` }}>
                  <PlatformBadge k={pl.key} size={200} />
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      ) : null}
      <Accent text="4 motores de IA" at={K.motores} out={K.recopilan + 0.4} y={1150} size={84} />
      <Accent text="24 horas" at={20.85} y={260} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// R06 · choose a country → products for that market → sales data
// ---------------------------------------------------------------------------
export const R06: React.FC = () => {
  const t = useTime();
  const crisp = p(t, 22.25, 0.3, E.inOut);
  const rowsIn = [0, 1, 2, 3, 4, 5].map((i) => p(t, K.productos + i * 0.08, 0.3));
  const toSales = p(t, K.ventas - 0.15, 0.7, E.inOut);
  const clicked = t > K.pais;
  const list = p(t, K.productos - 0.2, 0.5, E.inOut); // pull back to see the products of that market
  const cam = {
    x: mix(mix(mix(560, 420, p(t, 22.25, 0.3)), 845, list), 1210, toSales),
    y: mix(mix(mix(400, 210, p(t, 22.25, 0.3)), 470, list), 520, toSales),
    s: mix(mix(mix(1.0, 2.1, p(t, 22.25, 0.4, E.inOut)), 1.02, list), 2.3, toSales),
  };
  return (
    <AbsoluteFill>
      <ClipShot src={CLIPS.rankings} clipStart={0.2} from={K.eliges} zoom={[1, 1.6]} focus={{ x: 440, y: 860 }} dur={0.6} />
      <Crisp active="Inicio" x={cam.x} y={cam.y} s={cam.s} opacity={crisp}>
        <RankingsContent rowsIn={rowsIn} highlightRow={2} highlight={p(t, K.ventas, 0.4)} />
        {/* selection ring on the country the cursor picks */}
        <div style={{ position: "absolute", left: 79, top: 134, width: 96, height: 48, borderRadius: 99, border: "2px solid #8FA6FF", opacity: clicked ? 1 : 0, boxShadow: "0 0 24px rgba(120,150,255,0.8)" }} />
        {t > 22.0 && t < 23.0 ? <Cursor x={mix(420, 125, p(t, 22.0, 0.38, E.inOut))} y={mix(360, 160, p(t, 22.0, 0.38, E.inOut))} clickAt={K.pais} scale={0.9} /> : null}
      </Crisp>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// R07 · open the product → its ads → the first second of the ad
// ---------------------------------------------------------------------------
export const R07: React.FC = () => {
  const t = useTime();
  const sheet = p(t, 27.15, 0.3, E.inOut);
  const ads = t > K.anuncios;
  const adsCrisp = p(t, 28.3, 0.3, E.inOut);
  const first = t > K.estudias;
  return (
    <AbsoluteFill>
      {!ads ? (
        <>
          <ClipShot src={CLIPS.ficha} clipStart={0.2} from={K.abres} zoom={[1, 1.55]} focus={{ x: 380, y: 860 }} dur={0.5} />
          <Crisp active="Analizar producto" x={mix(700, 900, p(t, 27.2, 0.6, E.inOut))} y={mix(260, 320, p(t, 27.2, 0.6))} s={mix(0.95, 1.45, p(t, 27.15, 0.6, E.inOut))} opacity={sheet}>
            <AnalysisContent />
          </Crisp>
        </>
      ) : !first ? (
        <>
          <ClipShot src={CLIPS.anunciosShowcase} clipStart={2} from={K.anuncios} zoom={[1.2, 1.6]} focus={{ x: 560, y: 900 }} dur={0.4} />
          <Crisp active="Anuncios" x={760} y={mix(640, 760, p(t, 28.3, 1.2, E.inOut))} s={1.25} opacity={adsCrisp}>
            <AdsContent />
          </Crisp>
        </>
      ) : (
        <AbsoluteFill>
          <VacuumAd action t={t - K.estudias} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 200, height: 8, background: "rgba(255,255,255,0.3)" }}>
            <div style={{ width: `${Math.min(100, ((t - K.estudias) / 2.7) * 100)}%`, height: "100%", background: "#fff" }} />
          </div>
          <div style={{ position: "absolute", left: 40, top: 200, fontFamily: INTER, fontWeight: 800, fontSize: 44, color: "#fff", background: "rgba(0,0,0,0.55)", padding: "10px 18px", borderRadius: 12 }}>
            0:0{Math.min(1, Math.floor((t - K.estudias) / 1.35))}
          </div>
          <Accent text={"Primer\nsegundo"} at={K.primerSegundo2} y={330} />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// R08 · suppliers → calculator, slowed down on the result
// ---------------------------------------------------------------------------
export const R08: React.FC = () => {
  const t = useTime();
  const crisp = p(t, 33.45, 0.3, E.inOut);
  const calc = t > K.calculas;
  const result = p(t, K.cuanto, 0.35, E.out);
  return (
    <AbsoluteFill>
      {!calc ? (
        <>
          <ClipShot src={CLIPS.proveedores} clipStart={0.4} from={K.despues} zoom={[1, 1.5]} focus={{ x: 420, y: 860 }} dur={0.6} />
          <Crisp active="Analizar producto" x={752} y={mix(140, 240, p(t, 33.5, 1, E.inOut))} s={1.25} opacity={crisp}>
            <SuppliersContent />
          </Crisp>
        </>
      ) : (
        <Crisp active="Calculadora" x={930} y={mix(380, 440, p(t, K.calculas, 1.5, E.inOut))} s={1.45} opacity={1}>
          <CalculatorContent focus={t < K.cuanto - 0.1 ? 2 : 0} pressed={tw(t, [K.cuanto - 0.12, K.cuanto - 0.04], [0, 1]) - tw(t, [K.cuanto, K.cuanto + 0.1], [0, 1])} />
        </Crisp>
      )}
      {calc ? (
        <div style={{ position: "absolute", left: 70, right: 70, top: 1080, opacity: result, scale: mix(0.9, 1, result), padding: "28px 34px", borderRadius: 28, background: "rgba(17,19,25,0.97)", border: "2px solid rgba(123,151,255,0.75)", boxShadow: "0 0 70px rgba(91,123,255,0.45)", fontFamily: INTER }}>
          <div style={{ fontSize: 30, color: UI.sub }}>Margen por unidad</div>
          <div style={{ fontFamily: SORA, fontSize: 120, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.05 }}>{eur(calcMargin())}</div>
          <div style={{ fontSize: 24, color: UI.sub, marginTop: 6 }}>
            {eur(CALC.price)} − {eur(CALC.cost)} − {eur(CALC.ship)} − {CALC.fee}% comisiones · sin publicidad
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// R09 · product / country / creative · roulette · logo
// ---------------------------------------------------------------------------
const POCKETS = 37;
const Roulette: React.FC<{ t: number }> = ({ t }) => {
  const T = 42.34; // the ball lands on red on "ganar"
  const R = 1250;
  const cx = 540;
  const cy = 2150;
  const step = 360 / POCKETS;
  const theta = (u: number) => (u - 40.9) * 26; // wheel turns slowly clockwise
  const kRed = 1;
  const offset = -90 - (theta(T) + kRed * step + step / 2);
  const pocketAngle = (u: number) => theta(u) + offset + kRed * step + step / 2;
  const landed = t >= T;
  const left = Math.max(0, T - t);
  // the ball rolls in along the visible rim (counter-clockwise) and drops into the pocket
  const phi = landed ? pocketAngle(t) : -90 - left * 18 - Math.pow(left, 2) * 4;
  const dropK = Math.min(1, Math.max(0, 1 - left / 0.45));
  const rBall = landed ? R - 170 : mix(R - 40, R - 170, dropK * dropK) + Math.abs(Math.sin(left * 22)) * 22 * dropK * (1 - dropK) * 4;
  const bx = cx + Math.cos((phi * Math.PI) / 180) * rBall;
  const by = cy + Math.sin((phi * Math.PI) / 180) * rBall;
  const settle = landed ? Math.max(0, 1 - (t - T) / 0.25) : 0;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 35%, #3A1A12 0%, #0E0705 75%)", scale: mix(1, 1.08, p(t, 40.94, 1.6, E.inOut)), transformOrigin: "540px 1180px" }}>
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="ball" cx="0.35" cy="0.3" r="0.8">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="0.6" stopColor="#E6E3DE" />
            <stop offset="1" stopColor="#8C8780" />
          </radialGradient>
          <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#4A2A16" />
            <stop offset="0.5" stopColor="#8A5530" />
            <stop offset="1" stopColor="#4A2A16" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={R + 90} fill="url(#rim)" />
        <circle cx={cx} cy={cy} r={R + 20} fill="#1E0F09" />
        <g transform={`rotate(${theta(t) + offset} ${cx} ${cy})`}>
          {new Array(POCKETS).fill(0).map((_, i) => {
            const a0 = (i * step * Math.PI) / 180;
            const a1 = ((i + 1) * step * Math.PI) / 180;
            const ro = R - 80;
            const ri = R - 300;
            const pt = (r: number, a: number) => `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
            const fill = i === 0 ? "#0E7A3B" : i % 2 ? "#B3121C" : "#141414";
            return <path key={i} d={`M${pt(ri, a0)} L${pt(ro, a0)} A${ro} ${ro} 0 0 1 ${pt(ro, a1)} L${pt(ri, a1)} A${ri} ${ri} 0 0 0 ${pt(ri, a0)} Z`} fill={fill} stroke="#D8B66A" strokeWidth={5} />;
          })}
          <circle cx={cx} cy={cy} r={R - 300} fill="#5A3520" />
        </g>
        {/* gloss on the wooden rim */}
        <path d={`M ${cx - R} ${cy - 160} A ${R + 60} ${R + 60} 0 0 1 ${cx + R} ${cy - 160}`} fill="none" stroke="rgba(255,220,170,0.18)" strokeWidth={18} />
        <ellipse cx={bx + 10} cy={by + 16} rx={34} ry={18} fill="rgba(0,0,0,0.55)" />
        <circle cx={bx} cy={by - settle * 10} r={34} fill="url(#ball)" style={{ filter: landed ? undefined : "blur(1.2px)" }} />
      </svg>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(14,7,5,0.95) 0%, rgba(14,7,5,0) 40%, rgba(14,7,5,0) 75%, rgba(14,7,5,0.7) 100%)" }} />
    </AbsoluteFill>
  );
};

export const R09: React.FC = () => {
  const t = useTime();
  const recap = t < K.mercado ? 0 : t < K.creativo ? 1 : t < K.apostar ? 2 : 3;
  const end = t >= K.ganar + 0.03;
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {end ? (
        <AbsoluteFill style={{ background: "#000", alignItems: "center", justifyContent: "center" }}>
          <div style={{ scale: mix(0.92, 1, p(t, K.ganar, 0.4, E.out)) }}>
            <Logo width={780} />
          </div>
        </AbsoluteFill>
      ) : recap === 0 ? (
        <AbsoluteFill style={{ scale: mix(1.05, 1.15, p(t, K.asi, 1.8, E.linear)) }}>
          <Table>
            <div style={{ position: "absolute", left: 230, top: 620, width: 620 }}>
              <Photo src="ruleta/aspiradora-cuerpo.png" width={620} />
            </div>
          </Table>
        </AbsoluteFill>
      ) : recap === 1 ? (
        <Crisp active="Inicio" x={420} y={210} s={2.6}>
          <RankingsContent />
          <div style={{ position: "absolute", left: 79, top: 134, width: 96, height: 48, borderRadius: 99, border: "2px solid #8FA6FF", boxShadow: "0 0 24px rgba(120,150,255,0.8)" }} />
        </Crisp>
      ) : recap === 2 ? (
        <VacuumAd action t={0.05} />
      ) : (
        <Roulette t={t} />
      )}
    </AbsoluteFill>
  );
};

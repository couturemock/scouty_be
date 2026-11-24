import React from "react";
import { AbsoluteFill } from "remotion";
import { E, env, eur, mix, p, spr, useTime } from "../../animations/clock";
import { DarkBg, DemoTag, RiseText } from "../../components/primitives";
import { Float25D } from "../../components/Camera";
import { IArrowUR, IMegaphone } from "../../components/Icons";
import { CALC, calcMargin, CalculatorForm, SupplierRow, UI } from "../../components/ui/DropSniperUI";
import { PlatformTile, TrendChart } from "../components44";
import { Chopper, CatFish, DogBottle, PRODUCT_CATEGORY, PRODUCT_NAMES, ProductKind, ProductTile44 } from "../products44";
import { FacebookAdView, TikTokAdView } from "../creatives44";
import { C, INTER } from "../../styles/theme";
import { V } from "../timeline44";

// carousel: chopper → dog bottle → cat fish (each one enlarged when centred)
const CAROUSEL: { kind: ProductKind; at: number }[] = [
  { kind: "chopper", at: 8.8 },
  { kind: "dogbottle", at: 9.6 },
  { kind: "catfish", at: 10.35 },
];

// "Creativos que funcionan" timing (provisional timeline, see timeline44.ts)
const PANEL_IN = 11.15;
const TT_ZOOM = 11.95; // TikTok logo expands into the TikTok view
const TT_IN = 12.2;
const META_POP = 13.95; // Meta logo appears over the TikTok view
const META_ZOOM = 14.2;
const META_IN = 14.42;
const VIEWS_OUT = 16.05;

const SUPPLIER_LABELS = [
  "Cortador de verduras a presión — Buscar en Alibaba",
  "Cortador de verduras a presión — Buscar wholesale Alibaba",
  "Cortador de verduras a presión — Buscar OEM Alibaba",
];

const BigProduct: React.FC<{ kind: ProductKind; t: number }> = ({ kind, t }) => {
  if (kind === "chopper") return <Chopper size={460} press={0.15 + Math.sin(t * 4) * 0.1} dice={1} />;
  if (kind === "dogbottle") return <DogBottle height={470} bowl={0.7} level={0.6} t={t} />;
  return <CatFish size={480} wag={Math.sin(t * 9)} />;
};

export const A3Modules: React.FC = () => {
  const t = useTime();

  // ---- module windows ---------------------------------------------------
  const m1 = env(t, 8.75, PANEL_IN + 0.15, 0.4, 0.3);
  const panel = env(t, PANEL_IN, TT_IN + 0.05, 0.4, 0.15);
  const tt = env(t, TT_IN - 0.1, META_ZOOM + 0.15, 0.15, 0.2);
  const meta = env(t, META_IN - 0.08, VIEWS_OUT + 0.15, 0.15, 0.25);
  const m4 = env(t, V.proveedores - 0.1, V.precios + 0.1, 0.4, 0.3);
  const m5 = p(t, V.precios - 0.05, 0.5);
  const exit = p(t, 18.45, 0.3, E.in);

  // ---- M1 carousel ------------------------------------------------------
  const slot = CAROUSEL.reduce((a, c, i) => a + (i === 0 ? 0 : p(t, c.at - 0.25, 0.45, E.inOut)), 0); // 0..2
  const chart = p(t, 10.5, 0.7, E.inOut);

  // ---- logo transitions -------------------------------------------------
  const ttZoom = p(t, TT_ZOOM, 0.32, E.in);
  const metaPop = spr(t, META_POP, 10, 0.55);
  const metaZoom = p(t, META_ZOOM, 0.28, E.in);

  // ---- M4 / M5 ----------------------------------------------------------
  const rows = [0, 1, 2].map((i) => spr(t, V.proveedores + i * 0.1, 9, 0.6));
  const flip = p(t, V.precios, 0.6, E.out);
  const result = p(t, V.margenes + 0.15, 0.5, E.out);

  const current = CAROUSEL[Math.min(2, Math.round(slot))].kind;

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <DarkBg glowY={55} />

      {/* ---------- M1 · products taking off (carousel) ---------- */}
      <AbsoluteFill style={{ opacity: m1 }}>
        {CAROUSEL.map((c, i) => {
          const d = i - slot; // -1 left, 0 centre, +1 right
          const centre = Math.max(0, 1 - Math.abs(d));
          const k = spr(t, 8.75 + i * 0.08, 8, 0.6);
          return (
            <div
              key={c.kind}
              style={{
                position: "absolute",
                left: 540 + d * 560,
                top: 900,
                translate: "-50% -50%",
                scale: mix(0.62, 1.12, centre) * Math.min(1, k),
                opacity: Math.min(1, k * 2) * mix(0.45, 1, centre),
                zIndex: Math.round(centre * 10),
              }}
            >
              <div style={{ width: 640, padding: 28, borderRadius: 40, background: "#12151E", border: `2px solid rgba(123,151,255,${0.15 + 0.65 * centre})`, boxShadow: `0 30px 70px rgba(0,0,0,0.5), 0 0 ${70 * centre}px rgba(91,123,255,${0.45 * centre})`, fontFamily: INTER }}>
                <div style={{ height: 520, borderRadius: 28, background: "radial-gradient(circle at 50% 42%, #FFFFFF 0%, #E9EDF4 100%)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <BigProduct kind={c.kind} t={t} />
                </div>
                <div style={{ fontSize: 36, fontWeight: 700, color: "#fff", marginTop: 22 }}>{PRODUCT_NAMES[c.kind]}</div>
                <div style={{ fontSize: 26, color: C.muted, marginTop: 6 }}>{PRODUCT_CATEGORY[c.kind]}</div>
              </div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 540, top: 1360, translate: "-50% 0", opacity: chart * (current === "catfish" ? 1 : 0), scale: 0.92 + chart * 0.08 }}>
          <TrendChart width={760} height={150} progress={chart} title="Tracción" />
        </div>
      </AbsoluteFill>

      {/* ---------- Sniper Drop · ads panel with the platform logos ---------- */}
      <AbsoluteFill style={{ opacity: panel }}>
        <div style={{ position: "absolute", left: 70, right: 70, top: 560, padding: "34px 36px", borderRadius: 34, background: UI.card, border: `1.5px solid ${UI.border2}`, fontFamily: INTER, boxShadow: "0 40px 80px rgba(0,0,0,0.5)" }}>
          <div style={{ fontSize: 22, letterSpacing: "0.14em", color: UI.accent, fontWeight: 600, display: "flex", alignItems: "center", gap: 10 }}>
            <IMegaphone size={24} color={UI.accent} /> ANUNCIOS
          </div>
          <div style={{ fontSize: 44, fontWeight: 600, color: "#fff", marginTop: 12, letterSpacing: "-0.02em" }}>Cómo se anuncia en TikTok y Meta</div>
          <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 28, padding: 18, borderRadius: 22, background: "rgba(255,255,255,0.03)", border: `1px solid ${UI.border}` }}>
            <ProductTile44 kind="dogbottle" size={130} t={t} />
            <div>
              <div style={{ fontSize: 32, fontWeight: 600, color: "#fff" }}>{PRODUCT_NAMES.dogbottle}</div>
              <div style={{ fontSize: 24, color: UI.sub, marginTop: 6 }}>2 creativos de ejemplo · TikTok y Meta</div>
            </div>
          </div>
        </div>
        {/* platform logos: each one opens its ad view */}
        <div style={{ position: "absolute", left: 300, top: 1250, translate: "-50% -50%", scale: mix(1, 9, ttZoom), opacity: 1, zIndex: 5 }}>
          <PlatformTile platform="tiktok" size={260} glow={p(t, PANEL_IN + 0.3, 0.3)} />
        </div>
        <div style={{ position: "absolute", left: 780, top: 1250, translate: "-50% -50%", opacity: 1 - ttZoom }}>
          <PlatformTile platform="meta" size={260} />
        </div>
      </AbsoluteFill>

      {/* ---------- TikTok Shop view (full width) ---------- */}
      {tt > 0 ? (
        <AbsoluteFill style={{ opacity: tt }}>
          <TikTokAdView lt={Math.max(0, t - TT_IN + 0.12)} tagK={p(t, TT_IN + 0.45, 0.45, E.out)} />
          {/* Meta logo pops over the TikTok view, then expands */}
          {t > META_POP - 0.05 ? (
            <>
              <AbsoluteFill style={{ background: `rgba(6,8,15,${0.6 * Math.min(1, metaPop)})` }} />
              <div style={{ position: "absolute", left: 540, top: 960, translate: "-50% -50%", scale: Math.min(1.1, metaPop) * mix(1, 9, metaZoom) }}>
                <PlatformTile platform="meta" size={260} glow={1 - metaZoom} />
              </div>
            </>
          ) : null}
        </AbsoluteFill>
      ) : null}

      {/* ---------- Facebook (Meta) view (full width) ---------- */}
      {meta > 0 ? (
        <AbsoluteFill style={{ opacity: meta }}>
          <FacebookAdView lt={Math.max(0, t - META_IN + 0.1)} tagK={p(t, META_IN + 0.4, 0.45, E.out)} />
        </AbsoluteFill>
      ) : null}

      {/* ---------- M4 · suppliers ---------- */}
      <AbsoluteFill style={{ opacity: m4 }}>
        {SUPPLIER_LABELS.map((r, i) => (
          <Float25D key={r} x={mix(1500, 540, rows[i])} y={720 + i * 190} scale={1.5} rotY={mix(-30, -3, rows[i])} lift={0.6}>
            <div style={{ width: 640, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", fontFamily: INTER, color: UI.text }}>
              <SupplierRow label={r} style={{ borderBottom: "none" }} />
            </div>
          </Float25D>
        ))}
        <div style={{ position: "absolute", top: 1300, left: 100, right: 140, fontFamily: INTER, fontSize: 30, color: C.muted, lineHeight: 1.45, opacity: rows[2] }}>
          Alibaba y AliExpress, comparados por precio y envío. <IArrowUR size={26} color={C.blueBright} />
        </div>
      </AbsoluteFill>

      {/* ---------- M5 · prices & margins ---------- */}
      <AbsoluteFill style={{ opacity: m5 }}>
        <Float25D x={540} y={mix(980, 860, result)} scale={1.45} rotY={mix(60, 0, flip)} lift={flip}>
          <div style={{ fontFamily: INTER, color: UI.text }}>
            <CalculatorForm focus={result > 0 ? 0 : 2} />
          </div>
        </Float25D>
        <div style={{ position: "absolute", left: 540, top: mix(1420, 1380, result), translate: "-50% -50%", opacity: result, fontFamily: INTER }}>
          <div style={{ width: 880, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "26px 34px", borderRadius: 26, background: UI.card, border: "2px solid rgba(110,140,255,0.55)", boxShadow: "0 0 50px rgba(91,123,255,0.3)" }}>
            <div>
              <div style={{ fontSize: 26, color: C.muted }}>Margen por unidad</div>
              <div style={{ fontSize: 20, color: C.muted2, marginTop: 6 }}>{eur(CALC.price)} − coste − envío − comisiones</div>
            </div>
            <div style={{ fontFamily: "Sora", fontSize: 64, fontWeight: 700, color: "#fff" }}>{eur(calcMargin())}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
            <DemoTag label="Cálculo de ejemplo · antes de publicidad" />
          </div>
        </div>
      </AbsoluteFill>

      {/* ---------- module headline (hidden while an ad view fills the frame) ---------- */}
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: 1 - Math.max(tt, meta) }}>
        {t < PANEL_IN ? <RiseText text={"Productos que\nempiezan a despegar"} at={V.productos - 0.25} out={PANEL_IN - 0.3} size={74} color="#fff" highlight={["despegar"]} highlightColor={C.blueSoft} /> : null}
        {t >= PANEL_IN - 0.05 && t < TT_IN ? <RiseText text={"Anuncios donde otros\nya están invirtiendo"} at={PANEL_IN} size={70} color="#fff" highlight={["invirtiendo"]} highlightColor={C.blueSoft} /> : null}
        {t >= V.proveedores - 0.05 && t < V.precios ? <RiseText text="Proveedores" at={V.proveedores - 0.05} out={V.precios - 0.2} size={84} color="#fff" /> : null}
        {t >= V.precios - 0.05 ? <RiseText text={"Precios y\nmárgenes"} at={V.precios - 0.05} size={84} color="#fff" highlight={["márgenes"]} highlightColor={C.blueSoft} /> : null}
      </div>
    </AbsoluteFill>
  );
};

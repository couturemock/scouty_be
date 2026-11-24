import React from "react";
import { AbsoluteFill } from "remotion";
import { E, mix, p, spr, useTime } from "../../animations/clock";
import { Cursor, DarkBg, DemoTag, RiseText } from "../../components/primitives";
import { Float25D } from "../../components/Camera";
import { AppShell, CustomRankRow, GradButton, RankingsContent, UI, UICard } from "../../components/ui/DropSniperUI";
import { IArrowUR } from "../../components/Icons";
import { AdCreative, Laptop } from "../components44";
import { CatFish, PRODUCT_CATEGORY, PRODUCT_NAMES, ProductTile44 } from "../products44";
import { C, INTER } from "../../styles/theme";
import { V } from "../timeline44";

const SCREEN_W = 800;
const BEZEL = SCREEN_W * 0.022;
const LEFT = (1080 - (SCREEN_W + BEZEL * 2)) / 2;
const TOP = 700;
const K = SCREEN_W / 1440;
const FOCUS = { x: LEFT + BEZEL + 840 * K, y: TOP + BEZEL * 1.2 + 470 * K };

const Skel: React.FC<{ w: number; h?: number }> = ({ w, h = 18 }) => <div style={{ width: w, height: h, borderRadius: 6, background: "rgba(255,255,255,0.12)" }} />;

/** Product sheet layout of the real app, filled with the cat toy. Figures masked: no real data for this product. */
const CatSheet: React.FC<{ t: number }> = ({ t }) => (
  <div>
    <div style={{ fontSize: 12.5, color: UI.sub }}>← Panel</div>
    <div style={{ display: "flex", gap: 28, marginTop: 24 }}>
      <ProductTile44 kind="catfish" size={190} t={t} style={{ border: `1px solid ${UI.border2}` }} />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11, color: UI.sub }}>
          <span style={{ border: `1px solid ${UI.border2}`, borderRadius: 6, padding: "2px 7px" }}>ES</span>
          {PRODUCT_CATEGORY.catfish}
        </div>
        <div style={{ fontSize: 31, fontWeight: 600, lineHeight: 1.12, letterSpacing: "-0.015em", marginTop: 10 }}>{PRODUCT_NAMES.catfish}</div>
        <UICard style={{ display: "flex", padding: "22px 24px", marginTop: 20, gap: 30 }}>
          {["Precio", "Valoración", "BSR", "Ventas / mes"].map((k) => (
            <div key={k} style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, color: UI.sub }}>{k}</div>
              <div style={{ marginTop: 10 }}>
                <Skel w={90} h={22} />
              </div>
            </div>
          ))}
        </UICard>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <GradButton>
            Ver producto <IArrowUR size={13} color="#fff" />
          </GradButton>
          <div style={{ fontSize: 13, fontWeight: 600, borderRadius: 9, padding: "10px 16px", border: `1px solid ${UI.border2}`, color: "#C3C8D3" }}>Guardar en watchlist</div>
        </div>
      </div>
    </div>
  </div>
);

const CUSTOM_ROWS: CustomRankRow[] = (["chopper", "catfish", "dogbottle"] as const).map((k) => ({
  name: PRODUCT_NAMES[k],
  sub: PRODUCT_CATEGORY[k],
  thumb: <ProductTile44 kind={k} size={56} />,
}));

export const A6Analyze: React.FC = () => {
  const t = useTime();
  const rise = p(t, 33.6, 0.6, E.out);
  const zoom = p(t, 34.0, 0.7, E.inOut);
  const clickAt = V.senales + 0.15;
  const opened = t > clickAt + 0.2;
  const sheet = p(t, clickAt + 0.2, 0.4, E.out);
  const lift = spr(t, V.analizar, 8, 0.6);
  const creative = spr(t, V.analizar + 0.35, 8, 0.6);
  const hl = p(t, V.funcionando, 0.4);
  const exit = p(t, 37.15, 0.3, E.in);

  const sc = mix(1, 1.95, zoom);
  const ty = mix(0, 900 - FOCUS.y, zoom);
  const tx = mix(0, 540 - FOCUS.x, zoom);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <DarkBg glowY={55} />
      <AbsoluteFill style={{ perspective: 2200, opacity: 1 - lift * 0.85, filter: `blur(${lift * 6}px)` }}>
        <div
          style={{
            position: "absolute",
            left: LEFT,
            top: TOP + (1 - rise) * -500,
            transformOrigin: `${FOCUS.x - LEFT}px ${FOCUS.y - TOP}px`,
            transform: `translate(${tx}px, ${ty}px) scale(${sc}) rotateX(${mix(-20, 4, rise) * (1 - zoom)}deg)`,
            opacity: rise,
          }}
        >
          <Laptop width={SCREEN_W} deck={1 - zoom}>
            {opened ? (
              <div style={{ opacity: sheet }}>
                <AppShell active="Analizar producto" height={900} style={{ borderRadius: 0, border: "none" }}>
                  <CatSheet t={t} />
                </AppShell>
              </div>
            ) : (
              <AppShell active="Inicio" height={900} style={{ borderRadius: 0, border: "none" }}>
                <RankingsContent highlightRow={1} highlight={p(t, clickAt - 0.3, 0.3)} custom={CUSTOM_ROWS} />
              </AppShell>
            )}
          </Laptop>
        </div>
      </AbsoluteFill>

      {t > V.senales - 0.5 && t < clickAt + 0.5 ? (
        <Cursor x={mix(880, 600, p(t, V.senales - 0.45, 0.45, E.inOut))} y={mix(1500, FOCUS.y + 10, p(t, V.senales - 0.45, 0.45, E.inOut))} clickAt={clickAt} scale={1.4} opacity={1 - p(t, clickAt + 0.3, 0.2)} />
      ) : null}

      {/* the cat toy's sheet lifted out of the screen */}
      <Float25D x={540} y={mix(1000, 820, lift)} scale={mix(0.8, 1, lift)} rotX={mix(20, 4, lift)} lift={lift} opacity={Math.min(1, lift * 2)}>
        <div style={{ width: 900, display: "flex", gap: 26, alignItems: "center", padding: 26, borderRadius: 30, background: "#121520", border: `2px solid rgba(110,140,255,${0.3 + hl * 0.5})`, boxShadow: `0 0 ${50 * hl}px rgba(91,123,255,0.45)`, fontFamily: INTER }}>
          <div style={{ width: 200, height: 200, borderRadius: 24, background: "radial-gradient(circle at 50% 40%, #fff 0%, #EEF1F6 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CatFish size={190} wag={Math.sin(t * 9)} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 22, letterSpacing: "0.14em", color: "#9FB3FF", fontWeight: 700 }}>FICHA DEL PRODUCTO</div>
            <div style={{ fontSize: 34, color: "#fff", fontWeight: 600, marginTop: 8, lineHeight: 1.15 }}>{PRODUCT_NAMES.catfish}</div>
            <div style={{ display: "flex", gap: 18, marginTop: 16 }}>
              {["Precio", "Demanda", "Anuncios"].map((k) => (
                <div key={k}>
                  <div style={{ fontSize: 20, color: C.muted }}>{k}</div>
                  <div style={{ marginTop: 8 }}>
                    <Skel w={110} h={20} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Float25D>
      {/* creative of the SAME product */}
      <Float25D x={540} y={mix(1500, 1330, creative)} scale={mix(0.8, 1, creative)} rotX={mix(20, 4, creative)} lift={creative} opacity={Math.min(1, creative * 2)}>
        <div style={{ display: "flex", alignItems: "center", gap: 26, fontFamily: INTER }}>
          <AdCreative width={200} hook="Tu gato no va a parar" hue={25} highlight={hl} platform="TikTok" product={<div style={{ background: "rgba(255,255,255,0.92)", borderRadius: 20, padding: 6 }}><CatFish size={150} wag={Math.sin(t * 9)} /></div>} />
          <div style={{ width: 420 }}>
            <div style={{ fontSize: 22, letterSpacing: "0.14em", color: "#9FB3FF", fontWeight: 700 }}>CREATIVO DEL MISMO PRODUCTO</div>
            <div style={{ fontSize: 30, color: "#fff", fontWeight: 600, marginTop: 8, lineHeight: 1.25 }}>Compáralo con otros anuncios antes de invertir</div>
            <DemoTag label="Recreación · cifras ocultas" style={{ display: "inline-block", marginTop: 14 }} />
          </div>
        </div>
      </Float25D>

      <div style={{ position: "absolute", top: 240, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <RiseText text={"Decide\ncon datos"} at={V.tu - 0.05} size={92} color="#fff" highlight={["datos"]} highlightColor={C.blueSoft} />
      </div>
    </AbsoluteFill>
  );
};

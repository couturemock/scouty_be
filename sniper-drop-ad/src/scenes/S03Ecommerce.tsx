import React from "react";
import { AbsoluteFill } from "remotion";
import { E, env, mix, p, spr, tw, useTime } from "../animations/clock";
import { Pill, RiseText, StudioBg } from "../components/primitives";
import { ICheck, IFactory, IHomeUser, IStar } from "../components/Icons";
import { Bottle, BrandMark, Box3D } from "../components/product/Products";
import { C, INTER, SORA } from "../styles/theme";
import { VO } from "../timeline";

const SupplierCard: React.FC<{ name: string; rating: number; selected: number; k: number }> = ({ name, rating, selected, k }) => (
  <div
    style={{
      width: 280,
      padding: "26px 24px",
      borderRadius: 28,
      background: "#fff",
      border: `3px solid ${selected > 0.5 ? C.blue : "rgba(13,19,36,0.06)"}`,
      boxShadow: `0 ${20 + selected * 20}px ${50 + selected * 30}px rgba(13,19,36,${0.1 + selected * 0.1})`,
      fontFamily: INTER,
      opacity: k,
      translate: `0 ${(1 - k) * 60 - selected * 18}px`,
      position: "relative",
    }}
  >
    <IFactory size={46} color={selected > 0.5 ? C.blue : C.studioInk} />
    <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 30, color: C.studioInk, marginTop: 14 }}>{name}</div>
    <div style={{ display: "flex", gap: 4, marginTop: 10 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <IStar key={i} size={24} color={i < rating ? "#F5B544" : "#DDE2EC"} />
      ))}
    </div>
    {selected > 0 ? (
      <div style={{ position: "absolute", top: -22, right: -18, width: 58, height: 58, borderRadius: 99, background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", scale: selected, boxShadow: "0 10px 24px rgba(58,99,216,0.5)" }}>
        <ICheck size={34} color="#fff" stroke={3} />
      </div>
    ) : null}
  </div>
);

const Label: React.FC<{ text: string; k: number }> = ({ text, k }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: 1450,
      textAlign: "center",
      fontFamily: SORA,
      fontWeight: 800,
      fontSize: 60,
      letterSpacing: "-0.01em",
      color: C.studioInk,
      opacity: k,
      translate: `0 ${(1 - k) * 30}px`,
      filter: `blur(${(1 - k) * 6}px)`,
    }}
  >
    {text}
  </div>
);

export const S03Ecommerce: React.FC = () => {
  const t = useTime();

  // spin-in transition from scene 2
  const spinIn = p(t, 20.7, 1.1, E.out);
  const sup = p(t, VO.supplier - 0.1, 0.6);
  const supOut = p(t, VO.brand - 0.1, 0.5, E.in);
  const selected = spr(t, VO.supplier + 0.7, 10, 0.5);
  const units = p(t, VO.units, 0.7, E.out);
  const unitsBack = p(t, VO.brand, 0.6, E.inOut);
  const heroZoom = p(t, VO.bottle - 0.3, 0.9, E.inOut);
  const brand = p(t, VO.logo + 0.15, 0.7, E.inOut);
  const pack = p(t, VO.packaging - 0.1, 0.7, E.inOut); // box arrives, bottle moves aside
  const insert = p(t, 31.0, 0.9, E.inOut); // bottle drops into box
  const lidClose = p(t, 32.0, 0.6, E.inOut);
  const stock = p(t, VO.stock - 0.15, 0.9, E.inOut);
  const ship = tw(t, [VO.experience + 0.1, 36.6], [0, 1], E.inOut);
  const exit = p(t, 37.35, 0.4, E.in);

  // ----- hero bottle transform --------------------------------------------
  let bH = mix(600, 640, spinIn);
  let bX = 540;
  let bY = mix(1150, 930, spinIn);
  // make room for suppliers
  bY -= 120 * sup * (1 - supOut);
  bH -= 80 * sup * (1 - supOut);
  // zoom for "esta botella"
  bH = mix(bH, 820, heroZoom);
  bY = mix(bY, 960, heroZoom);
  // move aside for the packaging
  bH = mix(bH, 520, pack);
  bX = mix(bX, 360, pack);
  bY = mix(bY, 880, pack);
  // drop into box
  bX = mix(bX, 680, insert);
  bY = mix(bY, mix(720, 1120, p(t, 31.35, 0.55, E.in)), insert);
  bH = mix(bH, 440, insert);
  const angle = mix(-300, 0, spinIn) + Math.sin(t * 0.9) * 22 + tw(t, [VO.bottle, VO.packaging], [0, 360], E.inOut);
  const bottleVisible = insert < 1 || t < 31.9;

  // ----- box transform -------------------------------------------------------
  const boxX = mix(mix(1300, 690, pack), 540, stock);
  const boxS = mix(1, 0.42, stock);
  const boxY = mix(1010, 900, stock);
  const lid = mix(1, 0, lidClose) * (pack > 0 ? 1 : 0);
  const boxRy = mix(-34, -24, lidClose);

  // scan line for logo application
  const scan = tw(t, [VO.logo, VO.logo + 0.8], [0, 1], E.inOut);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <StudioBg spotY={48} />

      {/* Title */}
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, display: "flex", justifyContent: "center", scale: mix(1, 0.8, sup), transformOrigin: "50% 0%" }}>
        <RiseText text="E-commerce con stock" at={VO.ecomTitle} size={78} color={C.studioInk} highlight={["stock"]} highlightColor={C.coral} />
      </div>

      {/* Demand chip */}
      <div style={{ position: "absolute", top: 420, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: env(t, VO.demand, VO.supplier + 0.2, 0.5, 0.4) }}>
        <Pill size={34}>
          <svg width={70} height={36} viewBox="0 0 70 36">
            <path d="M2 32 L18 24 L30 27 L46 14 L66 4" fill="none" stroke={C.green} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="90" strokeDashoffset={90 * (1 - p(t, VO.demand + 0.2, 0.8))} />
          </svg>
          Producto con demanda
        </Pill>
      </div>

      {/* Units (bought stock) fanned behind the hero */}
      {units > 0 && unitsBack < 1
        ? [-3, -2, -1, 1, 2, 3].map((i) => {
            const k = Math.min(1, Math.max(0, units * 1.4 - Math.abs(i) * 0.12)) * (1 - unitsBack);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 540 + i * 135 * k - 60,
                  top: mix(1380, 640 + Math.abs(i) * 30, k),
                  opacity: Math.min(1, k * 2),
                  scale: 0.9 - Math.abs(i) * 0.05,
                  zIndex: 1,
                }}
              >
                <Bottle height={360} angle={i * 20} shadow={false} />
              </div>
            );
          })
        : null}
      <div style={{ position: "absolute", top: 1180, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: env(t, VO.units + 0.2, VO.brand + 0.2, 0.4, 0.3), zIndex: 3 }}>
        <Pill size={32} bg={C.studioInk} color="#fff" border={C.studioInk}>
          Compras unidades
        </Pill>
      </div>

      {/* Hero bottle */}
      {bottleVisible ? (
        <div style={{ position: "absolute", left: bX, top: bY, translate: "-50% -50%", zIndex: 2, opacity: Math.min(1, spinIn * 3) }}>
          <div style={{ position: "relative" }}>
            <Bottle height={bH} angle={angle} brand={brand} />
            {/* scan beam applying the logo */}
            {scan > 0 && scan < 1 ? (
              <div
                style={{
                  position: "absolute",
                  left: -40,
                  right: -40,
                  top: `${mix(100, 10, scan)}%`,
                  height: 6,
                  background: C.blueBright,
                  boxShadow: `0 0 30px 10px rgba(79,123,255,0.55)`,
                  borderRadius: 6,
                }}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Brand mark flying onto the bottle */}
      {t > VO.logo - 0.6 && brand < 1 ? (
        <div
          style={{
            position: "absolute",
            left: mix(840, bX, p(t, VO.logo - 0.4, 0.6, E.inOut)),
            top: mix(520, bY + 40, p(t, VO.logo - 0.4, 0.6, E.inOut)),
            translate: "-50% -50%",
            scale: mix(1.5, 0.6, p(t, VO.logo - 0.4, 0.6, E.inOut)),
            opacity: p(t, VO.logo - 0.6, 0.25) * (1 - brand),
            zIndex: 4,
            background: C.studioInk,
            padding: "26px 30px",
            borderRadius: 26,
            boxShadow: "0 20px 50px rgba(13,19,36,0.35)",
          }}
        >
          <BrandMark size={110} />
        </div>
      ) : null}

      {/* Packaging box (+ stock grid) */}
      {pack > 0 ? (
        <>
          {stock > 0
            ? [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((i) => i !== 4).map((i) => {
                const gx = (i % 3) - 1;
                const gy = Math.floor(i / 3) - 1;
                const k = Math.min(1, Math.max(0, stock * 1.6 - (Math.abs(gx) + Math.abs(gy)) * 0.18));
                return (
                  <div key={i} style={{ position: "absolute", left: 540 + gx * 250 * k - 180, top: 900 + gy * 260 * k - 210, opacity: k, scale: 0.42, zIndex: 1 }}>
                    <Box3D w={360} h={420} d={300} rx={-14} ry={-24} variant="brand" front={<BrandMark size={150} color="#E8ECF4" />} />
                  </div>
                );
              })
            : null}
          <div style={{ position: "absolute", left: boxX - 180, top: boxY - 210, scale: boxS, zIndex: 3 }}>
            <Box3D w={360} h={420} d={300} rx={-14} ry={boxRy} lid={lid} variant="brand" front={<BrandMark size={150} color="#E8ECF4" />} />
          </div>
        </>
      ) : null}

      {/* Shipping to customers (experience / delivery times) */}
      {ship > 0
        ? [-1, 0, 1].map((i) => {
            const k = Math.min(1, Math.max(0, ship * 1.5 - (i + 1) * 0.2));
            const x = mix(540, 540 + i * 320, k);
            const y = mix(900, 1330, k) - Math.sin(k * Math.PI) * 120;
            return (
              <React.Fragment key={i}>
                <div style={{ position: "absolute", left: 540 + i * 320 - 60, top: 1300, opacity: p(t, VO.experience, 0.4), zIndex: 1 }}>
                  <div style={{ width: 120, height: 120, borderRadius: 99, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 20px 40px rgba(13,19,36,0.12)" }}>
                    <IHomeUser size={56} color={C.studioInk} />
                  </div>
                </div>
                {k < 1 ? (
                  <div style={{ position: "absolute", left: x - 45, top: y - 45, zIndex: 4 }}>
                    <Box3D w={90} h={76} d={84} rx={-18} ry={-30} variant="kraft" />
                  </div>
                ) : (
                  <div style={{ position: "absolute", left: x + 30, top: 1290, width: 50, height: 50, borderRadius: 99, background: C.green, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 4 }}>
                    <ICheck size={30} color="#fff" stroke={3} />
                  </div>
                )}
              </React.Fragment>
            );
          })
        : null}

      {/* Supplier selection */}
      <div style={{ position: "absolute", top: 1240, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 24, opacity: 1 - supOut, zIndex: 2 }}>
        {["Proveedor A", "Proveedor B", "Proveedor C"].map((n, i) => (
          <div key={n} style={{ scale: 0.95 }}>
            <SupplierCard name={n} rating={[3, 5, 4][i]} selected={i === 1 ? selected : 0} k={Math.min(1, Math.max(0, sup * 1.6 - i * 0.2))} />
          </div>
        ))}
      </div>

      {/* Key labels */}
      <Label text="MARCA PROPIA" k={env(t, VO.brand + 0.1, VO.stock - 0.1, 0.5, 0.35)} />
      <Label text="CONTROL DEL STOCK" k={env(t, VO.stock + 0.1, VO.experience + 0.1, 0.5, 0.35)} />
      <Label text="EXPERIENCIA DE CLIENTE" k={p(t, VO.experience + 0.3, 0.5)} />
    </AbsoluteFill>
  );
};

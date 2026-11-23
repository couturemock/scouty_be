import React from "react";
import { AbsoluteFill } from "remotion";
import { E, eur, mix, p, spr, tw, useTime } from "../animations/clock";
import { Cursor, Pill, RiseText, StudioBg } from "../components/primitives";
import { IFactory, IHomeUser, IPlay, IStore } from "../components/Icons";
import { Box3D, Earbuds, StorePhone } from "../components/product/Products";
import { C, INTER, SORA } from "../styles/theme";
import { VO } from "../timeline";

const PHONE_W = 460;
const PHONE_H = PHONE_W * 2.02;

/** Flow node (Proveedor / Tú / Cliente). */
const Node: React.FC<{ x: number; y: number; label: string; icon: React.ReactNode; k: number; dim?: number; pulse?: number }> = ({
  x,
  y,
  label,
  icon,
  k,
  dim = 0,
  pulse = 0,
}) => (
  <div style={{ position: "absolute", left: x, top: y, translate: "-50% -50%", scale: k, opacity: Math.min(1, k * 1.5) * (1 - dim * 0.55), display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
    <div
      style={{
        width: 168,
        height: 168,
        borderRadius: 999,
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 30px 60px rgba(13,19,36,0.15), 0 0 0 ${pulse * 18}px rgba(58,99,216,${0.18 * (1 - pulse)})`,
        border: "2px solid rgba(13,19,36,0.06)",
      }}
    >
      {icon}
    </div>
    <div style={{ fontFamily: SORA, fontWeight: 700, fontSize: 32, color: C.studioInk, letterSpacing: "0.04em" }}>{label}</div>
  </div>
);

const CreativeCard: React.FC<{ hue: string }> = ({ hue }) => (
  <div
    style={{
      width: 210,
      height: 373,
      borderRadius: 26,
      overflow: "hidden",
      background: `linear-gradient(160deg, ${hue} 0%, #0D1324 100%)`,
      boxShadow: "0 30px 60px rgba(13,19,36,0.3)",
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      border: "4px solid #fff",
    }}
  >
    <Earbuds size={190} lid={1} />
    <div style={{ position: "absolute", width: 64, height: 64, borderRadius: 99, background: "rgba(255,255,255,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <IPlay size={30} color="#fff" />
    </div>
    <div style={{ position: "absolute", left: 16, right: 16, bottom: 18, height: 8, borderRadius: 8, background: "rgba(255,255,255,0.7)" }} />
    <div style={{ position: "absolute", left: 16, width: 110, bottom: 34, height: 8, borderRadius: 8, background: "rgba(255,255,255,0.45)" }} />
  </div>
);

export const S02Dropshipping: React.FC = () => {
  const t = useTime();

  // --- phases --------------------------------------------------------------
  const titleIn = VO.dropTitle;
  const heroIn = spr(t, VO.findProduct, 8, 0.55);
  const costIn = p(t, VO.cost - 0.2, 0.6);
  const costCount = tw(t, [VO.cost - 0.1, VO.cost + 1.0], [0, 9.99], E.out);
  const store = p(t, VO.shopify - 0.15, 0.9, E.inOut); // phone rises, product flies into it
  const creatives = spr(t, VO.creatives, 7, 0.6);
  const saleCount = tw(t, [VO.sellPrice - 0.1, VO.sellPrice + 1.1], [9.99, 29.99], E.out);
  const clickAt = 14.55;
  const confirmed = p(t, clickAt + 0.2, 0.45);
  const toFlow = p(t, VO.neverTouch - 0.1, 0.8, E.inOut); // phone collapses into "TÚ" node
  const flowIn = p(t, VO.neverTouch, 0.7);
  const orderTrip = tw(t, [VO.someoneBuys + 0.1, VO.supplierShips - 0.05], [0, 1], E.inOut);
  const parcel = tw(t, [VO.supplierShips + 0.15, 20.0], [0, 1], E.inOut);
  const exit = p(t, 20.45, 0.5, E.in);

  // --- hero product position (center → phone slot) ------------------------
  const phoneTop = mix(1950, 500, store);
  const slotY = phoneTop + PHONE_W * 0.03 + PHONE_W * 0.2 + PHONE_W * 0.43;
  const heroX = 540;
  const heroY = mix(mix(820, 760, heroIn), slotY, store);
  const heroSize = mix(500, 300, store);

  // phone → node "TÚ"
  const phoneScale = mix(1, 0.2, toFlow);
  const phoneCY = mix(phoneTop + PHONE_H / 2, 850, toFlow);

  const nodeY = 1180;
  const sup = { x: 210, y: nodeY };
  const cli = { x: 870, y: nodeY };
  const you = { x: 540, y: 850 };

  // parcel arc
  const arc = (k: number) => {
    const x = mix(sup.x, cli.x, k);
    const y = sup.y + 150 + Math.sin(k * Math.PI) * 150 - k * 0;
    return { x, y };
  };
  const pc = arc(parcel);

  // order ticket travels cliente → tú → proveedor
  const ticket = orderTrip < 0.5
    ? { x: mix(cli.x, you.x, orderTrip * 2), y: mix(cli.y, you.y, orderTrip * 2) }
    : { x: mix(you.x, sup.x, (orderTrip - 0.5) * 2), y: mix(you.y, sup.y, (orderTrip - 0.5) * 2) };

  return (
    <AbsoluteFill style={{ opacity: Math.min(1 - exit, p(t, 3.85, 0.35)), scale: 1 + exit * 0.06 }}>
      <StudioBg spotY={45} />

      {/* Title */}
      <div style={{ position: "absolute", top: mix(250, 215, store), left: 0, right: 0, display: "flex", justifyContent: "center", scale: mix(1, 0.62, store), transformOrigin: "50% 0%" }}>
        <RiseText text="Dropshipping" at={titleIn - 0.12} size={110} color={C.studioInk} />
      </div>

      {/* Price chips (cost always visible next to sale price; difference is NOT shown as profit) */}
      <div style={{ position: "absolute", top: 330, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 22, opacity: store * (1 - toFlow) }}>
        <Pill size={30}>
          <span style={{ color: C.studioMuted, fontWeight: 500 }}>Coste</span> 9,99 €
        </Pill>
        <Pill size={30} style={{ opacity: p(t, VO.sellPrice, 0.4), scale: 0.9 + 0.1 * p(t, VO.sellPrice, 0.4) }} bg={C.studioInk} color="#fff" border={C.studioInk}>
          <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>Venta</span> 29,99 €
        </Pill>
      </div>

      {/* Cost card (before the store) */}
      <div
        style={{
          position: "absolute",
          left: 540,
          top: 1210,
          translate: "-50% 0",
          opacity: costIn * (1 - store),
          scale: 0.9 + costIn * 0.1,
          background: "#fff",
          borderRadius: 32,
          padding: "30px 46px",
          boxShadow: "0 30px 70px rgba(13,19,36,0.14)",
          textAlign: "center",
          fontFamily: INTER,
        }}
      >
        <div style={{ fontSize: 26, letterSpacing: "0.14em", fontWeight: 600, color: C.studioMuted }}>COSTE DEL PRODUCTO</div>
        <div style={{ fontFamily: SORA, fontSize: 120, fontWeight: 700, color: C.studioInk, letterSpacing: "-0.03em", marginTop: 6 }}>{eur(costCount)}</div>
      </div>

      {/* Creatives fanning out behind the phone */}
      {[-1, 1].map((side, i) => (
        <div
          key={side}
          style={{
            position: "absolute",
            left: 540 + side * mix(0, 300, creatives) - 105,
            top: phoneTop + 260 + (1 - creatives) * 40,
            rotate: `${side * 10 * creatives}deg`,
            opacity: Math.min(1, creatives * 2) * (1 - toFlow),
            scale: 0.8 + creatives * 0.2,
            zIndex: 1,
          }}
        >
          <CreativeCard hue={i === 0 ? "#3A63D8" : "#FF6B4A"} />
        </div>
      ))}
      <div style={{ position: "absolute", left: 0, right: 0, top: phoneTop + 660, display: "flex", justifyContent: "space-between", padding: "0 90px", opacity: p(t, VO.creatives + 0.3, 0.5) * (1 - toFlow), fontFamily: SORA, fontWeight: 700, fontSize: 30, color: C.studioInk }}>
        <span>Creativos</span>
        <span>Creativos</span>
      </div>

      {/* Store phone */}
      <div
        style={{
          position: "absolute",
          left: 540 - PHONE_W / 2,
          top: phoneCY - PHONE_H / 2,
          scale: phoneScale,
          opacity: store > 0 ? 1 - p(t, VO.neverTouch + 0.45, 0.3) : 0,
          zIndex: 2,
        }}
      >
        <StorePhone
          width={PHONE_W}
          price={eur(t < VO.sellPrice - 0.1 ? 9.99 : saleCount)}
          confirmed={confirmed}
          pressed={tw(t, [clickAt - 0.05, clickAt + 0.05]) - tw(t, [clickAt + 0.1, clickAt + 0.25])}
          productSlot={store >= 1 ? <Earbuds size={300} lid={1} /> : null}
        />
      </div>

      {/* Hero product (before it settles into the store) */}
      {store < 1 ? (
        <div style={{ position: "absolute", left: heroX - heroSize / 2, top: heroY - heroSize / 2, scale: heroIn, opacity: Math.min(1, heroIn * 2), zIndex: 3, rotate: `${mix(-8, 0, heroIn)}deg` }}>
          <Earbuds size={heroSize} lid={tw(t, [VO.findProduct + 0.4, VO.findProduct + 1.2])} />
        </div>
      ) : null}

      {/* Platform pills */}
      <div style={{ position: "absolute", top: 1530, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 18, opacity: 1 - toFlow }}>
        <Pill size={32} style={{ opacity: p(t, VO.shopify, 0.4), translate: `0 ${(1 - p(t, VO.shopify, 0.4)) * 20}px` }}>
          <IStore size={30} color={C.blue} /> Shopify
        </Pill>
        <span style={{ fontFamily: INTER, fontSize: 30, color: C.studioMuted, opacity: p(t, VO.tiktokShop, 0.3) }}>o</span>
        <Pill size={32} style={{ opacity: p(t, VO.tiktokShop, 0.4), translate: `0 ${(1 - p(t, VO.tiktokShop, 0.4)) * 20}px` }}>
          <IStore size={30} color={C.coral} /> TikTok Shop
        </Pill>
      </div>

      {/* Cursor */}
      {t > 13.9 && t < VO.neverTouch ? (
        <Cursor
          x={mix(900, 560, p(t, 13.95, 0.55, E.inOut))}
          y={mix(1700, phoneTop + PHONE_H - 85, p(t, 13.95, 0.55, E.inOut))}
          clickAt={clickAt}
          scale={1.5}
          opacity={p(t, 13.9, 0.2) * (1 - p(t, 15.0, 0.2))}
        />
      ) : null}

      {/* ---------------- Flow: Proveedor → Cliente ---------------- */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: flowIn }}>
        <path d={`M ${you.x} ${you.y + 84} L ${sup.x + 70} ${sup.y - 60}`} stroke="rgba(13,19,36,0.25)" strokeWidth={4} strokeDasharray="10 14" fill="none" />
        <path d={`M ${you.x} ${you.y + 84} L ${cli.x - 70} ${cli.y - 60}`} stroke="rgba(13,19,36,0.25)" strokeWidth={4} strokeDasharray="10 14" fill="none" />
        <path
          d={`M ${sup.x} ${sup.y + 150} Q ${540} ${sup.y + 150 + 300} ${cli.x} ${cli.y + 150}`}
          stroke={C.blue}
          strokeWidth={8}
          strokeLinecap="round"
          fill="none"
          strokeDasharray="1200"
          strokeDashoffset={1200 * (1 - parcel)}
        />
      </svg>
      <Node x={sup.x} y={sup.y} label="PROVEEDOR" icon={<IFactory size={72} color={C.studioInk} stroke={1.8} />} k={spr(t, VO.neverTouch + 0.2, 8, 0.6)} />
      <Node x={cli.x} y={cli.y} label="CLIENTE" icon={<IHomeUser size={72} color={C.studioInk} stroke={1.8} />} k={spr(t, VO.neverTouch + 0.35, 8, 0.6)} pulse={p(t, 19.9, 0.6)} />
      <Node x={you.x} y={you.y} label="TÚ" icon={<IStore size={72} color={C.blue} stroke={1.8} />} k={spr(t, VO.neverTouch + 0.3, 8, 0.6)} dim={p(t, VO.supplierShips, 0.5)} pulse={p(t, VO.someoneBuys, 0.6)} />

      {/* order ticket */}
      {orderTrip > 0 && orderTrip < 1 ? (
        <div style={{ position: "absolute", left: ticket.x, top: ticket.y, translate: "-50% -50%", background: C.studioInk, color: "#fff", fontFamily: INTER, fontWeight: 700, fontSize: 24, padding: "10px 18px", borderRadius: 14, boxShadow: "0 12px 30px rgba(13,19,36,0.3)" }}>
          Pedido
        </div>
      ) : null}

      {/* parcel */}
      {parcel > 0 ? (
        <div style={{ position: "absolute", left: pc.x - 60, top: pc.y - 60, rotate: `${Math.sin(parcel * Math.PI * 2) * 8}deg` }}>
          <Box3D w={120} h={100} d={110} rx={-20} ry={-30 + parcel * 60} variant="kraft" />
        </div>
      ) : null}

      {/* "Nunca tocas el producto" + route label */}
      <div style={{ position: "absolute", top: 420, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        {t > VO.neverTouch - 0.2 ? (
          <RiseText text={"Tú nunca tocas\nel producto"} at={VO.neverTouch + 0.1} size={78} color={C.studioInk} out={VO.supplierShips - 0.1} />
        ) : null}
      </div>
      <div style={{ position: "absolute", top: 1490, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: p(t, VO.supplierShips + 0.2, 0.5) }}>
        <div style={{ fontFamily: SORA, fontWeight: 800, fontSize: 56, color: C.studioInk, display: "flex", gap: 22, alignItems: "center" }}>
          PROVEEDOR <span style={{ color: C.blue }}>→</span> CLIENTE
        </div>
      </div>
    </AbsoluteFill>
  );
};

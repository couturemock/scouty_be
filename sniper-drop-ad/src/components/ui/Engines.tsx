/**
 * Reconstruction of the "4 motores" board from sniperdrop.com
 * (reference: public/reference/06-motores.png). Names, copy and tags are the
 * ones published on the site; layout adapted to a vertical 9:16 frame.
 */
import React from "react";
import { C, INTER, SORA } from "../../styles/theme";
import { IBars, IMegaphone, ISparkles, ITruck } from "../Icons";

export const MOTORS = [
  {
    n: "01",
    title: "E-COMMERCE INTELLIGENCE",
    desc: "Analiza tiendas y productos de e-commerce y dropshipping para identificar señales de tracción.",
    tags: ["PRODUCTOS", "TRACCIÓN", "PRECIOS"],
    data: "PRODUCT DATA",
    Icon: ISparkles,
  },
  {
    n: "02",
    title: "AD INTELLIGENCE",
    desc: "Lee Meta Ads y TikTok Ads para detectar productos y creativos en los que los anunciantes están invirtiendo.",
    tags: ["META ADS", "TIKTOK ADS", "CREATIVOS"],
    data: "AD DATA",
    Icon: IMegaphone,
  },
  {
    n: "03",
    title: "SUPPLIER INTELLIGENCE",
    desc: "Conecta con Alibaba, AliExpress y el ecosistema dropshipping para comparar precios.",
    tags: ["PROVEEDORES", "COSTE", "ENVÍO"],
    data: "SUPPLIER DATA",
    Icon: ITruck,
  },
  {
    n: "04",
    title: "MARKET INTELLIGENCE",
    desc: "Usa Amazon como capa de validación para estudiar demanda, precios y competencia.",
    tags: ["DEMANDA", "PRECIO", "COMPETENCIA"],
    data: "MARKET DATA",
    Icon: IBars,
  },
];

export const MotorCard: React.FC<{
  motor: (typeof MOTORS)[number];
  width?: number;
  active?: number; // 0..1 glow
  style?: React.CSSProperties;
}> = ({ motor, width = 450, active = 0, style }) => {
  const { Icon } = motor;
  return (
    <div
      style={{
        width,
        background: "linear-gradient(180deg, #14161D 0%, #101218 100%)",
        border: `1.5px solid rgba(110,140,255,${0.12 + active * 0.45})`,
        borderRadius: 26,
        padding: "34px 32px 32px",
        fontFamily: INTER,
        boxShadow: `0 30px 60px rgba(0,0,0,0.45), 0 0 ${60 * active}px rgba(79,123,255,${0.35 * active})`,
        ...style,
      }}
    >
      <div style={{ fontSize: 22, letterSpacing: "0.16em", color: C.blueBright, fontWeight: 500 }}>MOTOR {motor.n}</div>
      <div style={{ marginTop: 22 }}>
        <Icon size={40} color={C.blueBright} stroke={1.6} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, color: "#fff", marginTop: 16, letterSpacing: "0.01em", lineHeight: 1.15 }}>{motor.title}</div>
      <div style={{ fontSize: 21, color: "#9AA1B0", marginTop: 14, lineHeight: 1.45 }}>{motor.desc}</div>
      <div style={{ display: "flex", gap: 8, marginTop: 20, flexWrap: "wrap" }}>
        {motor.tags.map((t) => (
          <div key={t} style={{ fontSize: 15, letterSpacing: "0.08em", color: "#AEB4C0", border: "1px solid rgba(255,255,255,0.16)", borderRadius: 99, padding: "7px 12px" }}>
            {t}
          </div>
        ))}
      </div>
    </div>
  );
};

/** Central "Cross-data engine" ellipse. */
export const CoreEngine: React.FC<{ width?: number; pulse?: number; label?: React.ReactNode; style?: React.CSSProperties }> = ({
  width = 560,
  pulse = 0,
  label,
  style,
}) => (
  <div
    style={{
      width,
      height: width * 0.62,
      borderRadius: "50%",
      border: "2px solid rgba(168,85,247,0.75)",
      background: "radial-gradient(ellipse at 50% 50%, #101A34 0%, #0A0F1E 70%)",
      boxShadow: `0 0 ${80 + pulse * 60}px rgba(91,123,255,${0.35 + pulse * 0.25}), inset 0 0 60px rgba(91,123,255,0.18)`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      fontFamily: INTER,
      ...style,
    }}
  >
    {label ?? (
      <>
        <div style={{ fontSize: width * 0.04, letterSpacing: "0.16em", color: C.blueBright }}>CROSS-DATA ENGINE</div>
        <div style={{ fontFamily: SORA, fontSize: width * 0.085, fontWeight: 600, color: "#fff", marginTop: width * 0.02 }}>Drop Sniper</div>
        <div style={{ fontSize: width * 0.032, color: "#9AA1B0", marginTop: width * 0.02, letterSpacing: "0.04em" }}>Cruza señales. Encuentra convicción.</div>
      </>
    )}
  </div>
);

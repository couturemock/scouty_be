import React from "react";
import { AbsoluteFill } from "remotion";
import { E, eur, mix, p, spr, useTime } from "../animations/clock";
import { DarkBg, DemoTag, RiseText } from "../components/primitives";
import { Float25D } from "../components/Camera";
import { ITruck } from "../components/Icons";
import { CALC, calcMargin, CalculatorForm, SUPPLIER_ROWS, SupplierRow, UI } from "../components/ui/DropSniperUI";
import { C, INTER, SORA } from "../styles/theme";
import { VO } from "../timeline";
import { TopShade } from "./S06Discovery";

const ResultCard: React.FC<{ k: number }> = ({ k }) => {
  const fee = (CALC.price * CALC.fee) / 100;
  const lines: [string, string][] = [
    ["Precio de venta", eur(CALC.price)],
    ["Coste proveedor", "− " + eur(CALC.cost)],
    ["Envío", "− " + eur(CALC.ship)],
    ["Comisiones (15 %)", "− " + eur(fee)],
  ];
  return (
    <div style={{ width: 640, background: UI.card, border: "1.5px solid rgba(110,140,255,0.45)", borderRadius: 16, padding: "22px 24px", fontFamily: INTER, color: UI.text, boxShadow: `0 0 ${40 * k}px rgba(91,123,255,0.3)` }}>
      {lines.map(([a, b], i) => (
        <div key={a} style={{ display: "flex", justifyContent: "space-between", fontSize: 15, padding: "7px 0", color: "#C3C8D3", opacity: Math.min(1, Math.max(0, k * 5 - i)) }}>
          <span>{a}</span>
          <span style={{ color: "#fff" }}>{b}</span>
        </div>
      ))}
      <div style={{ height: 1, background: UI.border2, margin: "10px 0 12px" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: Math.min(1, Math.max(0, k * 5 - 4)) }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>Margen por unidad</span>
        <span style={{ fontFamily: SORA, fontSize: 40, fontWeight: 700, color: "#fff" }}>{eur(calcMargin())}</span>
      </div>
      <div style={{ fontSize: 12, color: UI.sub, marginTop: 8, opacity: Math.min(1, Math.max(0, k * 5 - 4)) }}>Antes de gasto publicitario (CPA). No es beneficio neto.</div>
    </div>
  );
};

export const S08Suppliers: React.FC = () => {
  const t = useTime();
  const enter = p(t, 57.35, 0.5, E.out);
  const rows = [0, 1, 2].map((i) => spr(t, VO.suppliers + 0.05 + i * 0.14, 8, 0.6));
  const toCalc = p(t, VO.comparePrices - 0.15, 0.6, E.inOut);
  const flip = p(t, VO.comparePrices, 0.7, E.out);
  const focusIdx = t < 59.55 ? 1 : t < 59.75 ? 2 : t < 59.95 ? 3 : t < 60.1 ? 4 : 0;
  const press = p(t, 60.15, 0.08) - p(t, 60.25, 0.12);
  const result = p(t, 60.3, 0.6, E.out);
  const exit = p(t, 61.1, 0.3, E.in);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <DarkBg glowY={55} />

      {/* Suppliers (real UI rows) slide in laterally */}
      <AbsoluteFill style={{ opacity: enter * (1 - toCalc), translate: `${-toCalc * 300}px 0` }}>
        <div style={{ position: "absolute", top: 640, left: 90, display: "flex", alignItems: "center", gap: 18, fontFamily: INTER, fontSize: 40, fontWeight: 600, color: "#fff", opacity: enter }}>
          <ITruck size={44} color={UI.accent} /> Proveedores
        </div>
        {SUPPLIER_ROWS.map((r, i) => (
          <Float25D key={r} x={mix(1500, 540, rows[i])} y={830 + i * 175} scale={1.5} rotY={mix(-30, -4, rows[i])} lift={0.6}>
            <div style={{ width: 640, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", fontFamily: INTER, color: "#ECEEF2" }}>
              <SupplierRow label={r} style={{ borderBottom: "none" }} />
            </div>
          </Float25D>
        ))}
        <div style={{ position: "absolute", top: 1360, left: 90, right: 150, fontFamily: INTER, fontSize: 30, lineHeight: 1.45, color: C.muted, opacity: p(t, VO.suppliers + 0.5, 0.5) }}>
          Proveedores en AliExpress y Alibaba, comparados y filtrados por precio y envío.
        </div>
      </AbsoluteFill>

      {/* Margin calculator (real form, example values from the screenshot) */}
      {toCalc > 0 ? (
        <>
          <Float25D x={540} y={mix(1000, 900, result)} scale={1.45} rotY={mix(70, 0, flip)} rotX={4} lift={flip} opacity={Math.min(1, flip * 2)}>
            <div style={{ fontFamily: INTER, color: "#ECEEF2" }}>
              <CalculatorForm focus={focusIdx} pressed={press} />
            </div>
          </Float25D>
          <Float25D x={540} y={mix(1500, 1395, result)} scale={1.45} rotX={mix(-30, 0, result)} lift={result} opacity={result}>
            <ResultCard k={result} />
          </Float25D>
          <div style={{ position: "absolute", top: 560, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: flip }}>
            <div style={{ fontFamily: INTER, fontWeight: 600, fontSize: 30, letterSpacing: "0.14em", color: UI.accent }}>• CALCULADORA · MARGEN POR UNIDAD</div>
          </div>
          <div style={{ position: "absolute", top: 1640, right: 140, opacity: result }}>
            <DemoTag label="Cálculo de ejemplo" />
          </div>
        </>
      ) : null}

      <TopShade height={500} opacity={0.9} />
      <div style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
        <RiseText text={"Compara antes\nde invertir"} at={57.55} size={88} color="#fff" highlight={["invertir"]} highlightColor={C.blueSoft} />
      </div>
    </AbsoluteFill>
  );
};

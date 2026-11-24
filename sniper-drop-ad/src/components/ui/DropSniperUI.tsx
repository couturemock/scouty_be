/**
 * Faithful React reconstruction of the real Drop Sniper web app
 * (reference: public/reference/*.png). Built at the app's native
 * desktop size (1440px wide) so the scenes can move a "camera" over it.
 *
 * All copy and figures are taken from the screenshots. Where a screenshot
 * hid information (pixelated product names in Rankings) neutral placeholders
 * are used and flagged as examples.
 */
import React from "react";
import { Img, staticFile } from "remotion";
import { CTA_GRADIENT, INTER } from "../../styles/theme";
import {
  IArrowUR,
  IBadge,
  IBookmark,
  ICalc,
  ICard,
  IChevronDown,
  IHistory,
  IHome,
  IMegaphone,
  IMoon,
  ISearch,
  IStar,
  ISun,
  ITrophy,
  ITruck,
  IUser,
} from "../Icons";

export const APP_W = 1440;
export const SIDEBAR_W = 245;

const UI = {
  bg: "#0C0D11",
  side: "#0F1015",
  card: "#111319",
  card2: "#15171E",
  border: "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.11)",
  text: "#ECEEF2",
  sub: "#9097A6",
  faint: "#5E6474",
  accent: "#5B7BFF",
  activeBg: "rgba(76,104,255,0.14)",
};
export { UI };

export type NavKey =
  | "Inicio"
  | "Rankings"
  | "Analizar producto"
  | "Watchlist"
  | "Calculadora"
  | "Anuncios"
  | "Mi cuenta"
  | "Planes";

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean }> = ({ icon, label, active }) => (
  <div
    style={{
      height: 32,
      margin: "2px 12px",
      padding: "0 10px",
      borderRadius: 8,
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontSize: 13.5,
      fontWeight: 500,
      color: active ? "#FFFFFF" : "#C3C8D3",
      background: active ? UI.activeBg : "transparent",
      position: "relative",
    }}
  >
    {active ? <div style={{ position: "absolute", left: -6, top: 7, bottom: 7, width: 3, borderRadius: 3, background: UI.accent }} /> : null}
    {icon}
    {label}
  </div>
);

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 10, letterSpacing: "0.12em", color: UI.faint, fontWeight: 600, margin: "22px 0 8px 22px" }}>{children}</div>
);

export const Sidebar: React.FC<{ active: NavKey; height: number }> = ({ active, height }) => {
  const ic = { size: 15, color: "#AEB4C0", stroke: 1.7 };
  return (
    <div
      style={{
        width: SIDEBAR_W,
        height,
        background: UI.side,
        borderRight: `1px solid ${UI.border}`,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", borderBottom: `1px solid ${UI.border}` }}>
        <Img src={staticFile("brand/logo.png")} style={{ width: 74, height: 24, objectFit: "contain" }} />
        <div style={{ fontSize: 10, fontWeight: 700, color: "#7E98FF", background: "rgba(76,104,255,0.16)", border: "1px solid rgba(110,140,255,0.35)", borderRadius: 99, padding: "3px 9px" }}>PRO</div>
      </div>
      <div style={{ height: 18 }} />
      <NavItem icon={<IHome {...ic} />} label="Inicio" active={active === "Inicio"} />
      <NavItem icon={<ITrophy {...ic} />} label="Rankings" active={active === "Rankings"} />
      <NavItem icon={<ISearch {...ic} />} label="Analizar producto" active={active === "Analizar producto"} />
      <SectionLabel>ESPACIO DE TRABAJO</SectionLabel>
      <NavItem icon={<IBookmark {...ic} />} label="Watchlist" active={active === "Watchlist"} />
      <SectionLabel>HERRAMIENTAS</SectionLabel>
      <NavItem icon={<ICalc {...ic} />} label="Calculadora" active={active === "Calculadora"} />
      <NavItem icon={<IMegaphone {...ic} />} label="Anuncios" active={active === "Anuncios"} />
      <SectionLabel>CUENTA</SectionLabel>
      <NavItem icon={<IUser {...ic} />} label="Mi cuenta" active={active === "Mi cuenta"} />
      <NavItem icon={<ICard {...ic} />} label="Planes" active={active === "Planes"} />

      {/* bottom usage block */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, borderTop: `1px solid ${UI.border}`, padding: "16px 14px 12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: UI.faint, letterSpacing: "0.1em", fontWeight: 600, padding: "0 6px" }}>
          <span>ANÁLISIS URL</span>
          <span style={{ color: "#C3C8D3", letterSpacing: 0, fontSize: 11 }}>3 / ∞</span>
        </div>
        <div style={{ fontSize: 10, color: UI.faint, padding: "4px 6px 0" }}>Ilimitados (Pro)</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: UI.faint, letterSpacing: "0.1em", fontWeight: 600, padding: "18px 6px 8px" }}>
          <span>CREATIVE INTEL.</span>
          <span style={{ color: "#C3C8D3", letterSpacing: 0, fontSize: 11 }}>2 / ∞</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, border: `1px solid ${UI.border}`, borderRadius: 8, padding: 4, fontSize: 11 }}>
          <span style={{ background: "#1E2435", color: "#fff", padding: "3px 10px", borderRadius: 6, fontWeight: 600 }}>ES</span>
          <span style={{ color: UI.sub, padding: "3px 10px" }}>EN</span>
        </div>
        <div style={{ display: "flex", marginTop: 8, border: `1px solid ${UI.border}`, borderRadius: 8, padding: 3, fontSize: 11 }}>
          <span style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#1A1D26", color: "#fff", padding: "6px 0", borderRadius: 6, fontWeight: 600 }}>
            <IMoon size={12} color="#fff" /> Oscuro
          </span>
          <span style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: UI.sub }}>
            <ISun size={12} color={UI.sub} /> Claro
          </span>
        </div>
      </div>
    </div>
  );
};

export const TopBar: React.FC = () => (
  <div style={{ height: 52, borderBottom: `1px solid ${UI.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 40px 0 40px", flexShrink: 0 }}>
    <div style={{ width: 380, height: 34, borderRadius: 8, background: "#12141A", border: `1px solid ${UI.border}`, display: "flex", alignItems: "center", gap: 10, padding: "0 12px", fontSize: 12.5, color: UI.faint }}>
      <ISearch size={14} color={UI.sub} />
      <span style={{ flex: 1 }}>Buscar en Drop Sniper…</span>
      <span style={{ fontSize: 9, border: `1px solid ${UI.border2}`, borderRadius: 4, padding: "1px 5px" }}>⌘K</span>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: UI.sub }}>
      <div style={{ width: 28, height: 28, borderRadius: 99, background: "#1C2030", border: `1px solid ${UI.border2}`, color: "#fff", fontWeight: 700, fontSize: 10.5, display: "flex", alignItems: "center", justifyContent: "center" }}>AS</div>
      Pro · Admin
      <IChevronDown size={14} color={UI.sub} />
    </div>
  </div>
);

/** Full application frame. `scrollY` scrolls the main content. */
export const AppShell: React.FC<{
  active: NavKey;
  height?: number;
  scrollY?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ active, height = 1100, scrollY = 0, children, style }) => (
  <div
    style={{
      width: APP_W,
      height,
      background: UI.bg,
      borderRadius: 18,
      border: `1px solid ${UI.border2}`,
      overflow: "hidden",
      display: "flex",
      fontFamily: INTER,
      color: UI.text,
      boxShadow: "0 80px 160px rgba(0,0,0,0.55), 0 0 0 1px rgba(91,123,255,0.06)",
      ...style,
    }}
  >
    <Sidebar active={active} height={height} />
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, position: "relative" }}>
      <TopBar />
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          position: "relative",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      >
        <div style={{ translate: `0 ${-scrollY}px`, padding: "52px 85px 40px 85px" }}>{children}</div>
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------
export const UIEyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: UI.accent, display: "flex", alignItems: "center", gap: 7 }}>
    <span style={{ width: 5, height: 5, borderRadius: 9, background: UI.accent }} />
    {children}
  </div>
);
export const UITitle: React.FC<{ children: React.ReactNode; size?: number }> = ({ children, size = 38 }) => (
  <div style={{ fontSize: size, fontWeight: 600, letterSpacing: "-0.02em", color: "#fff", marginTop: 10, lineHeight: 1.1 }}>{children}</div>
);
export const UISub: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ fontSize: 13.5, color: UI.sub, lineHeight: 1.6, marginTop: 12, ...style }}>{children}</div>
);
export const UICard: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: UI.card, border: `1px solid ${UI.border}`, borderRadius: 14, ...style }}>{children}</div>
);
export const GradButton: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: CTA_GRADIENT, color: "#fff", fontWeight: 600, fontSize: 13, borderRadius: 9, padding: "10px 16px", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 8px 24px rgba(91,123,255,0.35)", ...style }}>
    {children}
  </div>
);

// ---------------------------------------------------------------------------
// 01 · Inicio — "Más vendidos y mejores señales"
// ---------------------------------------------------------------------------
export const RANKING_ROWS = [
  { price: "55,72 €", bsr: "BSR 13", sales: "~1.000/mes est.", name: "Producto de ejemplo · Hogar", hue: 210 },
  { price: "109,99 €", bsr: "BSR 12", sales: "~500/mes est.", name: "Producto de ejemplo · Electrónica", hue: 250 },
  { price: "8,48 €", bsr: "BSR 1", sales: "~6.000/mes est.", name: "Producto de ejemplo · Belleza", hue: 330 },
  { price: "3,49 €", bsr: "BSR 7", sales: "~1.000/mes est.", name: "Producto de ejemplo · Cocina", hue: 30 },
  { price: "8,99 €", bsr: "BSR 6", sales: "~2.000/mes est.", name: "Producto de ejemplo · Mascotas", hue: 150 },
  { price: "23,00 €", bsr: "BSR 9", sales: "~1.000/mes est.", name: "Producto de ejemplo · Deporte", hue: 190 },
];

export type CustomRankRow = { name: string; sub: string; thumb: React.ReactNode };

export const RankRow: React.FC<{ i: number; row: (typeof RANKING_ROWS)[number]; highlight?: number; style?: React.CSSProperties; custom?: CustomRankRow }> = ({
  i,
  row,
  highlight = 0,
  style,
  custom,
}) => (
  <div
    style={{
      height: 79,
      display: "flex",
      alignItems: "center",
      gap: 18,
      padding: "0 18px",
      borderBottom: `1px solid ${UI.border}`,
      background: `rgba(91,123,255,${0.1 * highlight})`,
      boxShadow: highlight ? `inset 0 0 0 ${1.5 * highlight}px rgba(110,140,255,${0.6 * highlight})` : undefined,
      ...style,
    }}
  >
    <div
      style={{
        width: 26,
        height: 26,
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: i < 3 ? "#5B5FEF" : "#1A1D26",
        color: i < 3 ? "#fff" : UI.sub,
      }}
    >
      {i + 1}
    </div>
    {custom ? (
      <div style={{ width: 56, height: 56, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>{custom.thumb}</div>
    ) : null}
    <div
      style={{
        display: custom ? "none" : "flex",
        width: 56,
        height: 56,
        borderRadius: 10,
        background: `linear-gradient(135deg, hsl(${row.hue} 30% 26%), hsl(${row.hue} 25% 16%))`,
        border: `1px solid ${UI.border2}`,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: 22, height: 26, borderRadius: 6, background: `hsl(${row.hue} 45% 62%)`, opacity: 0.85 }} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: UI.text }}>{custom ? custom.name : row.name}</div>
      <div style={{ fontSize: 11.5, color: UI.faint, marginTop: 4 }}>{custom ? custom.sub : "Amazon ES"}</div>
    </div>
    {custom ? (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
        {[46, 34, 58].map((w, k) => (
          <div key={k} style={{ width: w, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.12)" }} />
        ))}
      </div>
    ) : (
      <div style={{ textAlign: "right", fontSize: 11.5, lineHeight: 1.5, color: UI.sub }}>
        <div style={{ color: "#fff", fontWeight: 600, fontSize: 12.5 }}>{row.price}</div>
        <div>{row.bsr}</div>
        <div>{row.sales}</div>
      </div>
    )}
  </div>
);

export const CountryTabs: React.FC<{ active?: number }> = ({ active = 0 }) => (
  <div style={{ display: "flex", gap: 10, marginTop: 34 }}>
    {["España", "Estados Unidos", "México", "Reino Unido"].map((c, i) => (
      <div
        key={c}
        style={{
          fontSize: 13,
          fontWeight: 600,
          padding: "10px 16px",
          borderRadius: 99,
          color: i === active ? "#fff" : UI.sub,
          background: i === active ? "rgba(76,104,255,0.16)" : "#12141A",
          border: `1px solid ${i === active ? "rgba(110,140,255,0.6)" : UI.border}`,
          boxShadow: i === active ? "0 0 18px rgba(91,123,255,0.35)" : undefined,
        }}
      >
        {c}
      </div>
    ))}
  </div>
);

export const RankingsContent: React.FC<{ rowsIn?: number[]; highlightRow?: number; highlight?: number; custom?: CustomRankRow[] }> = ({
  rowsIn = [1, 1, 1, 1, 1, 1],
  highlightRow = -1,
  highlight = 0,
  custom,
}) => (
  <div>
    <UITitle size={40}>Más vendidos y mejores señales</UITitle>
    <CountryTabs />
    <div style={{ display: "flex", gap: 16, marginTop: 22, fontSize: 12, color: UI.faint }}>
      <span>40 productos en panel</span>
      <span>Snapshot 2026-W38</span>
    </div>
    <div style={{ fontSize: 15, fontWeight: 600, marginTop: 30, marginBottom: 14 }}>Top bestsellers</div>
    <UICard style={{ overflow: "hidden" }}>
      {RANKING_ROWS.map((r, i) => (
        <RankRow
          key={i}
          i={i}
          row={r}
          highlight={i === highlightRow ? highlight : 0}
          custom={custom ? custom[i % custom.length] : undefined}
          style={{ opacity: rowsIn[i] ?? 1, translate: `${(1 - (rowsIn[i] ?? 1)) * 60}px 0` }}
        />
      ))}
    </UICard>
  </div>
);

// ---------------------------------------------------------------------------
// 02 · Analizar producto — product sheet
// ---------------------------------------------------------------------------
export const ProductThumb: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 190, style }) => (
  <div style={{ width: size, height: size, borderRadius: 14, background: "#fff", border: `1px solid ${UI.border2}`, overflow: "hidden", padding: size * 0.05, ...style }}>
    <Img src={staticFile("ui/producto-aspiradora.png")} style={{ width: "100%", height: "100%", objectFit: "cover", scale: 1.06 }} />
  </div>
);

export const StatsStrip: React.FC<{ count?: number; style?: React.CSSProperties }> = ({ count = 1, style }) => {
  const sales = Math.round(3000 * count);
  return (
    <UICard style={{ display: "flex", padding: "22px 24px", gap: 0, ...style }}>
      <div style={{ flex: 1.25 }}>
        <div style={{ fontSize: 11.5, color: UI.sub }}>Precio Amazon</div>
        <div style={{ fontSize: 44, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em", marginTop: 4 }}>
          {(19.9 * count).toFixed(2).replace(".", ",")} €
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11.5, color: UI.sub }}>Valoración</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
          <IStar size={22} color="#5B7BFF" /> {(4.1 * count).toFixed(1)}
        </div>
        <div style={{ fontSize: 11, color: UI.faint, marginTop: 6 }}>344 reseñas</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11.5, color: UI.sub }}>BSR</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginTop: 6 }}>#12</div>
        <div style={{ fontSize: 11, color: UI.faint, marginTop: 6 }}>en su categoría</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11.5, color: UI.sub }}>Ventas / mes</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", marginTop: 6 }}>~{sales.toLocaleString("de-DE")}</div>
        <div style={{ fontSize: 11, color: UI.faint, marginTop: 6 }}>estimado</div>
      </div>
    </UICard>
  );
};

export const ScoreRing: React.FC<{ value: number; progress?: number; size?: number }> = ({ value, progress = 1, size = 92 }) => {
  const r = size / 2 - 5;
  const len = 2 * Math.PI * r;
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} style={{ rotate: "-90deg" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={`${len} ${len}`}
          strokeDashoffset={len * (1 - (value / 100) * progress)}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5B7BFF" />
            <stop offset="1" stopColor="#A855F7" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
};

export const WhyHere: React.FC<{ progress?: number; style?: React.CSSProperties }> = ({ progress = 1, style }) => (
  <UICard style={{ display: "flex", alignItems: "center", gap: 26, padding: "22px 24px", background: "linear-gradient(90deg, rgba(91,123,255,0.07), rgba(17,19,25,1) 40%)", ...style }}>
    <ScoreRing value={36} progress={progress} />
    <div style={{ flex: 1.4 }}>
      <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
        <IBadge size={16} color={UI.accent} /> Por qué está aquí
      </div>
      <div style={{ fontSize: 12, color: UI.sub, lineHeight: 1.6, marginTop: 6 }}>
        Drop Sniper cruza demanda Amazon, Ad Score (TikTok/Meta) y movimiento AliExpress. Más fuentes independientes alineadas = más confianza.
      </div>
    </div>
    {[
      ["Amazon / Keepa", "70"],
      ["Ad Score", "0"],
      ["AliExpress", "0"],
      ["Confianza cruzada", "0"],
    ].map(([k, v]) => (
      <div key={k} style={{ flex: 0.7 }}>
        <div style={{ fontSize: 10.5, color: UI.sub }}>{k}</div>
        <div style={{ fontSize: 19, fontWeight: 600, marginTop: 4 }}>{v}</div>
      </div>
    ))}
  </UICard>
);

export const HistoryTable: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <UICard style={{ padding: "22px 22px", ...style }}>
    <div style={{ fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
      <IHistory size={16} color={UI.accent} /> Histórico semanal
    </div>
    <div style={{ fontSize: 12, color: UI.sub, marginTop: 6 }}>Evolución en los snapshots publicados.</div>
    <div style={{ marginTop: 16, border: `1px solid ${UI.border}`, borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", fontSize: 11.5, color: UI.sub, padding: "11px 16px", background: "#14161C" }}>
        {["Semana", "BSR", "Precio", "Ventas"].map((h) => (
          <div key={h} style={{ flex: 1 }}>{h}</div>
        ))}
      </div>
      <div style={{ display: "flex", fontSize: 12.5, padding: "13px 16px" }}>
        {["2026-W38", "#12", "19,90 €", "~3.000"].map((h) => (
          <div key={h} style={{ flex: 1 }}>{h}</div>
        ))}
      </div>
    </div>
  </UICard>
);

export const PriceCard: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <UICard style={{ padding: "22px 22px", ...style }}>
    <div style={{ fontSize: 15, fontWeight: 600 }}>Precio Amazon</div>
    <div style={{ fontSize: 12, color: UI.sub, marginTop: 6 }}>Beneficio = PVP − coste proveedor − envío − comisiones (~15%)</div>
    <div style={{ marginTop: 16, border: `1px solid ${UI.border}`, borderRadius: 10 }}>
      {[
        ["PVP Amazon", "19,90 €"],
        ["Comisiones Amazon (~15%)", "2,98 €"],
      ].map(([k, v]) => (
        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "12px 14px", borderBottom: `1px solid ${UI.border}` }}>
          <span style={{ color: "#C3C8D3" }}>{k}</span>
          <span>{v}</span>
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: UI.sub, padding: "12px 14px" }}>Margen y beneficio no se muestran: no hay coste real de proveedor.</div>
    </div>
  </UICard>
);

export const AnalysisContent: React.FC<{ count?: number; ring?: number }> = ({ count = 1, ring = 1 }) => (
  <div>
    <div style={{ fontSize: 12.5, color: UI.sub }}>← Panel</div>
    <div style={{ display: "flex", gap: 28, marginTop: 24 }}>
      <ProductThumb />
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 11, color: UI.sub }}>
          <span style={{ border: `1px solid ${UI.border2}`, borderRadius: 6, padding: "2px 7px" }}>ES</span>
          Amazon · B0H1HWFD7B
        </div>
        <div style={{ fontSize: 31, fontWeight: 600, lineHeight: 1.12, letterSpacing: "-0.015em", marginTop: 10 }}>
          Piarhlie Aspiradora de Mano 30kPa Aspirador Coche sin Cable Potente
        </div>
        <div style={{ fontSize: 12.5, color: UI.sub, marginTop: 8 }}>Piarhlie · Hogar y cocina</div>
        <StatsStrip count={count} style={{ marginTop: 20 }} />
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <GradButton>
            Ver en Amazon <IArrowUR size={13} color="#fff" />
          </GradButton>
          <div style={{ fontSize: 13, fontWeight: 600, borderRadius: 9, padding: "10px 16px", border: `1px solid ${UI.border2}`, color: "#C3C8D3" }}>Guardar en watchlist</div>
        </div>
      </div>
    </div>
    <WhyHere progress={ring} style={{ marginTop: 36 }} />
    <div style={{ display: "flex", gap: 24, marginTop: 30 }}>
      <PriceCard style={{ flex: 1 }} />
      <HistoryTable style={{ flex: 1 }} />
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// 03 · Proveedores
// ---------------------------------------------------------------------------
export const SUPPLIER_ROWS = [
  "Piarhlie Aspiradora Mano 30kPa Aspirador — Buscar en Alibaba",
  "Piarhlie Aspiradora Mano 30kPa Aspirador — Buscar wholesale Alibaba",
  "Piarhlie Aspiradora Mano 30kPa Aspirador — Buscar OEM Alibaba",
];

export const SupplierRow: React.FC<{ label: string; style?: React.CSSProperties }> = ({ label, style }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: UI.card, borderBottom: `1px solid ${UI.border}`, ...style }}>
    <div>
      <div style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 10.5, color: UI.faint, letterSpacing: "0.08em", marginTop: 5 }}>ALIBABA · BÚSQUEDA</div>
    </div>
    <div style={{ fontSize: 12.5, color: UI.accent, display: "flex", alignItems: "center", gap: 4 }}>
      Abrir búsqueda <IArrowUR size={12} color={UI.accent} />
    </div>
  </div>
);

export const SuppliersContent: React.FC<{ rowsIn?: number[] }> = ({ rowsIn = [1, 1, 1] }) => (
  <div>
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 18, fontWeight: 600 }}>
      <ITruck size={18} color={UI.accent} /> Proveedores
    </div>
    <UICard style={{ marginTop: 18, overflow: "hidden" }}>
      {SUPPLIER_ROWS.map((r, i) => (
        <SupplierRow key={r} label={r} style={{ opacity: rowsIn[i], translate: `${(1 - rowsIn[i]) * 80}px 0` }} />
      ))}
    </UICard>
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 600, marginTop: 40 }}>
      <IMegaphone size={16} color={UI.accent} /> Anuncios con más vistas e interacciones
    </div>
    <div style={{ display: "flex", gap: 16, marginTop: 18 }}>
      <UICard style={{ flex: 1, padding: 18 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>Buscar en Meta Ad Library ↗</div>
        <div style={{ fontSize: 11.5, color: UI.sub, marginTop: 8, lineHeight: 1.5 }}>Mejor para marcas/productos: keyword en anuncios activos.</div>
      </UICard>
      <UICard style={{ flex: 1, padding: 18 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600 }}>Abrir TikTok Library (luego pulsá Search) ↗</div>
        <div style={{ fontSize: 11.5, color: UI.sub, marginTop: 8, lineHeight: 1.5 }}>Filtros precargados. TikTok no busca solo: hay que pulsar Search / Buscar en su página.</div>
      </UICard>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// 04 · Anuncios — "Cómo se anuncia en TikTok y Meta"
// ---------------------------------------------------------------------------
export const ADS = [
  {
    n: 1,
    net: "TikTok",
    copy: "Game Mode from EE makes you the MVP 🔥 Prioritise your WiFi connection so you don't lag out.",
    views: "84M",
    likes: "18K",
    tags: "Hook Medio · CTA Medio · Beneficio directo",
    link: "Abrir TikTok Library (luego pulsá Search)",
  },
  {
    n: 2,
    net: "Facebook",
    copy: "Cette mini caméra Wifi sans fil va vous être d'une grande utilité 💡 Mesurant seulement 5 cm, elle profite d'un design c…",
    views: "22M",
    likes: "54K",
    tags: "Hook Fuerte · CTA Medio · Oferta / urgencia",
    link: "Abrir búsqueda en Meta",
  },
];

export const AdCard: React.FC<{ ad: (typeof ADS)[number]; style?: React.CSSProperties; glow?: number }> = ({ ad, style, glow = 0 }) => (
  <div
    style={{
      background: UI.card,
      border: `1px solid ${glow ? `rgba(110,140,255,${0.25 + glow * 0.5})` : UI.border}`,
      borderRadius: 14,
      padding: "18px 18px 20px",
      boxShadow: glow ? `0 0 ${40 * glow}px rgba(91,123,255,${0.35 * glow})` : undefined,
      ...style,
    }}
  >
    <div style={{ fontSize: 12.5, color: UI.sub }}>
      <span style={{ color: "#fff", fontWeight: 600 }}>#{ad.n}&nbsp;&nbsp;{ad.net}</span> · Video vertical 9:16
    </div>
    <div style={{ fontSize: 12.5, color: "#D5D9E2", marginTop: 10, lineHeight: 1.5 }}>{ad.copy}</div>
    <div style={{ fontSize: 12, color: UI.sub, marginTop: 12 }}>
      Vistas <b style={{ color: "#fff" }}>{ad.views}</b>&nbsp;&nbsp;&nbsp;Me gusta <b style={{ color: "#fff" }}>{ad.likes}</b>
    </div>
    <div style={{ fontSize: 12, color: UI.sub, marginTop: 10 }}>{ad.tags}</div>
    <div style={{ fontSize: 12, color: UI.accent, marginTop: 14 }}>{ad.link} ↗</div>
  </div>
);

export const AdsContent: React.FC<{ cardsIn?: number[]; typed?: number }> = ({ cardsIn = [1, 1], typed = 0 }) => (
  <div>
    <UIEyebrow>ANUNCIOS</UIEyebrow>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <UITitle>Cómo se anuncia en TikTok y Meta</UITitle>
      <div style={{ display: "flex", gap: 8 }}>
        {["ES", "US", "MX", "UK"].map((c, i) => (
          <div key={c} style={{ width: 46, height: 36, borderRadius: 99, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 600, background: i === 0 ? "rgba(76,104,255,0.16)" : "#12141A", border: `1px solid ${i === 0 ? "rgba(110,140,255,0.6)" : UI.border}`, color: i === 0 ? "#fff" : UI.sub }}>
            {c}
          </div>
        ))}
      </div>
    </div>
    <UISub>
      Anuncios similares ordenados por vistas e interacciones públicas. Ideal
      <br />
      para ver qué creatividades están tirando más de cada producto.
    </UISub>
    <UICard style={{ marginTop: 34, padding: "20px 22px" }}>
      <div style={{ fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
        <ISearch size={15} color={UI.accent} /> Buscar anuncios de un producto
      </div>
      <div style={{ fontSize: 12, color: UI.sub, marginTop: 6 }}>Escriba el nombre de un producto y le mostraremos anuncios similares ordenados por engagement. Incluido en Básico y Pro.</div>
      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <div style={{ flex: 1, height: 40, borderRadius: 9, background: "#0E1015", border: `1px solid ${UI.border}`, display: "flex", alignItems: "center", padding: "0 14px", fontSize: 12.5, color: typed > 0 ? "#fff" : UI.faint }}>
          {typed > 0 ? "camara vigilancia wifi".slice(0, Math.round(typed * 22)) : "Ej. serum facial, organizer cocina…"}
        </div>
        <GradButton style={{ width: 76 }}>Buscar</GradButton>
      </div>
    </UICard>
    <div style={{ fontSize: 14, fontWeight: 600, marginTop: 40, display: "flex", alignItems: "center", gap: 8 }}>
      <IMegaphone size={15} color={UI.accent} /> Productos con anuncios listos
    </div>
    <div style={{ fontSize: 12, color: UI.sub, marginTop: 6 }}>Selección del catálogo actual. En cada ficha verá las creatividades con más tracción.</div>
    <UICard style={{ marginTop: 20, padding: "20px 18px" }}>
      <div style={{ fontSize: 16, fontWeight: 600 }}>GNCC 2PCS Camara Vigilancia WiFi Exterior</div>
      <div style={{ fontSize: 12, color: UI.sub, marginTop: 6 }}>Amazon ES · 3 anuncios · Ordenado por engagement</div>
      <div style={{ fontSize: 12, color: UI.sub, marginTop: 6 }}>
        Formatos que mejor están tirando: <span style={{ color: "#fff" }}>Video vertical 9:16</span>
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
        {ADS.map((a, i) => (
          <AdCard key={a.n} ad={a} style={{ flex: 1, opacity: cardsIn[i], translate: `0 ${(1 - cardsIn[i]) * 40}px` }} />
        ))}
      </div>
    </UICard>
  </div>
);

// ---------------------------------------------------------------------------
// 05 · Calculadora — "Margen por unidad"
// ---------------------------------------------------------------------------
const Field: React.FC<{ label: string; value: string; focus?: boolean; style?: React.CSSProperties }> = ({ label, value, focus, style }) => (
  <div style={{ flex: 1, ...style }}>
    <div style={{ fontSize: 11.5, color: UI.sub, marginBottom: 8 }}>{label}</div>
    <div
      style={{
        height: 44,
        borderRadius: 9,
        background: "#0E1015",
        border: `1.5px solid ${focus ? "#5B7BFF" : UI.border}`,
        boxShadow: focus ? "0 0 0 3px rgba(91,123,255,0.18)" : undefined,
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        fontSize: 14,
        color: "#fff",
      }}
    >
      {value}
    </div>
  </div>
);

export const CALC = { price: 29.99, cost: 6.5, ship: 2.4, fee: 15, other: 0 };
export const calcMargin = () => CALC.price - CALC.cost - CALC.ship - (CALC.price * CALC.fee) / 100 - CALC.other;

export const CalculatorForm: React.FC<{ values?: number; focus?: number; pressed?: number; style?: React.CSSProperties }> = ({
  values = 1,
  focus = 0,
  pressed = 0,
  style,
}) => {
  const v = (x: number, d = 2) => (values >= 1 ? x.toString().replace(".", ",") : (x * values).toFixed(d).replace(".", ","));
  return (
    <UICard style={{ padding: "26px 22px 22px", width: 640, ...style }}>
      <div style={{ display: "flex", gap: 16 }}>
        <Field label="Precio de venta (€)" value={v(CALC.price)} focus={focus === 1} />
        <Field label="Coste proveedor (€)" value={v(CALC.cost, 1)} focus={focus === 2} />
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 18 }}>
        <Field label="Envío (€)" value={v(CALC.ship, 1)} focus={focus === 3} />
        <Field label="Comisiones (%)" value={values >= 1 ? "15" : Math.round(15 * values).toString()} focus={focus === 4} />
      </div>
      <Field label="Otros gastos (€)" value="0" style={{ marginTop: 18 }} />
      <div
        style={{
          marginTop: 22,
          height: 46,
          borderRadius: 9,
          background: CTA_GRADIENT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          fontSize: 14,
          fontWeight: 600,
          scale: 1 - pressed * 0.03,
          boxShadow: "0 10px 30px rgba(91,123,255,0.35)",
        }}
      >
        <ICalc size={15} color="#fff" /> Calcular
      </div>
    </UICard>
  );
};

export const CalculatorContent: React.FC<{ values?: number; focus?: number; pressed?: number }> = (props) => (
  <div>
    <div style={{ marginLeft: 280 }}>
      <UIEyebrow>CALCULADORA</UIEyebrow>
      <UITitle>Margen por unidad</UITitle>
      <UISub>
        Precio de venta − coste de proveedor − envío − comisiones. Sin inventar CPA ni
        <br />
        gasto publicitario.
      </UISub>
      <CalculatorForm {...props} style={{ marginTop: 36 }} />
    </div>
  </div>
);

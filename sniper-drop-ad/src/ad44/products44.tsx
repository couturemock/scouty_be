/**
 * Illustrated demo products for the 44 s ad (no photos supplied, so every
 * product is a recreation and is labelled as such where it matters).
 *  - Kitchen: pressure vegetable chopper (hand, half onion, falling dice)
 *  - Pets: dog water bottle with fold-out bowl (hand on the button, dog drinking / walking)
 *  - Pets: cat fish toy with moving tail
 */
import React from "react";
import { random } from "remotion";

const SKIN = "#E9B993";
const SKIN_D = "#CF9670";
const SLEEVE = "#22304F";

// ---------------------------------------------------------------------------
// Pressure vegetable chopper
// press: 0 lid up → 1 lid fully down (onion cut). dice: 0..1 dice fallen.
// ---------------------------------------------------------------------------
const DICE = new Array(34).fill(0).map((_, i) => ({
  x: 120 + random(`dx${i}`) * 340,
  y: 470 + random(`dy${i}`) * 55 - Math.floor(i / 12) * 26,
  r: (random(`dr${i}`) - 0.5) * 40,
  d: random(`dd${i}`) * 0.5,
  c: random(`dc${i}`) > 0.75,
}));

export const Chopper: React.FC<{ size?: number; press?: number; dice?: number; hand?: boolean; style?: React.CSSProperties }> = ({
  size = 600,
  press = 0,
  dice = 1,
  hand = false,
  style,
}) => {
  const lidY = 120 + press * 150;
  const onionScale = 1 - Math.min(1, press) * 0.75;
  const onionGone = press > 0.93;
  return (
    <svg width={size} height={size} viewBox="0 0 600 600" style={style}>
      <defs>
        <linearGradient id="chGlass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(210,230,255,0.55)" />
          <stop offset="0.25" stopColor="rgba(255,255,255,0.75)" />
          <stop offset="0.5" stopColor="rgba(210,230,255,0.35)" />
          <stop offset="1" stopColor="rgba(190,215,245,0.55)" />
        </linearGradient>
        <radialGradient id="onion" cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#D9799E" />
          <stop offset="0.6" stopColor="#9C3D6E" />
          <stop offset="1" stopColor="#6E2450" />
        </radialGradient>
        <linearGradient id="lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="1" stopColor="#16A34A" />
        </linearGradient>
      </defs>
      <ellipse cx="300" cy="565" rx="250" ry="18" fill="rgba(0,0,0,0.35)" />
      {/* dice inside the container */}
      {DICE.map((d, i) => {
        const k = Math.min(1, Math.max(0, (dice - d.d) / 0.5));
        if (k <= 0) return null;
        const y = 330 + (d.y - 330) * (k * k);
        return <rect key={i} x={d.x} y={y} width={24} height={22} rx={4} fill={d.c ? "#E6B4D0" : "#FBF3F8"} stroke="#B9819F" strokeWidth={1.5} transform={`rotate(${d.r * k} ${d.x + 12} ${y + 11})`} />;
      })}
      {/* transparent container */}
      <rect x={90} y={330} width={420} height={225} rx={26} fill="url(#chGlass)" stroke="rgba(255,255,255,0.9)" strokeWidth={3} />
      <rect x={110} y={345} width={18} height={190} rx={9} fill="rgba(255,255,255,0.55)" />
      {/* blade grid */}
      <rect x={95} y={300} width={410} height={36} rx={8} fill="#B4BCC9" />
      {new Array(15).fill(0).map((_, i) => (
        <line key={i} x1={112 + i * 27} x2={112 + i * 27} y1={302} y2={334} stroke="#7D8696" strokeWidth={3} />
      ))}
      {/* half onion on the blades */}
      {!onionGone ? (
        <g transform={`translate(300 300) scale(1 ${onionScale}) translate(-300 -300)`}>
          <path d="M175 300 C175 205 230 165 300 165 C370 165 425 205 425 300 Z" fill="url(#onion)" />
          {[-80, -40, 0, 40, 80].map((o) => (
            <path key={o} d={`M${300 + o * 0.6} 172 C${300 + o * 1.1} 220 ${300 + o * 1.25} 260 ${300 + o * 1.3} 300`} stroke="rgba(255,255,255,0.25)" strokeWidth={3} fill="none" />
          ))}
          <path d="M296 165 C292 145 300 130 312 122" stroke="#C9A36A" strokeWidth={6} fill="none" strokeLinecap="round" />
        </g>
      ) : null}
      {/* lid with pusher */}
      <rect x={85} y={lidY + 30} width={430} height={14} rx={6} fill="#D7DCE4" />
      <rect x={70} y={lidY - 10} width={460} height={46} rx={18} fill="url(#lid)" />
      <rect x={235} y={lidY - 44} width={130} height={40} rx={18} fill="#15803D" />
      {/* pressing hand */}
      {hand ? (
        <g transform={`translate(0 ${lidY - 120})`}>
          <path d="M520 -260 L600 -260 L600 -120 L470 -20 Z" fill={SLEEVE} />
          <ellipse cx={330} cy={70} rx={130} ry={56} fill={SKIN} />
          {[0, 1, 2, 3].map((f) => (
            <rect key={f} x={205 + f * 58} y={52 + Math.abs(f - 1.5) * 8} width={64} height={62} rx={30} fill={f % 2 ? SKIN : "#EDC3A0"} stroke={SKIN_D} strokeWidth={2} />
          ))}
          <path d="M440 40 C470 20 500 -20 520 -60 L470 -20 Z" fill={SKIN_D} />
          <ellipse cx={455} cy={45} rx={55} ry={34} fill={SKIN} transform="rotate(-30 455 45)" />
        </g>
      ) : null}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Dog water bottle with fold-out bowl
// bowl: water in the bowl 0..1, level: tank 0..1, press: button pressed 0..1
// flow: +1 water going up, -1 returning to the tank, 0 still
// ---------------------------------------------------------------------------
export const DogBottle: React.FC<{
  height?: number;
  bowl?: number;
  level?: number;
  press?: number;
  flow?: number;
  t?: number;
  hand?: boolean;
  color?: string;
  style?: React.CSSProperties;
}> = ({ height = 600, bowl = 0, level = 0.8, press = 0, flow = 0, t = 0, hand = false, color = "#2F9BE0", style }) => {
  const s = height / 700;
  const tankTop = 220;
  const tankH = 420;
  const waterY = tankTop + tankH * (1 - level);
  return (
    <svg width={340 * s} height={height} viewBox="0 0 340 700" style={{ overflow: "visible", ...style }}>
      <defs>
        <linearGradient id="dbBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="rgba(200,225,250,0.6)" />
          <stop offset="0.3" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="1" stopColor="rgba(185,210,240,0.55)" />
        </linearGradient>
        <clipPath id="dbClip">
          <rect x={110} y={tankTop} width={120} height={tankH} rx={50} />
        </clipPath>
      </defs>
      {/* tank water */}
      <g clipPath="url(#dbClip)">
        <rect x={100} y={waterY} width={140} height={tankH} fill="rgba(80,170,240,0.75)" />
        <path d={`M100 ${waterY} Q130 ${waterY - 8 + Math.sin(t * 6) * 4} 170 ${waterY} T240 ${waterY}`} fill="rgba(80,170,240,0.75)" />
      </g>
      <rect x={110} y={tankTop} width={120} height={tankH} rx={50} fill="url(#dbBody)" stroke="rgba(255,255,255,0.95)" strokeWidth={3} opacity={0.75} />
      <rect x={124} y={tankTop + 30} width={14} height={tankH - 80} rx={7} fill="rgba(255,255,255,0.6)" />
      {/* neck + button */}
      <rect x={120} y={182} width={100} height={46} rx={14} fill={color} />
      <circle cx={235} cy={262 + press * 4} r={20} fill="#F5B544" stroke="#C98A1E" strokeWidth={3} />
      {/* water rising / returning */}
      {flow !== 0
        ? [0, 1, 2, 3].map((i) => {
            const u = (t * 2.2 + i / 4) % 1;
            const y = flow > 0 ? 230 - u * 110 : 120 + u * 110;
            return <circle key={i} cx={170 + Math.sin(u * 8 + i) * 6} cy={y} r={7} fill="rgba(110,190,255,0.9)" opacity={Math.sin(u * Math.PI)} />;
          })
        : null}
      {/* bowl (trough) */}
      <path d="M40 110 L300 110 C300 160 270 186 240 186 L100 186 C70 186 40 160 40 110 Z" fill={color} />
      <path d="M52 112 L288 112 C286 150 262 170 238 170 L102 170 C78 170 54 150 52 112 Z" fill="#E8F4FF" />
      <clipPath id="dbBowl">
        <path d="M52 112 L288 112 C286 150 262 170 238 170 L102 170 C78 170 54 150 52 112 Z" />
      </clipPath>
      <g clipPath="url(#dbBowl)">
        <rect x={40} y={170 - bowl * 56} width={260} height={80} fill="rgba(60,160,240,0.9)" />
        <path d={`M40 ${170 - bowl * 56} Q110 ${166 - bowl * 56 + Math.sin(t * 7) * 3} 170 ${170 - bowl * 56} T300 ${170 - bowl * 56}`} fill="rgba(160,215,255,0.9)" opacity={bowl > 0.03 ? 1 : 0} />
      </g>
      {/* gripping hand with thumb on the button */}
      {hand ? (
        <g>
          <path d="M330 300 L420 330 L420 600 L330 560 Z" fill={SLEEVE} />
          {[0, 1, 2, 3].map((f) => (
            <rect key={f} x={98} y={300 + f * 56} width={170} height={50} rx={25} fill={f % 2 ? SKIN : "#EDC3A0"} stroke={SKIN_D} strokeWidth={2} />
          ))}
          <path d="M268 300 L340 310 L340 540 L268 520 Z" fill={SKIN} />
          <g transform={`translate(${-press * 10} ${press * 4})`}>
            <rect x={218} y={232} width={110} height={44} rx={22} fill={SKIN} stroke={SKIN_D} strokeWidth={2} transform="rotate(-18 270 254)" />
          </g>
        </g>
      ) : null}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Dog (flat illustration). Head profile drinking (lap 0..1) or full body walking.
// ---------------------------------------------------------------------------
export const DogHead: React.FC<{ size?: number; lap?: number; style?: React.CSSProperties }> = ({ size = 420, lap = 0, style }) => (
  <svg width={size} height={size * 0.85} viewBox="0 0 420 360" style={style}>
    <path d="M420 360 L420 150 C380 120 330 110 290 130 L240 360 Z" fill="#C98A4B" />
    <ellipse cx={250} cy={150} rx={120} ry={100} fill="#D99A5B" />
    <path d="M150 165 C110 165 60 180 40 205 C30 220 45 240 70 240 L170 240 Z" fill="#E7B17A" />
    <ellipse cx={48} cy={205} rx={22} ry={17} fill="#2A1C14" />
    <path d="M300 70 C350 40 380 90 360 170 C340 200 310 180 300 150 Z" fill="#8A5530" />
    <circle cx={210} cy={130} r={13} fill="#2A1C14" />
    <circle cx={214} cy={126} r={4} fill="#fff" />
    <path d="M70 240 C90 250 130 252 160 244" stroke="#8A5530" strokeWidth={5} fill="none" strokeLinecap="round" />
    <path d={`M80 242 C70 ${262 + lap * 40} 95 ${278 + lap * 46} 115 ${262 + lap * 34} C120 252 115 246 110 244 Z`} fill="#E56B8A" />
    <rect x={300} y={250} width={120} height={28} rx={10} fill="#E04F3A" />
  </svg>
);

export const DogWalking: React.FC<{ size?: number; t: number; style?: React.CSSProperties }> = ({ size = 640, t, style }) => {
  const leg = (ph: number) => Math.sin(t * 9 + ph) * 22;
  return (
    <svg width={size} height={size * 0.72} viewBox="0 0 640 460" style={style}>
      <path d={`M470 120 C520 60 560 20 640 ${-10 + Math.sin(t * 9) * 3}`} stroke="#E04F3A" strokeWidth={6} fill="none" />
      {[
        [210, 0],
        [250, Math.PI],
        [400, Math.PI],
        [440, 0],
      ].map(([x, ph], i) => (
        <rect key={i} x={x} y={300} width={30} height={120} rx={15} fill={i % 2 ? "#B87A3F" : "#C98A4B"} transform={`rotate(${leg(ph)} ${x + 15} 305)`} />
      ))}
      <ellipse cx={330} cy={290} rx={170} ry={78} fill="#D99A5B" />
      <path d="M160 270 C120 250 110 210 130 190" stroke="#C98A4B" strokeWidth={22} fill="none" strokeLinecap="round" transform={`rotate(${Math.sin(t * 12) * 12} 160 270)`} />
      <ellipse cx={480} cy={190} rx={80} ry={68} fill="#D99A5B" />
      <path d="M545 200 C590 200 615 215 612 235 C608 250 575 252 540 245 Z" fill="#E7B17A" />
      <ellipse cx={612} cy={225} rx={14} ry={11} fill="#2A1C14" />
      <path d="M440 135 C420 120 400 150 418 205 C430 220 452 205 455 185 Z" fill="#8A5530" />
      <circle cx={512} cy={175} r={9} fill="#2A1C14" />
      <rect x={430} y={235} width={70} height={18} rx={8} fill="#E04F3A" transform="rotate(-20 465 244)" />
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Cat fish toy (plush) with wagging tail
// ---------------------------------------------------------------------------
export const CatFish: React.FC<{ size?: number; wag?: number; style?: React.CSSProperties }> = ({ size = 420, wag = 0, style }) => (
  <svg width={size} height={size * 0.6} viewBox="0 0 500 300" style={style}>
    <defs>
      <linearGradient id="fishBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#FFB05C" />
        <stop offset="0.6" stopColor="#F07F2D" />
        <stop offset="1" stopColor="#D4621B" />
      </linearGradient>
    </defs>
    <ellipse cx={250} cy={282} rx={170} ry={12} fill="rgba(0,0,0,0.25)" />
    <g transform={`rotate(${wag * 28} 360 150)`}>
      <path d="M350 150 L480 60 C470 120 470 180 480 240 Z" fill="#E96B1F" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M370 150 L${455 - i * 4} ${85 + i * 40}`} stroke="rgba(255,255,255,0.35)" strokeWidth={5} />
      ))}
    </g>
    <ellipse cx={210} cy={150} rx={175} ry={105} fill="url(#fishBody)" />
    {[150, 215, 280].map((x) => (
      <path key={x} d={`M${x} 52 C${x + 24} 110 ${x + 24} 190 ${x} 248`} stroke="#FFF2E0" strokeWidth={16} fill="none" opacity={0.85} />
    ))}
    <path d="M170 50 C200 10 260 15 280 52 Z" fill="#E96B1F" />
    <path d="M190 245 C215 285 255 280 270 245 Z" fill="#E96B1F" />
    <circle cx={92} cy={125} r={26} fill="#fff" />
    <circle cx={86} cy={125} r={14} fill="#1B1B1F" />
    <circle cx={81} cy={119} r={5} fill="#fff" />
    <path d="M40 170 C55 182 70 182 82 172" stroke="#8C3A10" strokeWidth={6} fill="none" strokeLinecap="round" />
  </svg>
);

/** White product tile (store thumbnail / ranking thumbnail). */
export const ProductTile44: React.FC<{ kind: ProductKind; size: number; t?: number; style?: React.CSSProperties }> = ({ kind, size, t = 0, style }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.14, background: "radial-gradient(circle at 50% 40%, #FFFFFF 0%, #EEF1F6 100%)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0, ...style }}>
    {kind === "chopper" ? <Chopper size={size * 0.95} press={0} dice={1} /> : kind === "dogbottle" ? <DogBottle height={size * 0.95} bowl={0.6} level={0.7} /> : <CatFish size={size * 0.92} wag={Math.sin(t * 7)} />}
  </div>
);

export type ProductKind = "chopper" | "dogbottle" | "catfish";
export const PRODUCT_NAMES: Record<ProductKind, string> = {
  chopper: "Cortador de verduras a presión",
  dogbottle: "Botella bebedero para perros",
  catfish: "Pez de juguete con cola móvil para gatos",
};
export const PRODUCT_CATEGORY: Record<ProductKind, string> = {
  chopper: "Cocina",
  dogbottle: "Mascotas · Perros",
  catfish: "Mascotas · Gatos",
};

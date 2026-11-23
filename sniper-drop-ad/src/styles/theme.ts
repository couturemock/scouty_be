import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import fonts from "./fonts.json";

// Fonts are bundled locally (public/fonts) so renders never depend on the network.
// Inter → UI (closest match to the Drop Sniper app). Sora → editorial ad typography.
for (const [family, weight, , file, unicodeRange] of fonts as [string, string, string, string, string][]) {
  loadFont({ family, url: staticFile(`fonts/${file}`), weight, format: "woff2", unicodeRange });
}

export const INTER = "Inter, sans-serif";
export const SORA = "Sora, Inter, sans-serif";

/**
 * Palette extracted from the official logo (blue crosshair / "SNIPER")
 * and the real Drop Sniper interface (near-black panels, blue→violet CTAs).
 */
export const C = {
  // brand
  blue: "#3A63D8", // logo blue
  blueBright: "#4F7BFF", // UI accent / links
  blueSoft: "#7B97FF",
  violet: "#A855F7", // end of the CTA gradient
  white: "#F5F6F8",

  // dark world (Drop Sniper)
  ink: "#06080F",
  navy: "#0A0F1E",
  navy2: "#0E1528",
  panel: "#0F1117",
  panel2: "#14171F",
  panel3: "#1A1E28",
  line: "rgba(255,255,255,0.08)",
  line2: "rgba(255,255,255,0.14)",
  text: "#F2F3F5",
  muted: "#8B93A5",
  muted2: "#5D6475",

  // light studio world (business models)
  studio: "#ECEFF5",
  studio2: "#DDE2EC",
  studioInk: "#0D1324",
  studioMuted: "#5B6478",
  card: "#FFFFFF",

  // product accents
  coral: "#FF6B4A",
  green: "#22C55E",
  amber: "#F5B544",
};

export const CTA_GRADIENT = `linear-gradient(90deg, ${C.blueBright} 0%, #6D6BFF 50%, ${C.violet} 100%)`;

export const W = 1080;
export const H = 1920;
export const FPS = 30;

/** Safe area for Reels / TikTok / Shorts (UI overlays at top, bottom and right). */
export const SAFE = { top: 230, bottom: 400, left: 80, right: 130 };

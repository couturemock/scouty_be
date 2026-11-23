// QA helper: bundle once, render control frames and a contact sheet.
// usage: node scripts/stills.mjs <outDir> <name> <sec> [sec...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition, openBrowser } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";

const [outDir, name, ...secs] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const cache = path.join(outDir, ".bundle-url");
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), enableCaching: true });
const browser = await openBrowser("chrome", { browserExecutable: process.env.REMOTION_BROWSER ?? null, chromiumOptions: { gl: "angle" } });
const composition = await selectComposition({ serveUrl, id: process.env.COMP ?? "SniperDropAd", inputProps: {}, browserExecutable: process.env.REMOTION_BROWSER ?? null, puppeteerInstance: browser });
for (const s of secs) {
  const frame = Math.min(composition.durationInFrames - 1, Math.round(Number(s) * 30));
  const output = path.join(outDir, `${name}_${s}.png`);
  await renderStill({ serveUrl, composition, frame, output, scale: 0.5, browserExecutable: process.env.REMOTION_BROWSER ?? null, puppeteerInstance: browser, inputProps: {} });
  console.log(output);
}
await browser.close({ silent: true });

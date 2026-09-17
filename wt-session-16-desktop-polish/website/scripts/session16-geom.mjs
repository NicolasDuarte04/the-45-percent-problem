/* Session 16 verification helper (not shipped): dump per-element layout
   geometry at a given viewport width so mobile invariance can be asserted
   structurally instead of via flaky pixel comparison. Excludes the rotating
   Pulso ticker and the dev-only Tweaks bar; zero-area boxes (display:none /
   display:contents) are dropped on both sides.
     node scripts/session16-geom.mjs <outfile.json> <width> */
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const outfile = process.argv[2];
const width = Number(process.argv[3] ?? 390);
const PAGES = [
  ["home", "/voto21junio"],
  ["mapa", "/voto21junio/mapa"],
  ["tarjeta", "/voto21junio/tarjeta"],
  ["metodologia", "/voto21junio/metodologia"],
  ["quienes-somos", "/voto21junio/quienes-somos"],
  ["umbrella", "/45analytics"],
];

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width, height: 900 },
  reducedMotion: "reduce",
});
const result = {};
for (const [name, path] of PAGES) {
  await page.goto(`http://localhost:3016${path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800); // let count-ups settle
  result[name] = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("body *")) {
      if (el.closest(".ticker, .ticker-drawer")) continue;
      // dev-only Tweaks bar: fixed-position container whose text starts "Tweaks"
      const fixedRoot = el.closest("body > div > div");
      if (fixedRoot && /^\s*tweaks/i.test(fixedRoot.textContent ?? "") && getComputedStyle(fixedRoot).position === "fixed") continue;
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;
      const cls = typeof el.className === "string" ? el.className : (el.className?.baseVal ?? "");
      out.push(`${el.tagName}|${cls}|${Math.round(r.x + window.scrollX)},${Math.round(r.y + window.scrollY)},${Math.round(r.width)},${Math.round(r.height)}`);
    }
    return out;
  });
}
await browser.close();
mkdirSync(dirname(outfile), { recursive: true });
writeFileSync(outfile, JSON.stringify(result, null, 1));
console.log(`wrote ${outfile}`);

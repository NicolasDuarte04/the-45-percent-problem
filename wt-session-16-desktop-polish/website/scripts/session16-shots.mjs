/* Session 16 verification helper (not shipped): full-page screenshots of the
   six El Voto-facing pages at the four audit widths. Usage:
     node scripts/session16-shots.mjs <outdir> [width ...]
   Defaults to all four widths. Server expected on :3016. */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const outdir = process.argv[2] ?? "tmp/session16/after";
const widths = process.argv.slice(3).map(Number).filter(Boolean);
const WIDTHS = widths.length ? widths : [390, 768, 1024, 1440];
const PAGES = [
  ["home", "/voto21junio"],
  ["mapa", "/voto21junio/mapa"],
  ["tarjeta", "/voto21junio/tarjeta"],
  ["metodologia", "/voto21junio/metodologia"],
  ["quienes-somos", "/voto21junio/quienes-somos"],
  ["umbrella", "/45analytics"],
];

mkdirSync(outdir, { recursive: true });
const browser = await chromium.launch();
for (const w of WIDTHS) {
  const page = await browser.newPage({
    viewport: { width: w, height: 900 },
    reducedMotion: "reduce",
  });
  for (const [name, path] of PAGES) {
    await page.goto(`http://localhost:3016${path}`, { waitUntil: "networkidle" });
    // hide the dev-only Tweaks bar so shots reflect the shipped page
    await page.addStyleTag({ content: "[class*=tweaks i],div:has(>:text('TWEAKS')){}" }).catch(() => {});
    await page.evaluate(() => {
      for (const el of document.querySelectorAll("div,details,aside")) {
        if (/^\s*tweaks/i.test(el.textContent ?? "") && el.children.length && el.getBoundingClientRect().width < 400 && el.getBoundingClientRect().width > 0) {
          const pos = getComputedStyle(el).position;
          if (pos === "fixed") el.style.display = "none";
        }
      }
    });
    await page.screenshot({ path: `${outdir}/${name}-${w}.png`, fullPage: true });
  }
  await page.close();
}
await browser.close();
console.log(`done -> ${outdir}`);

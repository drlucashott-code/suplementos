import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "https://www.amazonpicks.com.br";
const OUT = "C:/Users/lucas/suplementos/tmp/audit";
mkdirSync(OUT, { recursive: true });

const pagesMobile = [
  ["home", "/"],
  ["grupo-suplementos", "/suplementos"],
  ["catalogo-barra", "/suplementos/barra"],
  ["ofertas", "/ofertas"],
  ["produto", "/produto/B0D461N14C"],
];
const pagesDesktop = [
  ["home", "/"],
  ["catalogo-barra", "/suplementos/barra"],
  ["ofertas", "/ofertas"],
];

const browser = await chromium.launch();

async function shoot(label, path, viewport, isMobile, suffix) {
  const ctx = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    isMobile,
    userAgent: isMobile
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      : undefined,
  });
  const pg = await ctx.newPage();
  try {
    await pg.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 });
  } catch (e) {
    await pg.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 });
  }
  await pg.waitForTimeout(1800);
  // viewport (above the fold)
  await pg.screenshot({ path: `${OUT}/${suffix}-${label}-fold.png`, fullPage: false });
  // full page
  await pg.screenshot({ path: `${OUT}/${suffix}-${label}-full.png`, fullPage: true });
  console.log(`ok ${suffix} ${label}`);
  await ctx.close();
}

for (const [label, path] of pagesMobile) {
  await shoot(label, path, { width: 390, height: 844 }, true, "m");
}
for (const [label, path] of pagesDesktop) {
  await shoot(label, path, { width: 1440, height: 900 }, false, "d");
}

await browser.close();
console.log("done");

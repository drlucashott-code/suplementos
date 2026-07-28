import { chromium } from "playwright";
import { mkdirSync } from "fs";

const BASE = "http://localhost:3000";
const OUT = "C:/Users/lucas/suplementos/tmp/audit";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();

async function shoot(label, path, viewport, isMobile, full = false) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile });
  const pg = await ctx.newPage();
  try { await pg.goto(BASE + path, { waitUntil: "networkidle", timeout: 45000 }); }
  catch { await pg.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 45000 }); }
  await pg.waitForTimeout(1500);
  await pg.screenshot({ path: `${OUT}/p1-${label}.png`, fullPage: full });
  console.log("ok", label);
  await ctx.close();
}

await shoot("catalogo-m", "/suplementos/barra", { width: 390, height: 844 }, true);
await shoot("catalogo-d", "/suplementos/barra", { width: 1440, height: 900 }, false);
await shoot("catalogo-d-full", "/suplementos/barra", { width: 1440, height: 900 }, false, true);
await shoot("produto-m", "/produto/B0D461N14C", { width: 390, height: 1100 }, true, true);

await browser.close();
console.log("done");

import { chromium } from "playwright";
const browser = await chromium.launch();
async function shot(label, path, full=false, vp={width:1440,height:900}) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
  const pg = await ctx.newPage();
  try { await pg.goto("http://localhost:3000"+path, { waitUntil:"networkidle", timeout:45000 }); }
  catch { await pg.goto("http://localhost:3000"+path, { waitUntil:"domcontentloaded", timeout:45000 }); }
  await pg.waitForTimeout(1500);
  await pg.screenshot({ path:`C:/Users/lucas/suplementos/tmp/audit/v-${label}.png`, fullPage: full });
  console.log("ok", label);
  await ctx.close();
}
await shot("home-fold", "/", false);
await shot("home-full", "/", true);
await shot("ofertas", "/ofertas", true);
await browser.close();

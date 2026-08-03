import { chromium } from "playwright";
const browser = await chromium.launch();
async function shot(label, vp, mobile) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: mobile });
  const pg = await ctx.newPage();
  try { await pg.goto("http://localhost:3000/suplementos/barra", { waitUntil:"networkidle", timeout:45000 }); }
  catch { await pg.goto("http://localhost:3000/suplementos/barra", { waitUntil:"domcontentloaded", timeout:45000 }); }
  await pg.waitForTimeout(1500);
  await pg.screenshot({ path:`C:/Users/lucas/suplementos/tmp/audit/c2-${label}.png`, fullPage:false });
  console.log("ok", label);
  await ctx.close();
}
await shot("mobile", { width: 390, height: 844 }, true);
await shot("desktop", { width: 1440, height: 900 }, false);
await browser.close();

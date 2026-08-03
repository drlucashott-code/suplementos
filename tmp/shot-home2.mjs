import { chromium } from "playwright";
const browser = await chromium.launch();
async function shot(label, vp, mobile) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: mobile });
  const pg = await ctx.newPage();
  try { await pg.goto("http://localhost:3000/", { waitUntil:"networkidle", timeout:45000 }); }
  catch { await pg.goto("http://localhost:3000/", { waitUntil:"domcontentloaded", timeout:45000 }); }
  await pg.waitForTimeout(1500);
  await pg.screenshot({ path:`C:/Users/lucas/suplementos/tmp/audit/h2-${label}.png`, fullPage:false });
  console.log("ok", label);
  await ctx.close();
}
await shot("mobile", { width: 390, height: 844 }, true);
await shot("desktop", { width: 1440, height: 700 }, false);
await browser.close();

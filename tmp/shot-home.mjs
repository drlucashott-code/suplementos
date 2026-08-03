import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 2200 }, deviceScaleFactor: 2 });
const pg = await ctx.newPage();
await pg.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 45000 });
await pg.waitForTimeout(1800);
// rola até a seção de ofertas
await pg.evaluate(() => { const el = document.getElementById("melhores-ofertas"); if (el) el.scrollIntoView(); });
await pg.waitForTimeout(1000);
await pg.screenshot({ path: "C:/Users/lucas/suplementos/tmp/audit/best-home.png", fullPage: false });
console.log("ok home");
await browser.close();

import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 1500 }, deviceScaleFactor: 2, isMobile: true });
const pg = await ctx.newPage();
await pg.goto("http://localhost:3140/suplementos/barra", { waitUntil: "networkidle", timeout: 60000 });
await pg.waitForTimeout(1500);
// top (header)
await pg.screenshot({ path: "tmp/mobilecat-top.png" });
console.log("ok");
await browser.close();

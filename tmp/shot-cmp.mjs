import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 1700 }, deviceScaleFactor: 2, isMobile: true });
const pg = await ctx.newPage();
await pg.goto("http://localhost:3142/comparar-card", { waitUntil: "networkidle", timeout: 60000 });
await pg.waitForTimeout(1500);
await pg.screenshot({ path: "tmp/cmp-full.png", fullPage: true });
console.log("ok");
await browser.close();

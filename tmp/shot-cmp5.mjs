import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 1400 }, deviceScaleFactor: 1, isMobile: true });
const pg = await ctx.newPage();
await pg.goto("http://localhost:3143/comparar-card", { waitUntil: "networkidle", timeout: 60000 });
await pg.waitForTimeout(1200);
// rola até o card B do 1º produto
await pg.evaluate(() => window.scrollTo(0, 760));
await pg.waitForTimeout(400);
await pg.screenshot({ path: "tmp/cmp5.png" });
console.log("ok");
await browser.close();

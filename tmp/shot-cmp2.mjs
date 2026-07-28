import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 1800 }, deviceScaleFactor: 2, isMobile: true });
const pg = await ctx.newPage();
await pg.goto("http://localhost:3143/comparar-card", { waitUntil: "networkidle", timeout: 60000 });
await pg.waitForTimeout(1500);
// só o primeiro produto (atual + A + B) pra ver detalhe
await pg.screenshot({ path: "tmp/cmp2-first.png", clip: { x: 0, y: 70, width: 390, height: 1080 } });
console.log("ok");
await browser.close();

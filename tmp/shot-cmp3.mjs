import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 1800 }, deviceScaleFactor: 2, isMobile: true });
const pg = await ctx.newPage();
await pg.goto("http://localhost:3143/comparar-card", { waitUntil: "networkidle", timeout: 60000 });
await pg.waitForTimeout(1200);
// localizar o card B do 1º produto e recortar em torno dele
const el = await pg.locator("text=Proposto B").first().elementHandle();
const box = await el.boundingBox();
await pg.screenshot({ path: "tmp/cmp3-B.png", clip: { x: 0, y: Math.max(0, box.y - 10), width: 390, height: 360 } });
console.log("ok", JSON.stringify(box));
await browser.close();

import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 1800 }, deviceScaleFactor: 2, isMobile: true });
const pg = await ctx.newPage();
await pg.goto("http://localhost:3143/comparar-card", { waitUntil: "networkidle", timeout: 60000 });
await pg.waitForTimeout(1200);
// a etiqueta roxa "foto + tabela à esquerda" do 1º produto
const el = await pg.locator("text=tabela à esquerda").first().elementHandle();
const box = await el.boundingBox();
console.log("label y:", box.y);
await pg.screenshot({ path: "tmp/cmp4-B.png", clip: { x: 0, y: Math.max(0, box.y - 8), width: 390, height: 340 } });
console.log("ok");
await browser.close();

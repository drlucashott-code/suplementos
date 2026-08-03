import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 1600 }, deviceScaleFactor: 2, isMobile: true });
const pg = await ctx.newPage();
await pg.goto("http://localhost:3141/suplementos/barra", { waitUntil: "networkidle", timeout: 60000 });
await pg.waitForTimeout(1500);
// página (header + filtro + 3 cards)
await pg.screenshot({ path: "tmp/eval-page.png" });
// close-up: primeiro card só
const card = await pg.$("main >> text=Resultados");
const firstCard = await pg.locator("a:has-text('Ver na Amazon')").first().elementHandle().catch(()=>null);
// captura recortada do topo da lista (um card)
await pg.screenshot({ path: "tmp/eval-card.png", clip: { x: 0, y: 250, width: 390, height: 620 } });
console.log("ok");
await browser.close();

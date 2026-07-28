import { chromium } from "playwright";
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const pg = await ctx.newPage();
await pg.goto("http://localhost:3000/suplementos/barra", { waitUntil: "networkidle", timeout: 45000 });
await pg.waitForTimeout(1500);
await pg.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await pg.waitForTimeout(1000);
await pg.screenshot({ path: "C:/Users/lucas/suplementos/tmp/audit/p1-bottom.png", fullPage: false });
// testa page 2
const resp = await pg.goto("http://localhost:3000/suplementos/barra?page=2", { waitUntil: "domcontentloaded", timeout: 45000 });
console.log("page2 status:", resp.status());
await browser.close();

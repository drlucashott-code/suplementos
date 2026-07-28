import { chromium } from "playwright";
const browser = await chromium.launch();
const url = "http://localhost:3139/preview-skeletons";
// desktop
let ctx = await browser.newContext({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1 });
let pg = await ctx.newPage();
await pg.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await pg.waitForTimeout(800);
await pg.screenshot({ path: "tmp/skel-desktop.png", fullPage: true });
await ctx.close();
// mobile
ctx = await browser.newContext({ viewport: { width: 390, height: 1400 }, deviceScaleFactor: 1 });
pg = await ctx.newPage();
await pg.goto(url, { waitUntil: "networkidle", timeout: 60000 });
await pg.waitForTimeout(800);
await pg.screenshot({ path: "tmp/skel-mobile.png", fullPage: true });
await ctx.close();
await browser.close();
console.log("ok");

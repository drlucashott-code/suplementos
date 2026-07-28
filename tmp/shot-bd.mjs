import { chromium } from "playwright";
const browser = await chromium.launch();
// best-deals mobile (produto page tem o card grande com showActions)
let ctx = await browser.newContext({ viewport:{width:390,height:900}, deviceScaleFactor:2, isMobile:true });
let pg = await ctx.newPage();
await pg.goto("http://localhost:3000/ofertas", { waitUntil:"networkidle", timeout:45000 }).catch(()=>{});
await pg.waitForTimeout(1500);
await pg.screenshot({ path:"C:/Users/lucas/suplementos/tmp/audit/bd-mobile.png", fullPage:false });
await ctx.close();
// home desktop (10 produtos)
ctx = await browser.newContext({ viewport:{width:1440,height:2200}, deviceScaleFactor:2 });
pg = await ctx.newPage();
await pg.goto("http://localhost:3000/", { waitUntil:"networkidle", timeout:45000 }).catch(()=>{});
await pg.waitForTimeout(1800);
await pg.evaluate(()=>{const el=document.getElementById("melhores-ofertas"); if(el) el.scrollIntoView();});
await pg.waitForTimeout(800);
await pg.screenshot({ path:"C:/Users/lucas/suplementos/tmp/audit/bd-home.png", fullPage:false });
await browser.close();
console.log("done");

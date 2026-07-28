import { chromium } from "playwright";
const browser = await chromium.launch();
const pg = await browser.newPage();
await pg.goto("http://localhost:3000/suplementos/barra", { waitUntil: "domcontentloaded", timeout: 45000 });
await pg.waitForTimeout(800);
const fonts = await pg.evaluate(() => {
  const pick = (sel) => {
    const el = document.querySelector(sel);
    return el ? getComputedStyle(el).fontFamily : "(não encontrado)";
  };
  return {
    body: getComputedStyle(document.body).fontFamily,
    titulo_h2: pick("h2"),
    card: pick(".font-sans"),
    preco: pick(".text-3xl"),
  };
});
console.log(JSON.stringify(fonts, null, 2));
await browser.close();

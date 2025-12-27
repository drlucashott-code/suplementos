// Canvas de edição – Importação Amazon Creatina (CORRIGIDO)
// 👉 Amazon BR NÃO aceita Relationships.Variations nem VariationAttributes no GetItems.
// Estratégia válida na PA-API v5 BR:
// 1) Usar GetVariations APENAS para descobrir ASINs filhos
// 2) Usar GetItems SEM Relationships / VariationAttributes para dados do produto

import "dotenv/config";
import fs from "fs";
import path from "path";
import paapi from "amazon-paapi";
import { PrismaClient, CreatineForm, Store } from "@prisma/client";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

/* =======================
   PATHS
======================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "../data");
const PENDENTES = path.join(DATA_DIR, "asins-pendentes.json");

/* =======================
   AMAZON CONFIG
======================= */
const commonParameters = {
  AccessKey: process.env.AMAZON_ACCESS_KEY!,
  SecretKey: process.env.AMAZON_SECRET_KEY!,
  PartnerTag: process.env.AMAZON_PARTNER_TAG!,
  PartnerType: "Associates",
  Marketplace: process.env.AMAZON_MARKETPLACE || "www.amazon.com.br",
};

/* =======================
   HELPERS JSON
======================= */
function readJSON<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
    return fallback;
  }
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJSON(file: string, data: any) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* =======================
   EXTRAÇÕES
======================= */
function extractPresentation(title: string): CreatineForm {
  const t = title.toLowerCase();
  if (t.includes("capsul")) return CreatineForm.CAPSULE;
  if (t.includes("gummy") || t.includes("goma")) return CreatineForm.GUMMY;
  return CreatineForm.POWDER;
}

function extractWeightInGrams(text: string): number {
  const kg = text.match(/(\d+(?:[.,]\d+)?)\s?kg/i);
  if (kg) return Math.round(parseFloat(kg[1].replace(",", ".")) * 1000);

  const g = text.match(/(\d+)\s?g/i);
  if (g) return parseInt(g[1], 10);

  return 0;
}

/* =======================
   AMAZON HELPERS (BR SAFE)
======================= */

// 1️⃣ Descobre variações (quando existirem)
async function getVariationAsins(asin: string): Promise<string[]> {
  try {
    const res = await paapi.GetVariations(commonParameters, {
      ASIN: asin,
      Resources: ["ItemInfo.Title"],
    });

    const items = res?.VariationsResult?.Items ?? [];

    return items.map((i: any) => i.ASIN).filter(Boolean);
  } catch {
    return [];
  }
}

// 2️⃣ Busca dados do produto (SEM Relationships / VariationAttributes)
// 2️⃣ Busca dados do produto (com retry/backoff para 429)
async function getItems(asins: string[], attempt = 1): Promise<any[]> {
  if (!asins.length) return [];

  try {
    const res = await paapi.GetItems(commonParameters, {
      ItemIds: asins,
      Resources: [
        "ItemInfo.Title",
        "ItemInfo.ByLineInfo",
        "Images.Primary.Large",
        "Offers.Listings.Price",
        "Offers.Listings.MerchantInfo",
      ],
    });

    return res?.ItemsResult?.Items ?? [];
  } catch (err: any) {
    const status = err?.status;

    // Throttling da Amazon (429)
    if (status === 429 && attempt <= 5) {
      const waitMs = attempt * 2000; // backoff progressivo
      console.log(`⏳ 429 Too Many Requests — retry ${attempt}/5 em ${waitMs}ms`);
      await new Promise((r) => setTimeout(r, waitMs));
      return getItems(asins, attempt + 1);
    }

    throw err;
  }
}

/* =======================
   MAIN
======================= */
async function run() {
  console.log("🚀 Importação Amazon — Creatina (BR SAFE)\n");

  const pendentes = readJSON<{ asins: string[] }>(PENDENTES, { asins: [] });

  for (const asinBase of [...pendentes.asins]) {
    console.log(`🔎 ASIN base: ${asinBase}`);

    let items: any[] = [];

    // 🔹 tenta descobrir variações
    const variationAsins = await getVariationAsins(asinBase);

    if (variationAsins.length > 1) {
      console.log(`🔁 ${variationAsins.length} variações encontradas`);

      const unique = [...new Set(variationAsins)];

      for (let i = 0; i < unique.length; i += 10) {
        items.push(...(await getItems(unique.slice(i, i + 10))));
      }
    } else {
      console.log("✅ Produto simples");
      items = await getItems([asinBase]);
    }

    if (!items.length) {
      console.log("⚠️ Nenhum item retornado");
      continue;
    }

    for (const item of items) {
      const asin = item.ASIN;

      const exists = await prisma.offer.findFirst({
        where: { store: Store.AMAZON, externalId: asin },
      });
      if (exists) continue;

      const title = item.ItemInfo?.Title?.DisplayValue ?? "Creatina";
      const brand =
        item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ?? "Desconhecida";

      const form = extractPresentation(title);
      const totalUnits = extractWeightInGrams(title);

      const name = ["Creatina", brand, totalUnits ? `${totalUnits}g` : "", title]
        .filter(Boolean)
        .join(" ");

      const product = await prisma.product.create({
        data: {
          category: "creatina",
          name,
          brand,
          flavor: "Sem sabor",
          imageUrl: item.Images?.Primary?.Large?.URL ?? "",
          creatineInfo: {
            create: { form, totalUnits, unitsPerDose: 0 },
          },
        },
      });

      await prisma.offer.create({
        data: {
          productId: product.id,
          store: Store.AMAZON,
          externalId: asin,
          affiliateUrl: item.DetailPageURL,
          price: 0,
        },
      });

      console.log(`✅ Criado: ${name}`);
    }

    pendentes.asins = pendentes.asins.filter((a) => a !== asinBase);
    writeJSON(PENDENTES, pendentes);

    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("🏁 Importação finalizada");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

/**
 * Importação Amazon — Whey Protein (MANUAL ASINS)
 * ✔ NÃO usa GetVariations
 * ✔ Processa apenas ASINs fornecidos
 * ✔ BR SAFE (GetItems + retry + batch 10)
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import paapi from "amazon-paapi";
import { PrismaClient, Store } from "@prisma/client";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

/* =======================
   PATHS
======================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "../data");
const PENDENTES = path.join(DATA_DIR, "asins-whey-pendentes.json");
const PROCESSADOS = path.join(DATA_DIR, "asins-whey-processados.json");
const ERROS = path.join(DATA_DIR, "asins-whey-erros.json");

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
   JSON HELPERS
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
   EXTRATORES
======================= */
function extractWeightInGrams(text: string): number {
  const kg = text.match(/(\d+(?:[.,]\d+)?)\s?kg/i);
  if (kg) return Math.round(parseFloat(kg[1].replace(",", ".")) * 1000);

  const g = text.match(/(\d+)\s?g/i);
  if (g) return parseInt(g[1], 10);

  return 0;
}

function extractFlavor(title: string): string | null {
  const flavors = [
    "chocolate",
    "baunilha",
    "morango",
    "cookies",
    "cappuccino",
    "coco",
    "doce de leite",
    "banana",
    "sem sabor",
  ];

  const t = title.toLowerCase();
  for (const f of flavors) {
    if (t.includes(f)) return f;
  }
  return null;
}

/* =======================
   AMAZON GET ITEMS (BR SAFE)
======================= */
async function getItems(asins: string[], attempt = 1): Promise<any[]> {
  if (!asins.length) return [];

  try {
    const res = await paapi.GetItems(commonParameters, {
      ItemIds: asins,
      Resources: [
        "ItemInfo.Title",
        "ItemInfo.ByLineInfo",
        "ItemInfo.ProductInfo",
        "Images.Primary.Large",
        "Offers.Listings.Price",
        "Offers.Listings.MerchantInfo",
      ],
    });

    return res?.ItemsResult?.Items ?? [];
  } catch (err: any) {
    if (err?.status === 429 && attempt <= 5) {
      const wait = attempt * 2000;
      console.log(`⏳ 429 — retry ${attempt}/5 em ${wait}ms`);
      await new Promise((r) => setTimeout(r, wait));
      return getItems(asins, attempt + 1);
    }
    throw err;
  }
}

/* =======================
   MAIN
======================= */
async function run() {
  console.log("🚀 Importação Amazon — Whey Protein (MANUAL ASINS)\n");

  const pendentes = readJSON<{ asins: string[] }>(PENDENTES, { asins: [] });
  const processados = readJSON<{ asins: string[] }>(PROCESSADOS, { asins: [] });
  const erros = readJSON<{ asins: string[] }>(ERROS, { asins: [] });

  if (!pendentes.asins.length) {
    console.log("⚠️ Nenhum ASIN pendente para processar");
    return;
  }

  for (let i = 0; i < pendentes.asins.length; i += 10) {
    const batch = pendentes.asins.slice(i, i + 10);
    console.log(`📦 Processando batch: ${batch.join(", ")}`);

    let items: any[] = [];
    try {
      items = await getItems(batch);
    } catch {
      erros.asins.push(...batch);
      continue;
    }

    for (const item of items) {
      const asin = item.ASIN;

      const exists = await prisma.offer.findFirst({
        where: { store: Store.AMAZON, externalId: asin },
      });
      if (exists) {
        processados.asins.push(asin);
        continue;
      }

      const title =
        item.ItemInfo?.Title?.DisplayValue ?? "Whey Protein";
      const brand =
        item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ?? "Desconhecida";

      const totalWeightInGrams =
        extractWeightInGrams(title) ||
        Math.round(
          (item.ItemInfo?.ProductInfo?.Size?.DisplayValue ?? "0")
            .replace(/[^\d]/g, "")
        );

      const flavor = extractFlavor(title);

      const name = [
        "Whey Protein",
        brand,
        totalWeightInGrams ? `${totalWeightInGrams}g` : "",
        title,
      ]
        .filter(Boolean)
        .join(" ");

      const product = await prisma.product.create({
        data: {
          category: "whey",
          name,
          brand,
          flavor,
          imageUrl: item.Images?.Primary?.Large?.URL ?? "",
          wheyInfo: {
            create: {
              totalWeightInGrams,
              doseInGrams: 0,
              proteinPerDoseInGrams: 0,
            },
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
      processados.asins.push(asin);
    }

    await new Promise((r) => setTimeout(r, 2000));
  }

  writeJSON(PENDENTES, { asins: [] });
  writeJSON(PROCESSADOS, processados);
  writeJSON(ERROS, erros);

  console.log("\n🏁 Importação finalizada");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

/**
 * Importação Amazon — Whey Protein (BR SAFE)
 *
 * Estratégia válida para PA-API v5 (Amazon BR):
 * 1) Usar GetVariations APENAS para descobrir ASINs filhos
 * 2) Usar GetItems SEM Relationships / VariationAttributes
 * 3) Processar TODOS os ASINs informados em data/asins-whey-pendentes.json
 * 4) Registrar processados e erros
 * 5) Remover ASIN base após processamento
 */

import "dotenv/config";
import fs from "fs";
import path from "path";
import paapi from "amazon-paapi";
import { PrismaClient, Store } from "@prisma/client";

/* =======================
   PRISMA
======================= */
const prisma = new PrismaClient();

/* =======================
   PATHS (WHEY)
======================= */
const DATA_DIR = path.resolve(process.cwd(), "data");

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

// 🔹 1) Descobre variações (limitado pela Amazon)
async function getVariationAsins(asin: string): Promise<string[]> {
  try {
    const res = await paapi.GetVariations(commonParameters, {
      ASIN: asin,
      Resources: ["ItemInfo.Title"],
    });

    const items = res?.VariationsResult?.Items ?? [];
    return items.map((i: any) => i.ASIN).filter(Boolean);
  } catch {
    console.log(`   ⚠️ Falha ao buscar variações do ASIN ${asin}`);
    return [];
  }
}

// 🔹 2) Busca dados do produto (GetItems BR SAFE)
async function getItems(
  asins: string[],
  attempt = 1
): Promise<any[]> {
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
    if (err?.status === 429 && attempt <= 5) {
      const waitMs = attempt * 2000;
      console.log(
        `⏳ 429 Too Many Requests — retry ${attempt}/5 em ${waitMs}ms`
      );
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
  console.log("🚀 Importação Amazon — Whey Protein (BR SAFE)\n");

  const pendentes = readJSON<{ asins: string[] }>(PENDENTES, { asins: [] });
  const processados = readJSON<{ asins: string[] }>(PROCESSADOS, { asins: [] });
  const erros = readJSON<{ asins: string[] }>(ERROS, { asins: [] });

  console.log("📦 ASINs pendentes:", pendentes.asins.length);

  if (!pendentes.asins.length) {
    console.log("⚠️ Nenhum ASIN pendente para processar\n");
    return;
  }

  for (const asinBase of [...pendentes.asins]) {
    console.log(`\n🔎 ASIN base: ${asinBase}`);

    let items: any[] = [];

    // 🔹 tenta descobrir variações
    const variationAsins = await getVariationAsins(asinBase);

    try {
      if (variationAsins.length > 1) {
        console.log(
          `   🔁 ${variationAsins.length} variações encontradas`
        );

        const unique = [...new Set(variationAsins)];

        for (let i = 0; i < unique.length; i += 10) {
          const chunk = unique.slice(i, i + 10);
          items.push(...(await getItems(chunk)));
          await new Promise((r) => setTimeout(r, 1000));
        }
      } else {
        console.log("   ✅ Produto simples");
        items = await getItems([asinBase]);
      }
    } catch {
      erros.asins.push(asinBase);
      continue;
    }

    if (!items.length) {
      console.log("   ⚠️ Nenhum item retornado");
      erros.asins.push(asinBase);
      continue;
    }

    for (const item of items) {
      const asin = item.ASIN;

      const exists = await prisma.offer.findFirst({
        where: { store: Store.AMAZON, externalId: asin },
      });
      if (exists) continue;

      const title =
        item.ItemInfo?.Title?.DisplayValue ?? "Whey Protein";
      const brand =
        item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ??
        "Desconhecida";

      const totalWeightInGrams = extractWeightInGrams(title);

      /**
       * PADRÃO DE TÍTULO (WHEY):
       * Whey Protein + Marca + Peso + Título Amazon
       */
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
          flavor: null,
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

      console.log(`   ✅ Criado: ${name}`);
      processados.asins.push(asin);
    }

    // remove ASIN base após processamento
    pendentes.asins = pendentes.asins.filter(
      (a) => a !== asinBase
    );

    writeJSON(PENDENTES, pendentes);
    writeJSON(PROCESSADOS, processados);
    writeJSON(ERROS, erros);

    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("\n🏁 Importação finalizada");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

/**
 * ImportAmazonGetVariation
 * Importação Amazon com GetVariations (ASIN pai)
 */

import "dotenv/config";
import paapi from "amazon-paapi";
import { PrismaClient, Store } from "@prisma/client";

/* =======================
   PRISMA
======================= */
const prisma = new PrismaClient();

/* =======================
   AMAZON CONFIG
======================= */
const commonParameters = {
  AccessKey: process.env.AMAZON_ACCESS_KEY!,
  SecretKey: process.env.AMAZON_SECRET_KEY!,
  PartnerTag: process.env.AMAZON_PARTNER_TAG!,
  PartnerType: "Associates",
  Marketplace: "www.amazon.com.br",
};

/* =======================
   FLAVORS
======================= */
const FLAVORS = [
  "chocolate",
  "chocolate branco",
  "baunilha",
  "morango",
  "cookies",
  "cookies and cream",
  "banana",
  "coco",
  "doce de leite",
  "neutro",
  "sem sabor",
  "natural",
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function extractFlavorFromText(text?: string): string | null {
  if (!text) return null;
  const n = normalize(text);

  for (const flavor of FLAVORS) {
    if (n.includes(normalize(flavor))) {
      return flavor
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }
  return null;
}

function extractWeightInGrams(text: string): number {
  const kg = text.match(/(\d+(?:[.,]\d+)?)\s?kg/i);
  if (kg) return Math.round(parseFloat(kg[1].replace(",", ".")) * 1000);

  const g = text.match(/(\d+)\s?g/i);
  if (g) return parseInt(g[1], 10);

  return 0;
}

/* =======================
   MAIN
======================= */
async function run() {
  const [, , asinBase, titlePattern, doseStr, proteinStr] =
    process.argv;

  if (!asinBase || !titlePattern || !doseStr || !proteinStr) {
    console.log(
      "❌ Uso: ts-node ImportAmazonGetVariation.ts <ASIN_BASE> <titlePattern> <dose> <protein>"
    );
    process.exit(1);
  }

  const dose = Number(doseStr);
  const proteinPerDose = Number(proteinStr);

  console.log(`🚀 Importando variações do ASIN ${asinBase}`);

  const variations = await paapi.GetVariations(
    commonParameters,
    {
      ASIN: asinBase,
      Resources: ["ItemInfo.Title", "ItemInfo.ByLineInfo"],
    }
  );

  const items = variations?.VariationsResult?.Items ?? [];
  console.log(`🔁 ${items.length} variações encontradas`);

  for (const item of items) {
    const asin = item.ASIN;
    if (!asin) continue;

    const title =
      item.ItemInfo?.Title?.DisplayValue ?? "";
    const brand =
      item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ??
      "Desconhecida";

    const flavor = extractFlavorFromText(title);
    const weight = extractWeightInGrams(title);

    const finalName = titlePattern
      .replace("{brand}", brand)
      .replace("{weight}", weight ? `${weight}g` : "")
      .replace("{title}", title);

    const exists = await prisma.offer.findFirst({
      where: { store: Store.AMAZON, externalId: asin },
    });

    if (exists) {
      console.log(`⚠️ ${asin} já existe, ignorado`);
      continue;
    }

    const product = await prisma.product.create({
      data: {
        category: "whey",
        name: finalName,
        brand,
        flavor,
        imageUrl: item.Images?.Primary?.Large?.URL ?? "",
        wheyInfo: {
          create: {
            totalWeightInGrams: weight,
            doseInGrams: dose,
            proteinPerDoseInGrams: proteinPerDose,
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

    console.log(`✅ Criado: ${finalName}`);
  }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

/**
 * ImportAmazonGetItem
 * Importação Amazon usando GetItems (produto simples)
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
  const [, , asin, titlePattern, doseStr, proteinStr] = process.argv;

  if (!asin || !titlePattern || !doseStr || !proteinStr) {
    console.log(
      "❌ Uso: ts-node ImportAmazonGetItem.ts <ASIN> <titlePattern> <dose> <protein>"
    );
    process.exit(1);
  }

  const dose = Number(doseStr);
  const proteinPerDose = Number(proteinStr);

  console.log(`🚀 Importando ASIN ${asin} (GetItem)`);

  const res = await paapi.GetItems(commonParameters, {
    ItemIds: [asin],
    Resources: [
      "ItemInfo.Title",
      "ItemInfo.ByLineInfo",
      "Images.Primary.Large",
    ],
  });

  const item = res?.ItemsResult?.Items?.[0];
  if (!item) {
    console.log("❌ Produto não encontrado");
    return;
  }

  const title = item.ItemInfo?.Title?.DisplayValue ?? "";
  const brand =
    item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ??
    "Desconhecida";

  const weight = extractWeightInGrams(title);
  const flavor = extractFlavorFromText(title);

  const finalName = titlePattern
    .replace("{brand}", brand)
    .replace("{weight}", weight ? `${weight}g` : "")
    .replace("{title}", title);

  const exists = await prisma.offer.findFirst({
    where: { store: Store.AMAZON, externalId: asin },
  });

  if (exists) {
    console.log("⚠️ ASIN já importado, ignorando");
    return;
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

  console.log("✅ Importado com sucesso:");
  console.log({
    asin,
    name: finalName,
    flavor,
    dose,
    proteinPerDose,
  });
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

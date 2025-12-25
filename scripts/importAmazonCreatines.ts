import "dotenv/config";
import fs from "fs";
import path from "path";
import paapi from "amazon-paapi";
import { PrismaClient, CreatineForm, Store } from "@prisma/client";

const prisma = new PrismaClient();

/* =======================
   TIPOS
======================= */

type PendentesFile = {
  asins: string[];
};

type ProcessadoItem = {
  asin: string;
  title: string;
  date: string;
};

type ProcessadosFile = {
  items: ProcessadoItem[];
};

type ErroItem = {
  asin: string;
  error: string;
  date: string;
};

type ErrosFile = {
  items: ErroItem[];
};

/* =======================
   PATHS
======================= */

const DATA_DIR = path.resolve("data");

const PENDENTES = path.join(DATA_DIR, "asins-pendentes.json");
const PROCESSADOS = path.join(DATA_DIR, "asins-processados.json");
const ERROS = path.join(DATA_DIR, "asins-erros.json");

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
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
    return fallback;
  }

  const content = fs.readFileSync(file, "utf-8").trim();
  if (!content) return fallback;

  return JSON.parse(content) as T;
}

function writeJSON(file: string, data: any) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* =======================
   PARSERS
======================= */

function extractWeightInGrams(title: string, size?: string): number | null {
  const source = `${title} ${size ?? ""}`.toLowerCase();

  const kg = source.match(/(\d+(?:[.,]\d+)?)\s?kg/);
  if (kg) return Math.round(parseFloat(kg[1].replace(",", ".")) * 1000);

  const g = source.match(/(\d+)\s?g/);
  if (g) return parseInt(g[1], 10);

  return null;
}

function extractUnitsFromSize(size?: string): number | null {
  if (!size) return null;
  const m = size.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function extractPresentation(title: string): CreatineForm {
  const t = title.toLowerCase();
  if (t.includes("gummy") || t.includes("gomas")) return CreatineForm.GUMMY;
  if (t.includes("capsula") || t.includes("cápsula")) return CreatineForm.CAPSULE;
  return CreatineForm.POWDER;
}

function extractFlavor(item: any, title: string): string {
  const attrs = item.VariationAttributes;
  if (Array.isArray(attrs)) {
    const flavor = attrs.find((a: any) => a.Name === "flavor_name");
    if (flavor?.Value) return flavor.Value;
  }

  const t = title.toLowerCase();
  if (t.includes("sem sabor") || t.includes("unflavored")) return "Sem sabor";
  if (t.includes("morango")) return "Morango";
  if (t.includes("chocolate")) return "Chocolate";
  if (t.includes("baunilha")) return "Baunilha";
  if (t.includes("uva")) return "Uva";
  if (t.includes("limão")) return "Limão";

  return "Sem sabor";
}

/* =======================
   NORMALIZAÇÃO
======================= */

function normalizeItem(item: any) {
  const title = item.ItemInfo?.Title?.DisplayValue ?? "";
  const brand =
    item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ?? "Desconhecida";

  const presentation = extractPresentation(title);
  const isPure = /pure|pura|100%/i.test(title);

  const size =
    item.ItemInfo?.ProductInfo?.Size?.DisplayValue ??
    item.VariationAttributes?.find((a: any) => a.Name === "size_name")?.Value ??
    "";

  let totalUnits = 0;
  let unitsPerDose: number | null = null;

  if (presentation === CreatineForm.POWDER) {
    totalUnits = extractWeightInGrams(title, size) ?? 0;
    if (isPure) unitsPerDose = 3;
  } else {
    totalUnits = extractUnitsFromSize(size) ?? 0;
  }

  const flavor = extractFlavor(item, title);

  const name = [
    "Creatina",
    isPure ? "Pura" : null,
    brand,
    presentation === CreatineForm.POWDER
      ? `${totalUnits}g`
      : `${totalUnits} unidades`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    asin: item.ASIN,
    title,
    name,
    brand,
    flavor,
    form: presentation,
    totalUnits,
    unitsPerDose,
    imageUrl: item.Images?.Primary?.Large?.URL ?? "",
    affiliateUrl: item.DetailPageURL,
  };
}

/* =======================
   MAIN
======================= */

async function run() {
  console.log("🚀 Importação Amazon — PRODUTOS\n");

  const pendentes = readJSON<PendentesFile>(PENDENTES, { asins: [] });
  const processados = readJSON<ProcessadosFile>(PROCESSADOS, { items: [] });
  const erros = readJSON<ErrosFile>(ERROS, { items: [] });

  for (const asin of [...pendentes.asins]) {
    console.log(`🔎 ASIN: ${asin}\n`);

    try {
      let items: any[] = [];

      try {
        const variations = await paapi.GetVariations(commonParameters, {
          ASIN: asin,
          Resources: [
            "ItemInfo.Title",
            "ItemInfo.ByLineInfo",
            "ItemInfo.ProductInfo",
            "Images.Primary.Large",
          ],
        });

        items = variations?.VariationsResult?.Items ?? [];
      } catch {
        // ignora
      }

      if (items.length === 0) {
        const fallback = await paapi.GetItems(commonParameters, {
          ItemIds: [asin],
          Resources: [
            "ItemInfo.Title",
            "ItemInfo.ByLineInfo",
            "ItemInfo.ProductInfo",
            "Images.Primary.Large",
          ],
        });

        items = fallback?.ItemsResult?.Items ?? [];
      }

      for (const item of items) {
        const exists = await prisma.offer.findFirst({
          where: {
            store: Store.AMAZON,
            externalId: item.ASIN,
          },
        });

        if (exists) continue;

        const data = normalizeItem(item);

        const product = await prisma.product.create({
          data: {
            category: "creatina",
            name: data.name,
            brand: data.brand,
            flavor: data.flavor,
            imageUrl: data.imageUrl,
            creatineInfo: {
              create: {
                form: data.form,
                totalUnits: data.totalUnits,
                unitsPerDose: data.unitsPerDose ?? 0,
              },
            },
          },
        });

        await prisma.offer.create({
          data: {
            productId: product.id,
            store: Store.AMAZON,
            externalId: data.asin,
            affiliateUrl: data.affiliateUrl,
            price: 0,
          },
        });
      }

      processados.items.push({
        asin,
        title: items[0]?.ItemInfo?.Title?.DisplayValue ?? "",
        date: new Date().toISOString(),
      });

      pendentes.asins = pendentes.asins.filter((a) => a !== asin);

      console.log("✅ Importado com sucesso\n");
    } catch (err: any) {
      erros.items.push({
        asin,
        error: err?.message ?? "Erro desconhecido",
        date: new Date().toISOString(),
      });

      pendentes.asins = pendentes.asins.filter((a) => a !== asin);

      console.error("❌ Erro ao importar:", err?.message, "\n");
    }

    writeJSON(PENDENTES, pendentes);
    writeJSON(PROCESSADOS, processados);
    writeJSON(ERROS, erros);

    console.log("------------------------------------------------\n");
  }

  console.log("🏁 Importação finalizada");
}

run();

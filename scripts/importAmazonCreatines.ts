import "dotenv/config";
import fs from "fs";
import path from "path";
import paapi from "amazon-paapi";
import { PrismaClient, CreatineForm, Store } from "@prisma/client";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

/* =======================
   PATHS (CORRIGIDO)
======================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, "../data");
const PENDENTES = path.join(DATA_DIR, "asins-pendentes.json");
const PROCESSADOS = path.join(DATA_DIR, "asins-processados.json");
const ERROS = path.join(DATA_DIR, "asins-erros.json");

/* =======================
   TIPOS
======================= */
type PendentesFile = {
  asins: string[];
};

type ProcessadoItem = {
  asin: string;
  date: string;
};

type ErroItem = {
  asin: string;
  error: string;
  date: string;
};

/* =======================
   AMAZON CONFIG
======================= */
const commonParameters = {
  AccessKey: process.env.AMAZON_ACCESS_KEY!,
  SecretKey: process.env.AMAZON_SECRET_KEY!,
  PartnerTag: process.env.AMAZON_PARTNER_TAG!,
  PartnerType: "Associates",
  Marketplace:
    process.env.AMAZON_MARKETPLACE || "www.amazon.com.br",
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

  const content = fs.readFileSync(file, "utf-8").trim();
  if (!content) return fallback;

  return JSON.parse(content) as T;
}

function writeJSON(file: string, data: any) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/* =======================
   HELPERS PRODUTO
======================= */
function extractPresentation(title: string): CreatineForm {
  const t = title.toLowerCase();
  if (t.includes("capsul")) return CreatineForm.CAPSULE;
  if (t.includes("gummy") || t.includes("gomas"))
    return CreatineForm.GUMMY;
  return CreatineForm.POWDER;
}

function extractWeightInGrams(title: string): number {
  const kg = title.match(/(\d+(?:[.,]\d+)?)\s?kg/i);
  if (kg)
    return Math.round(
      parseFloat(kg[1].replace(",", ".")) * 1000
    );

  const g = title.match(/(\d+)\s?g/i);
  if (g) return parseInt(g[1], 10);

  return 0;
}

/* =======================
   MAIN
======================= */
async function run() {
  console.log("🚀 Importação Amazon — Creatina\n");

  const pendentes = readJSON<PendentesFile>(PENDENTES, {
    asins: [],
  });
  const processados = readJSON<{ items: ProcessadoItem[] }>(
    PROCESSADOS,
    { items: [] }
  );
  const erros = readJSON<{ items: ErroItem[] }>(ERROS, {
    items: [],
  });

  if (!pendentes.asins.length) {
    console.log("Nenhum ASIN pendente.");
    return;
  }

  for (const asinBase of [...pendentes.asins]) {
    console.log(`🔎 ASIN base: ${asinBase}`);

    try {
      let items: any[] = [];

      try {
        const variations = await paapi.GetVariations(
          commonParameters,
          {
            ASIN: asinBase,
            Resources: [
              "ItemInfo.Title",
              "ItemInfo.ByLineInfo",
              "Images.Primary.Large",
            ],
          }
        );

        items =
          variations?.VariationsResult?.Items ?? [];
      } catch {
        // ignora e tenta fallback
      }

      if (!items.length) {
        const fallback = await paapi.GetItems(
          commonParameters,
          {
            ItemIds: [asinBase],
            Resources: [
              "ItemInfo.Title",
              "ItemInfo.ByLineInfo",
              "Images.Primary.Large",
            ],
          }
        );

        items = fallback?.ItemsResult?.Items ?? [];
      }

      for (const item of items) {
        const asin = item.ASIN;

        const exists = await prisma.offer.findFirst({
          where: {
            store: Store.AMAZON,
            externalId: asin,
          },
        });

        if (exists) continue;

        const title =
          item.ItemInfo?.Title?.DisplayValue ??
          "Creatina";

        const brand =
          item.ItemInfo?.ByLineInfo?.Brand
            ?.DisplayValue ?? "Desconhecida";

        const form = extractPresentation(title);
        const totalUnits =
          form === CreatineForm.POWDER
            ? extractWeightInGrams(title)
            : 0;

        const product = await prisma.product.create({
          data: {
            category: "creatina",
            name: title,
            brand,
            flavor: null,
            imageUrl:
              item.Images?.Primary?.Large?.URL ?? "",
            creatineInfo: {
              create: {
                form,
                totalUnits,
                unitsPerDose: 0,
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

        console.log(`✅ Criado produto ${asin}`);
      }

      processados.items.push({
        asin: asinBase,
        date: new Date().toISOString(),
      });

      pendentes.asins = pendentes.asins.filter(
        (a) => a !== asinBase
      );
    } catch (e: any) {
      console.error(
        `❌ Erro no ASIN ${asinBase}:`,
        e?.message
      );

      erros.items.push({
        asin: asinBase,
        error: e?.message ?? "Erro desconhecido",
        date: new Date().toISOString(),
      });

      pendentes.asins = pendentes.asins.filter(
        (a) => a !== asinBase
      );
    }

    writeJSON(PENDENTES, pendentes);
    writeJSON(PROCESSADOS, processados);
    writeJSON(ERROS, erros);

    console.log("--------------------------------\n");
  }

  console.log("🏁 Importação finalizada");
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

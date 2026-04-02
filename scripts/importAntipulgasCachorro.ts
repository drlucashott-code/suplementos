import "dotenv/config";
import { Prisma } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../src/lib/prisma";
import { getDynamicVisibilityBoolean } from "../src/lib/dynamicVisibility";
import {
  getAmazonItems,
  getAmazonItemPrice,
  getAmazonItemTitle,
} from "../src/lib/amazonApiClient";

type InputItem = {
  asin: string;
  nome: string;
  marca: string | null;
  tipo_pet: string | null;
  forma: string | null;
  unidades: number | null;
  peso_pet_min: number | null;
  peso_pet_max: number | null;
  linha: string | null;
};

const CATEGORY_GROUP = "casa";
const CATEGORY_GROUP_NAME = "Casa";
const CATEGORY_SLUG_DOG = "antipulgas-cachorro";
const CATEGORY_SLUG_CAT = "antipulgas-gato";
const CATEGORY_NAME_DOG = "Antipulgas - Cachorro";
const CATEGORY_NAME_CAT = "Antipulgas - Gato";
const CATEGORY_IMAGE =
  "https://m.media-amazon.com/images/I/61m0o1yU32L._AC_SL1200_.jpg";
const DEFAULT_VISIBILITY = "pending";
const BATCH_SIZE = 10;
const AMAZON_RESOURCES = [
  "ItemInfo.Title",
  "ItemInfo.ByLineInfo",
  "Offers.Listings.Price",
  "OffersV2.Listings.Price",
  "Images.Primary.Large",
];

const categoryDisplayConfig = {
  settings: {
    analysisTitleTemplate: "",
    enabledSorts: ["discount", "price_asc"],
    defaultSort: "discount",
    primaryMetricPreset: "units",
    primaryMetricLabel: "Unidades",
    primaryMetricUnitLabel: "un",
    primaryMetricAttributeKey: "unidades",
    primaryMetricPriceKey: "precoPorUnidade",
    primaryMetricPriceLabel: "Por unidade",
  },
  fields: [
    {
      key: "unidades",
      label: "Unidades",
      type: "number",
      visibility: "public_table",
      filterable: true,
    },
    {
      key: "precoPorUnidade",
      label: "Por unidade",
      type: "currency",
      visibility: "public_table",
      filterable: false,
    },
    {
      key: "tipo_pet",
      label: "Tipo",
      type: "text",
      visibility: "public_table",
      filterable: true,
    },
    {
      key: "forma",
      label: "Forma",
      type: "text",
      visibility: "public_table",
      filterable: true,
    },
    {
      key: "peso_pet_min",
      label: "Peso min (kg)",
      type: "number",
      visibility: "public_table",
      filterable: true,
    },
    {
      key: "peso_pet_max",
      label: "Peso max (kg)",
      type: "number",
      visibility: "public_table",
      filterable: true,
    },
    {
      key: "linha",
      label: "Linha",
      type: "text",
      visibility: "public_table",
      filterable: true,
    },
  ],
} as const;

function buildAffiliateUrl(asin: string) {
  const tag = process.env.AMAZON_PARTNER_TAG ?? "";
  const suffix = tag ? `?tag=${tag}` : "";
  return `https://www.amazon.com.br/dp/${asin}${suffix}`;
}

function loadData() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dataPath = path.resolve(__dirname, "../data/antipulgas-cachorro.json");
  const raw = fs.readFileSync(dataPath, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Arquivo de dados invalido: esperado array JSON.");
  }
  return parsed as InputItem[];
}

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    output.push(items.slice(i, i + size));
  }
  return output;
}

async function ensureCategory(slug: string, name: string) {
  const existing = await prisma.dynamicCategory.findFirst({
    where: { group: CATEGORY_GROUP, slug },
  });

  if (existing) {
    return prisma.dynamicCategory.update({
      where: { id: existing.id },
      data: {
        groupName: CATEGORY_GROUP_NAME,
        name,
        imageUrl: CATEGORY_IMAGE,
        displayConfig: categoryDisplayConfig as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return prisma.dynamicCategory.create({
    data: {
      group: CATEGORY_GROUP,
      groupName: CATEGORY_GROUP_NAME,
      slug,
      name,
      imageUrl: CATEGORY_IMAGE,
      displayConfig: categoryDisplayConfig as unknown as Prisma.InputJsonValue,
    },
  });
}

async function fetchAmazonData(asins: string[]) {
  const items = await getAmazonItems({
    itemIds: asins,
    resources: AMAZON_RESOURCES,
  });

  const map = new Map<
    string,
    { price: number; imageUrl: string | null; title: string }
  >();

  for (const item of items) {
    const asin = item.ASIN;
    if (!asin) continue;
    const price = getAmazonItemPrice(item);
    const title = getAmazonItemTitle(item);
    const imageUrl =
      item.Images?.Primary?.Large?.URL ??
      (item.Images as { Variants?: Array<{ Large?: { URL?: string } }> })
        ?.Variants?.[0]?.Large?.URL ??
      null;
    map.set(asin, { price, imageUrl, title });
  }

  return map;
}

async function main() {
  process.env.AMAZON_API_PROVIDER = "creators";
  const items = loadData();
  if (items.length === 0) {
    console.log("Nenhum item para importar.");
    return;
  }

  const [dogCategory, catCategory] = await Promise.all([
    ensureCategory(CATEGORY_SLUG_DOG, CATEGORY_NAME_DOG),
    ensureCategory(CATEGORY_SLUG_CAT, CATEGORY_NAME_CAT),
  ]);

  const asinList = items.map((item) => item.asin.trim()).filter(Boolean);
  const amazonData = new Map<
    string,
    { price: number; imageUrl: string | null; title: string }
  >();
  for (const batch of chunk(asinList, BATCH_SIZE)) {
    const batchData = await fetchAmazonData(batch);
    for (const [asin, data] of batchData.entries()) {
      amazonData.set(asin, data);
    }
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const missingFromApi = new Set<string>();

  for (const item of items) {
    const asin = (item.asin || "").trim();
    if (!asin) {
      skipped += 1;
      continue;
    }

    const tipoPet = (item.tipo_pet || "cachorro").toLowerCase().trim();
    const attributes = {
      brand: item.marca ?? undefined,
      tipo_pet: tipoPet,
      forma: item.forma ?? undefined,
      unidades: item.unidades ?? undefined,
      peso_pet_min: item.peso_pet_min ?? undefined,
      peso_pet_max: item.peso_pet_max ?? undefined,
      linha: item.linha ?? undefined,
    };

    const categoryId = tipoPet === "gato" ? catCategory.id : dogCategory.id;
    const amazonInfo = amazonData.get(asin);
    if (!amazonInfo) {
      missingFromApi.add(asin);
    }

    const existing = await prisma.dynamicProduct.findUnique({
      where: { asin },
      select: { id: true, totalPrice: true, imageUrl: true },
    });

    if (existing) {
      const totalPrice =
        amazonInfo && amazonInfo.price > 0 ? amazonInfo.price : existing.totalPrice;
      const imageUrl = amazonInfo?.imageUrl ?? existing.imageUrl;
      await prisma.dynamicProduct.update({
        where: { id: existing.id },
        data: {
          name: item.nome,
          categoryId,
          url: buildAffiliateUrl(asin),
          attributes,
          totalPrice,
          imageUrl,
        },
      });
      updated += 1;
      continue;
    }

    await prisma.dynamicProduct.create({
      data: {
        asin,
        name: item.nome,
        totalPrice: amazonInfo?.price ?? 0,
        url: buildAffiliateUrl(asin),
        imageUrl: amazonInfo?.imageUrl ?? null,
        categoryId,
        attributes,
        visibilityStatus: DEFAULT_VISIBILITY,
        isVisibleOnSite: getDynamicVisibilityBoolean(DEFAULT_VISIBILITY),
      },
    });
    created += 1;
  }

  if (missingFromApi.size > 0) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const debugPath = path.resolve(
      __dirname,
      "../data/antipulgas-cachorro-missing.json"
    );
    fs.writeFileSync(
      debugPath,
      JSON.stringify(Array.from(missingFromApi), null, 2)
    );
  }

  console.log(
    JSON.stringify(
      {
        total: items.length,
        created,
        updated,
        skipped,
        missingFromApi: missingFromApi.size,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

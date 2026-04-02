import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getAmazonItemsRaw } from "../src/lib/amazonApiClient";

const RESOURCE_SETS: string[][] = [
  [
    "ItemInfo.Title",
    "ItemInfo.ByLineInfo",
    "ItemInfo.Features",
    "ItemInfo.ProductInfo",
    "ItemInfo.Classifications",
    "BrowseNodeInfo.BrowseNodes",
    "Offers.Listings.Price",
    "Offers.Listings.Savings",
    "Offers.Listings.Price.PerUnitPrice",
    "Images.Primary.Large",
    "Images.Variants.Large",
  ],
  [
    "ItemInfo.Title",
    "ItemInfo.ByLineInfo",
    "ItemInfo.Features",
    "ItemInfo.ProductInfo",
    "ItemInfo.Classifications",
    "BrowseNodeInfo.BrowseNodes",
    "Offers.Listings.Price",
    "Offers.Listings.SavingBasis",
    "Images.Primary.Large",
    "Images.Variants.Large",
  ],
  [
    "ItemInfo.Title",
    "ItemInfo.ByLineInfo",
    "ItemInfo.Features",
    "ItemInfo.ProductInfo",
    "ItemInfo.Classifications",
    "BrowseNodeInfo.BrowseNodes",
    "Offers.Listings.Price",
    "Images.Primary.Large",
    "Images.Variants.Large",
  ],
  [
    "ItemInfo.Title",
    "ItemInfo.ByLineInfo",
    "Offers.Listings.Price",
    "Images.Primary.Large",
  ],
];

const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 300;
const RETRY_LIMIT = 3;
const RETRY_DELAY_MS = 800;
const DEBUG_LOG_PATH = "produtos_raw_debug.json";

function parseFlagValue(flag: string) {
  const arg = process.argv.find((entry) => entry.startsWith(`${flag}=`));
  return arg ? arg.slice(flag.length + 1) : "";
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
}

function readAsinsFromFile(filePath: string) {
  const raw = fs.readFileSync(filePath, "utf-8").trim();
  if (!raw) return [];

  if (raw.startsWith("[")) {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  }

  return raw
    .split(/\r?\n|,/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    output.push(items.slice(i, i + size));
  }
  return output;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractErrors(raw: unknown) {
  const maybeErrors = (raw as any)?.Errors;
  return Array.isArray(maybeErrors) ? maybeErrors : [];
}

function hasInvalidResourcesError(raw: unknown) {
  const errors = extractErrors(raw);
  return errors.some((err: any) => err?.Code === "InvalidParameterValue");
}

async function fetchItemsWithRetryRaw(asins: string[], resources: string[]) {
  let attempt = 0;
  let lastRaw: unknown = null;

  while (attempt < RETRY_LIMIT) {
    const rawResult = await getAmazonItemsRaw({
      itemIds: asins,
      resources,
    });

    lastRaw = rawResult.raw;

    if (rawResult.items.length > 0 || asins.length === 0) {
      return { items: rawResult.items, raw: rawResult.raw };
    }

    attempt += 1;
    if (attempt < RETRY_LIMIT) {
      await delay(RETRY_DELAY_MS);
    }
  }

  return { items: [], raw: lastRaw };
}

async function fetchWithResourceFallback(asins: string[]) {
  for (const resources of RESOURCE_SETS) {
    const result = await fetchItemsWithRetryRaw(asins, resources);
    if (!hasInvalidResourcesError(result.raw)) {
      return { ...result, resourcesUsed: resources };
    }
  }

  const fallbackResources = RESOURCE_SETS[RESOURCE_SETS.length - 1] ?? [];
  const result = await fetchItemsWithRetryRaw(asins, fallbackResources);
  return { ...result, resourcesUsed: fallbackResources };
}

async function main() {
  process.env.AMAZON_API_PROVIDER = "paapi";

  const asinsRaw = parseFlagValue("--asins");
  const fileRaw = parseFlagValue("--file");
  const batchSize = Number(parseFlagValue("--batch") || String(BATCH_SIZE));
  const debug = hasFlag("--debug");

  let asins: string[] = [];
  if (fileRaw) {
    asins = readAsinsFromFile(fileRaw);
  } else if (asinsRaw) {
    asins = asinsRaw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  } else {
    asins = process.argv.slice(2).filter((item) => !item.startsWith("--"));
  }

  if (asins.length === 0) {
    console.log("Nenhum ASIN informado. Use --asins=ASIN1,ASIN2 ou --file=caminho.");
    return;
  }

  const items: unknown[] = [];
  const debugBatches: Array<{ asins: string[]; raw: unknown; resourcesUsed?: string[] }> = [];
  const missingAsins: string[] = [];
  const batches = chunk(asins, Math.max(1, batchSize));

  for (const [index, batch] of batches.entries()) {
    const rawResult = await fetchWithResourceFallback(batch);
    const batchItems = rawResult.items;
    const rawResponse = rawResult.raw;
    if (debug || batchItems.length === 0 || hasInvalidResourcesError(rawResponse)) {
      debugBatches.push({
        asins: batch,
        raw: rawResponse,
        resourcesUsed: rawResult.resourcesUsed,
      });
    }
    const returnedAsins = new Set(batchItems.map((item: any) => item?.ASIN).filter(Boolean));

    items.push(...batchItems);
    batch.forEach((asin) => {
      if (!returnedAsins.has(asin)) {
        missingAsins.push(asin);
      }
    });

    if (index < batches.length - 1 && BATCH_DELAY_MS > 0) {
      await delay(BATCH_DELAY_MS);
    }
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const outputPath = path.resolve(__dirname, "../produtos_raw.json");

  fs.writeFileSync(outputPath, JSON.stringify(items, null, 2));

  if (debugBatches.length > 0) {
    const debugPath = path.resolve(__dirname, `../${DEBUG_LOG_PATH}`);
    fs.writeFileSync(debugPath, JSON.stringify(debugBatches, null, 2));
  }

  console.log(
    JSON.stringify(
      {
        outputPath,
        requested: asins.length,
        returned: items.length,
        missing: missingAsins.length,
        debug: debugBatches.length > 0 ? DEBUG_LOG_PATH : null,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

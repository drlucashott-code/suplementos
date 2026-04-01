import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../src/lib/prisma";
import { getAmazonItems, getAmazonItemTitle } from "../src/lib/amazonApiClient";

type BackupItem = {
  id: string;
  asin: string;
  name: string;
  categorySlug: string;
  categoryName: string;
  updatedAt: string;
};

type UpdateResult = {
  asin: string;
  id: string;
  oldName: string;
  newName: string;
  categorySlug: string;
};

const RESOURCES = ["ItemInfo.Title"];
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 200;
const RETRY_LIMIT = 3;
const RETRY_DELAY_MS = 800;
const SECOND_PASS_BATCH_SIZE = 5;
const SECOND_PASS_DELAY_MS = 400;

function parseFlagValue(flag: string) {
  const arg = process.argv.find((entry) => entry.startsWith(`${flag}=`));
  return arg ? arg.slice(flag.length + 1) : "";
}

function hasFlag(flag: string) {
  return process.argv.includes(flag);
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

async function fetchItemsWithRetry(asins: string[]) {
  let attempt = 0;
  let items: Awaited<ReturnType<typeof getAmazonItems>> = [];

  while (attempt < RETRY_LIMIT) {
    items = await getAmazonItems({
      itemIds: asins,
      resources: RESOURCES,
    });

    if (items.length > 0 || asins.length === 0) {
      return items;
    }

    attempt += 1;
    if (attempt < RETRY_LIMIT) {
      await delay(RETRY_DELAY_MS);
    }
  }

  return items;
}

function buildBackupPath() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const now = new Date();
  const stamp = now
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "Z");
  const dir = path.resolve(__dirname, "../data/backups");
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `supplement-names-backup_${stamp}.json`);
}

function findLatestMissingPath() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dir = path.resolve(__dirname, "../data/backups");
  if (!fs.existsSync(dir)) return null;

  const candidates = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith("supplement-names-backup_") && name.endsWith("_missing.json"))
    .map((name) => path.join(dir, name));

  if (candidates.length === 0) return null;

  const sorted = candidates
    .map((filePath) => ({
      filePath,
      mtimeMs: fs.statSync(filePath).mtimeMs,
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return sorted[0]?.filePath ?? null;
}

function loadMissingAsins(filePath: string) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8");
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as string[];
    if (Array.isArray(parsed?.items)) return parsed.items as string[];
  } catch {
    return [];
  }
  return [];
}

async function main() {
  process.env.AMAZON_API_PROVIDER = "paapi";
  const limit = Number(parseFlagValue("--limit") || "0");
  const dryRun = hasFlag("--dry-run");
  const categorySlugFilter = parseFlagValue("--slug");
  const missingFile = parseFlagValue("--missing-file");
  const onlyMissing = hasFlag("--only-missing");

  const missingPath =
    (missingFile && missingFile.trim()) || (onlyMissing ? findLatestMissingPath() : null);
  const missingAsinsFromFile = missingPath ? loadMissingAsins(missingPath) : [];

  const products = await prisma.dynamicProduct.findMany({
    where: {
      category: {
        group: "suplementos",
        ...(categorySlugFilter ? { slug: categorySlugFilter } : {}),
      },
      ...(missingAsinsFromFile.length > 0 ? { asin: { in: missingAsinsFromFile } } : {}),
    },
    select: {
      id: true,
      asin: true,
      name: true,
      updatedAt: true,
      category: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    ...(limit > 0 ? { take: limit } : {}),
  });

  if (products.length === 0) {
    console.log("Nenhum produto encontrado para atualizar.");
    return;
  }

  const backupPath = buildBackupPath();
  const backupItems: BackupItem[] = products.map((product) => ({
    id: product.id,
    asin: product.asin,
    name: product.name,
    categorySlug: product.category.slug,
    categoryName: product.category.name,
    updatedAt: product.updatedAt.toISOString(),
  }));

  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total: backupItems.length,
        items: backupItems,
      },
      null,
      2
    )
  );

  const byAsin = new Map(products.map((product) => [product.asin, product]));
  const updates: UpdateResult[] = [];
  const missingAsins: string[] = [];
  const unchangedAsins: string[] = [];

  const asinBatches = chunk(products.map((p) => p.asin), BATCH_SIZE);
  for (const [index, batch] of asinBatches.entries()) {
    const items = await fetchItemsWithRetry(batch);

    const itemByAsin = new Map(items.map((item) => [item.ASIN, item]));

    for (const asin of batch) {
      const product = byAsin.get(asin);
      if (!product) continue;

      const item = itemByAsin.get(asin);
      if (!item) {
        missingAsins.push(asin);
        continue;
      }

      const amazonTitle = getAmazonItemTitle(item).trim();
      if (!amazonTitle) {
        missingAsins.push(asin);
        continue;
      }

      if (amazonTitle === product.name) {
        unchangedAsins.push(asin);
        continue;
      }

      updates.push({
        asin,
        id: product.id,
        oldName: product.name,
        newName: amazonTitle,
        categorySlug: product.category.slug,
      });

      if (!dryRun) {
        await prisma.dynamicProduct.update({
          where: { id: product.id },
          data: { name: amazonTitle },
        });
      }
    }

    if (index < asinBatches.length - 1 && BATCH_DELAY_MS > 0) {
      await delay(BATCH_DELAY_MS);
    }
  }

  if (missingAsins.length > 0) {
    const secondPassBatches = chunk(missingAsins, SECOND_PASS_BATCH_SIZE);
    missingAsins.length = 0;

    for (const [index, batch] of secondPassBatches.entries()) {
      const items = await fetchItemsWithRetry(batch);
      const itemByAsin = new Map(items.map((item) => [item.ASIN, item]));

      for (const asin of batch) {
        const product = byAsin.get(asin);
        if (!product) continue;

        const item = itemByAsin.get(asin);
        if (!item) {
          missingAsins.push(asin);
          continue;
        }

        const amazonTitle = getAmazonItemTitle(item).trim();
        if (!amazonTitle) {
          missingAsins.push(asin);
          continue;
        }

        if (amazonTitle === product.name) {
          unchangedAsins.push(asin);
          continue;
        }

        updates.push({
          asin,
          id: product.id,
          oldName: product.name,
          newName: amazonTitle,
          categorySlug: product.category.slug,
        });

        if (!dryRun) {
          await prisma.dynamicProduct.update({
            where: { id: product.id },
            data: { name: amazonTitle },
          });
        }
      }

      if (index < secondPassBatches.length - 1 && SECOND_PASS_DELAY_MS > 0) {
        await delay(SECOND_PASS_DELAY_MS);
      }
    }
  }

  const newMissingPath = backupPath.replace(".json", "_missing.json");
  fs.writeFileSync(
    newMissingPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total: missingAsins.length,
        items: missingAsins,
      },
      null,
      2
    )
  );

  console.log(
    JSON.stringify(
      {
        total: products.length,
        backupPath,
        missingPath: newMissingPath,
        usedMissingSource: missingPath || null,
        updated: updates.length,
        unchanged: unchangedAsins.length,
        missing: missingAsins.length,
        dryRun,
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

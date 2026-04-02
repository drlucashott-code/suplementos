import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

type ManualItem = {
  asin: string;
  tipo_pet: string | null;
  forma: string | null;
  unidades: number | null;
  peso_pet_min: number | null;
  peso_pet_max: number | null;
  linha: string | null;
};

const CATEGORY_GROUP = "casa";
const CATEGORY_SLUG = "antipulgas";

function loadManual(): ManualItem[] {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dataPath = path.resolve(__dirname, "../data/antipulgas-manual.json");
  const raw = fs.readFileSync(dataPath, "utf-8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error("Arquivo de dados invalido: esperado array JSON.");
  }
  return parsed as ManualItem[];
}

async function main() {
  const items = loadManual();
  if (items.length === 0) {
    console.log("Nenhum item para atualizar.");
    return;
  }

  const category = await prisma.dynamicCategory.findFirst({
    where: { group: CATEGORY_GROUP, slug: CATEGORY_SLUG },
    select: { id: true },
  });

  if (!category) {
    throw new Error(`Categoria ${CATEGORY_GROUP}/${CATEGORY_SLUG} nao encontrada.`);
  }

  let updated = 0;
  let missing = 0;
  const missingAsins: string[] = [];

  for (const item of items) {
    const asin = item.asin?.trim();
    if (!asin) {
      continue;
    }

    const existing = await prisma.dynamicProduct.findUnique({
      where: { asin },
      select: { id: true, attributes: true },
    });

    if (!existing) {
      missing += 1;
      missingAsins.push(asin);
      continue;
    }

    const currentAttrs = (existing.attributes as Record<string, unknown>) || {};
    const nextAttrs: Record<string, unknown> = { ...currentAttrs };

    if (item.tipo_pet) nextAttrs.tipo_pet = item.tipo_pet;
    if (item.forma) nextAttrs.forma = item.forma;
    if (typeof item.unidades === "number") nextAttrs.unidades = item.unidades;
    if (item.peso_pet_min !== null && item.peso_pet_min !== undefined) {
      nextAttrs.peso_pet_min = item.peso_pet_min;
    }
    if (item.peso_pet_max !== null && item.peso_pet_max !== undefined) {
      nextAttrs.peso_pet_max = item.peso_pet_max;
    }
    if (item.linha) nextAttrs.linha = item.linha;

    await prisma.dynamicProduct.update({
      where: { id: existing.id },
      data: {
        categoryId: category.id,
        attributes: nextAttrs as Prisma.InputJsonValue,
      },
    });

    updated += 1;
  }

  if (missingAsins.length > 0) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const outPath = path.resolve(__dirname, "../data/antipulgas-manual-missing.json");
    fs.writeFileSync(outPath, JSON.stringify(missingAsins, null, 2));
  }

  console.log(
    JSON.stringify(
      {
        total: items.length,
        updated,
        missing,
        missingPath: missing > 0 ? "data/antipulgas-manual-missing.json" : null,
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

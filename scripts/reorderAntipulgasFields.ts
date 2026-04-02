import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import type { Prisma } from "@prisma/client";

const CATEGORY_GROUPS = ["casa", "pets"];
const PRIMARY_SLUG = "antipulgas";
const FALLBACK_SLUGS = ["antipulgas-cachorro"];
const DESIRED_ORDER = [
  "peso_pet_min",
  "peso_pet_max",
  "unidades",
  "precoPorUnidade",
];

function reorderFields(fields: Array<{ key: string }>) {
  const byKey = new Map(fields.map((field) => [field.key, field]));
  const used = new Set<string>();
  const ordered: Array<{ key: string }> = [];

  for (const key of DESIRED_ORDER) {
    const field = byKey.get(key);
    if (field) {
      ordered.push(field);
      used.add(key);
    }
  }

  for (const field of fields) {
    if (!used.has(field.key)) {
      ordered.push(field);
    }
  }

  return ordered;
}

async function findCategory() {
  for (const group of CATEGORY_GROUPS) {
    const primary = await prisma.dynamicCategory.findFirst({
      where: { group, slug: PRIMARY_SLUG },
    });
    if (primary) {
      return primary;
    }
  }

  for (const group of CATEGORY_GROUPS) {
    for (const slug of FALLBACK_SLUGS) {
      const found = await prisma.dynamicCategory.findFirst({
        where: { group, slug },
      });
      if (found) return found;
    }
  }

  return null;
}

async function main() {
  const category = await findCategory();
  if (!category) {
    console.log("Categoria antipulgas nao encontrada.");
    return;
  }

  const displayConfig = category.displayConfig as unknown as {
    fields?: Array<{ key: string }>;
    [key: string]: unknown;
  };

  const fields = Array.isArray(displayConfig.fields) ? displayConfig.fields : [];
  if (fields.length === 0) {
    console.log("Categoria sem campos para reordenar.");
    return;
  }

  const reordered = reorderFields(fields);
  await prisma.dynamicCategory.update({
    where: { id: category.id },
    data: {
      displayConfig: {
        ...displayConfig,
        fields: reordered,
      } as Prisma.InputJsonValue,
    },
  });

  console.log(
    JSON.stringify(
      {
        categoryId: category.id,
        slug: category.slug,
        reordered: reordered.map((field) => field.key),
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

import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import type { Prisma } from "@prisma/client";

const CATEGORY_GROUPS = ["pets", "casa"];
const TARGET_SLUG = "racao-umida";

type DisplayConfigShape = {
  fields?: Array<{
    key: string;
    label?: string;
    type?: string;
    [key: string]: unknown;
  }>;
  settings?: Record<string, unknown>;
  [key: string]: unknown;
};

function updateCurrencyField(field: {
  key: string;
  label?: string;
  type?: string;
  [key: string]: unknown;
}) {
  if (field.key !== "precoPorGrama") {
    return field;
  }

  return {
    ...field,
    key: "precoPor100g",
    label: "Por 100g",
  };
}

function updateSettings(settings: Record<string, unknown>) {
  const next = { ...settings };

  if (next.primaryMetricPriceKey === "precoPorGrama") {
    next.primaryMetricPriceKey = "precoPor100g";
  }

  if (typeof next.primaryMetricPriceLabel === "string") {
    next.primaryMetricPriceLabel = "Por 100g";
  }

  if (next.bestValueAttributeKey === "precoPorGrama") {
    next.bestValueAttributeKey = "precoPor100g";
  }

  return next;
}

async function findCategory() {
  for (const group of CATEGORY_GROUPS) {
    const category = await prisma.dynamicCategory.findFirst({
      where: { group, slug: TARGET_SLUG },
    });
    if (category) return category;
  }
  return null;
}

async function main() {
  const category = await findCategory();
  if (!category) {
    console.log(`Categoria ${TARGET_SLUG} nao encontrada.`);
    return;
  }

  const displayConfig = category.displayConfig as unknown as DisplayConfigShape;
  const fields = Array.isArray(displayConfig.fields) ? displayConfig.fields : [];

  const updatedFields = fields.map((field) =>
    field.type === "currency" ? updateCurrencyField(field) : field
  );

  const settings =
    displayConfig.settings && typeof displayConfig.settings === "object"
      ? (displayConfig.settings as Record<string, unknown>)
      : {};

  const updatedSettings = updateSettings(settings);

  await prisma.dynamicCategory.update({
    where: { id: category.id },
    data: {
      displayConfig: {
        ...displayConfig,
        fields: updatedFields,
        settings: updatedSettings,
      } as Prisma.InputJsonValue,
    },
  });

  console.log(
    JSON.stringify(
      {
        categoryId: category.id,
        slug: category.slug,
        updatedPriceKey: "precoPor100g",
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

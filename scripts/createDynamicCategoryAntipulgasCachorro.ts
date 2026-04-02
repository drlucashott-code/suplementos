import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

const CATEGORY_GROUP = "casa";
const CATEGORY_GROUP_NAME = "Casa";
const CATEGORY_SLUG = "antipulgas-cachorro";
const CATEGORY_NAME = "Antipulgas - Cachorro";
const CATEGORY_IMAGE =
  "https://m.media-amazon.com/images/I/61m0o1yU32L._AC_SL1200_.jpg";

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

async function main() {
  const existing = await prisma.dynamicCategory.findFirst({
    where: {
      group: CATEGORY_GROUP,
      slug: CATEGORY_SLUG,
    },
  });

  if (existing) {
    await prisma.dynamicCategory.update({
      where: { id: existing.id },
      data: {
        groupName: CATEGORY_GROUP_NAME,
        name: CATEGORY_NAME,
        imageUrl: CATEGORY_IMAGE,
        displayConfig: categoryDisplayConfig as unknown as Prisma.InputJsonValue,
      },
    });
    console.log(`Categoria atualizada: ${CATEGORY_GROUP}/${CATEGORY_SLUG}`);
    return;
  }

  await prisma.dynamicCategory.create({
    data: {
      group: CATEGORY_GROUP,
      groupName: CATEGORY_GROUP_NAME,
      slug: CATEGORY_SLUG,
      name: CATEGORY_NAME,
      imageUrl: CATEGORY_IMAGE,
      displayConfig: categoryDisplayConfig as unknown as Prisma.InputJsonValue,
    },
  });

  console.log(`Categoria criada: ${CATEGORY_GROUP}/${CATEGORY_SLUG}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

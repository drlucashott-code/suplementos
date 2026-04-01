import { CreatineForm, Prisma, Store } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { extractAmazonASIN } from "../src/lib/extractAmazonASIN";

const CATEGORY_GROUP = "suplementos";
const CATEGORY_GROUP_NAME = "Suplementos";
const CATEGORY_SLUG = "creatina";
const CATEGORY_NAME = "Creatina";
const CATEGORY_IMAGE =
  "https://m.media-amazon.com/images/I/81UashXoAxL._AC_SL1500_.jpg";
const CREATINA_POR_DOSE = 3;

const categoryDisplayConfig = {
  settings: {
    analysisTitleTemplate: "ANALISE POR DOSE ({unitsPerDose}G)",
    enabledSorts: ["discount", "best_value", "price_asc"],
    defaultSort: "discount",
    bestValueAttributeKey: "precoPorDose",
    dosePriceAttributeKey: "precoPorDose",
  },
  fields: [
    {
      key: "creatinaPorDose",
      label: "creatina",
      type: "number",
      visibility: "public_table",
      filterable: false,
      suffix: "g",
    },
    {
      key: "precoPorDose",
      label: "Preço",
      type: "currency",
      visibility: "public_table",
      prefix: "R$ ",
    },
    {
      key: "formLabel",
      label: "Forma",
      type: "text",
      visibility: "public_highlight",
      filterable: true,
    },
    {
      key: "sabor",
      label: "Sabor",
      type: "text",
      visibility: "public_highlight",
      filterable: true,
    },
    {
      key: "weightGrams",
      label: "Peso (g)",
      type: "number",
      visibility: "public_highlight",
      filterable: true,
    },
    {
      key: "numberOfDoses",
      label: "Doses",
      type: "number",
      visibility: "public_highlight",
      filterable: false,
    },
    {
      key: "unitsPerDose",
      label: "Dose (g)",
      type: "number",
      visibility: "internal",
      filterable: false,
    },
  ],
} as const;

type LegacyProduct = Awaited<ReturnType<typeof getLegacyProducts>>[number];

type MigrationIssue = {
  name: string;
  asin: string;
  reason: string;
};

async function ensureDynamicCategory() {
  const existing = await prisma.dynamicCategory.findFirst({
    where: {
      group: CATEGORY_GROUP,
      slug: CATEGORY_SLUG,
    },
  });

  if (existing) {
    return prisma.dynamicCategory.update({
      where: { id: existing.id },
      data: {
        groupName: CATEGORY_GROUP_NAME,
        name: CATEGORY_NAME,
        imageUrl: CATEGORY_IMAGE,
        displayConfig: categoryDisplayConfig as unknown as Prisma.InputJsonValue,
      },
    });
  }

  return prisma.dynamicCategory.create({
    data: {
      group: CATEGORY_GROUP,
      groupName: CATEGORY_GROUP_NAME,
      slug: CATEGORY_SLUG,
      name: CATEGORY_NAME,
      imageUrl: CATEGORY_IMAGE,
      displayConfig: categoryDisplayConfig as unknown as Prisma.InputJsonValue,
    },
  });
}

async function getLegacyProducts() {
  return prisma.product.findMany({
    where: {
      category: CATEGORY_SLUG,
    },
    include: {
      creatineInfo: true,
      offers: {
        where: {
          store: Store.AMAZON,
        },
        include: {
          priceHistory: {
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

function resolveAmazonOffer(product: LegacyProduct) {
  return product.offers.find((offer) => offer.store === Store.AMAZON) ?? null;
}

function resolveAsin(product: LegacyProduct) {
  const offer = resolveAmazonOffer(product);

  if (!offer) return null;

  return (
    extractAmazonASIN(offer.externalId) ||
    extractAmazonASIN(offer.affiliateUrl) ||
    null
  );
}

function getFormLabel(form: CreatineForm) {
  switch (form) {
    case CreatineForm.CAPSULE:
      return "Capsulas";
    case CreatineForm.GUMMY:
      return "Gummy";
    default:
      return "Po";
  }
}

function buildAttributes(
  product: LegacyProduct,
  asin: string,
  seller: string | null,
  totalPrice: number
) {
  const info = product.creatineInfo;
  const baseAttributes: Record<string, string | number | boolean | undefined> = {
    asin,
    brand: product.brand,
    sabor: product.flavor ?? undefined,
    flavor: product.flavor ?? undefined,
    seller: seller ?? undefined,
  };

  if (!info) {
    return {
      attributes: {
        ...baseAttributes,
        migrationPendingReason: "Faltou creatineInfo no legado",
      },
      issue: "faltou creatineInfo no legado",
    };
  }

  const numberOfDoses =
    info.totalUnits > 0 && info.unitsPerDose > 0
      ? Number((info.totalUnits / info.unitsPerDose).toFixed(2))
      : 0;
  const derivedWeightGrams =
    numberOfDoses > 0 && info.unitsPerDose > 0
      ? Math.round(numberOfDoses * info.unitsPerDose)
      : info.totalUnits > 0
        ? Math.round(info.totalUnits)
        : undefined;

  return {
    attributes: {
      ...baseAttributes,
      form: info.form,
      formLabel: getFormLabel(info.form),
      totalUnits: info.totalUnits,
      weightGrams: derivedWeightGrams,
      unitsPerDose: info.unitsPerDose,
      creatinaPorDose: CREATINA_POR_DOSE,
      numberOfDoses,
      hasCarbs: info.unitsPerDose > CREATINA_POR_DOSE + 0.5,
    },
    issue: null,
  };
}

async function migratePriceHistory(
  dynamicProductId: string,
  currentPrice: number,
  currentUpdatedAt: Date,
  history: Array<{ price: number; createdAt: Date }>
) {
  const points = [...history];

  if (currentPrice > 0) {
    points.push({
      price: currentPrice,
      createdAt: currentUpdatedAt,
    });
  }

  for (const point of points) {
    await prisma.dynamicPriceHistory.upsert({
      where: {
        productId_date: {
          productId: dynamicProductId,
          date: point.createdAt,
        },
      },
      update: {
        price: point.price,
      },
      create: {
        productId: dynamicProductId,
        price: point.price,
        date: point.createdAt,
      },
    });
  }
}

async function main() {
  const category = await ensureDynamicCategory();
  const legacyProducts = await getLegacyProducts();

  let migratedCount = 0;
  let skippedCount = 0;
  const migrationIssues: MigrationIssue[] = [];

  console.log(
    `Iniciando migracao de ${legacyProducts.length} produtos de creatina...`
  );

  for (const product of legacyProducts) {
    const amazonOffer = resolveAmazonOffer(product);
    const asin = resolveAsin(product);

    if (!amazonOffer || !asin) {
      skippedCount += 1;
      console.log(
        `Pulando ${product.name}: faltou oferta Amazon ou ASIN valido.`
      );
      continue;
    }

    const { attributes, issue } = buildAttributes(
      product,
      asin,
      amazonOffer.seller ?? null,
      amazonOffer.price
    );

    if (issue) {
      migrationIssues.push({
        name: product.name,
        asin,
        reason: issue,
      });
    }

    const dynamicProduct = await prisma.dynamicProduct.upsert({
      where: {
        asin,
      },
      update: {
        name: product.name,
        totalPrice: amazonOffer.price,
        url: amazonOffer.affiliateUrl || `https://www.amazon.com.br/dp/${asin}`,
        imageUrl: product.imageUrl,
        categoryId: category.id,
        ratingAverage: amazonOffer.ratingAverage ?? null,
        ratingCount: amazonOffer.ratingCount ?? null,
        ratingsUpdatedAt: amazonOffer.updatedAt,
        attributes: attributes as Prisma.InputJsonValue,
      },
      create: {
        asin,
        name: product.name,
        totalPrice: amazonOffer.price,
        url: amazonOffer.affiliateUrl || `https://www.amazon.com.br/dp/${asin}`,
        imageUrl: product.imageUrl,
        categoryId: category.id,
        ratingAverage: amazonOffer.ratingAverage ?? null,
        ratingCount: amazonOffer.ratingCount ?? null,
        ratingsUpdatedAt: amazonOffer.updatedAt,
        attributes: attributes as Prisma.InputJsonValue,
      },
    });

    await migratePriceHistory(
      dynamicProduct.id,
      amazonOffer.price,
      amazonOffer.updatedAt,
      amazonOffer.priceHistory.map((item) => ({
        price: item.price,
        createdAt: item.createdAt,
      }))
    );

    migratedCount += 1;
    console.log(`Migrado: ${product.name} (${asin})`);
  }

  console.log("");
  console.log("Migracao concluida.");
  console.log(`Migrados: ${migratedCount}`);
  console.log(`Pulados: ${skippedCount}`);

  if (migrationIssues.length > 0) {
    console.log("");
    console.log("Produtos com pendencia para ajuste manual:");
    for (const issue of migrationIssues) {
      console.log(`- ${issue.name} (${issue.asin}): ${issue.reason}`);
    }
  }
}

main()
  .catch((error) => {
    console.error("Erro na migracao de creatina:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });




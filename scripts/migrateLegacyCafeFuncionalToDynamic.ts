import { Prisma, Store } from "@prisma/client";
import { prisma } from "../src/lib/prisma";
import { extractAmazonASIN } from "../src/lib/extractAmazonASIN";

const CATEGORY_GROUP = "suplementos";
const CATEGORY_GROUP_NAME = "Suplementos";
const CATEGORY_SLUG = "cafe-funcional";
const CATEGORY_NAME = "Cafe Funcional";
const CATEGORY_IMAGE =
  "https://m.media-amazon.com/images/I/61hwrgvkjrL._AC_SL1210_.jpg";

const categoryDisplayConfig = {
  settings: {
    analysisTitleTemplate: "ANALISE POR DOSE ({doseInGrams}G)",
    enabledSorts: ["discount", "best_value", "price_asc"],
    defaultSort: "discount",
    bestValueAttributeKey: "precoPor100MgCafeina",
    dosePriceAttributeKey: "precoPorDose",
    customSorts: [
      {
        value: "dose_price",
        label: "Menor preco da dose",
        attributeKey: "precoPorDose",
        direction: "asc",
      },
    ],
  },
  fields: [
  {
    key: "cafeinaPorDoseMg",
    label: "cafeina",
    type: "number",
    visibility: "public_table",
    suffix: "mg",
  },
  {
    key: "precoPorDose",
    label: "preco",
    type: "currency",
    visibility: "public_table",
  },
  {
    key: "sabor",
    label: "Sabor",
    type: "text",
    visibility: "public_highlight",
  },
  {
    key: "doses",
    label: "Doses",
    type: "number",
    visibility: "public_highlight",
  },
  {
    key: "doseInGrams",
    label: "Dose (g)",
    type: "number",
    visibility: "internal",
  },
  ],
} as const;

type LegacyProduct = Awaited<ReturnType<typeof getLegacyProducts>>[number];

async function ensureDynamicCategory() {
  const existing = await prisma.dynamicCategory.findFirst({
    where: {
      group: CATEGORY_GROUP,
      slug: CATEGORY_SLUG,
    },
  });

  if (existing) {
    return prisma.dynamicCategory.update({
      where: {
        id: existing.id,
      },
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
      functionalCoffeeInfo: true,
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

function buildAttributes(
  product: LegacyProduct,
  asin: string,
  seller: string | null,
  totalPrice: number
) {
  const info = product.functionalCoffeeInfo;

  if (!info) {
    return null;
  }

  const doses =
    info.doseInGrams > 0
      ? Number((info.totalWeightInGrams / info.doseInGrams).toFixed(2))
      : 0;

  const cafeinaTotalMg =
    doses > 0 && info.caffeinePerDoseInMg > 0
      ? Number((doses * info.caffeinePerDoseInMg).toFixed(2))
      : 0;

  return {
    asin,
    brand: product.brand,
    sabor: product.flavor ?? undefined,
    flavor: product.flavor ?? undefined,
    seller: seller ?? undefined,
    totalWeightInGrams: info.totalWeightInGrams,
    doseInGrams: info.doseInGrams,
    cafeinaPorDoseMg: info.caffeinePerDoseInMg,
    doses,
    cafeinaTotalMg,
  } satisfies Record<string, string | number | undefined>;
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

  console.log(
    `Iniciando migracao de ${legacyProducts.length} produtos de cafe funcional...`
  );

  for (const product of legacyProducts) {
    const info = product.functionalCoffeeInfo;
    const amazonOffer = resolveAmazonOffer(product);
    const asin = resolveAsin(product);

    if (!info || !amazonOffer || !asin) {
      skippedCount += 1;
      console.log(
        `Pulando ${product.name}: faltou info tecnica, oferta Amazon ou ASIN.`
      );
      continue;
    }

    const attributes = buildAttributes(
      product,
      asin,
      amazonOffer.seller ?? null,
      amazonOffer.price
    );

    if (!attributes) {
      skippedCount += 1;
      console.log(`Pulando ${product.name}: nao foi possivel montar attributes.`);
      continue;
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
}

main()
  .catch((error) => {
    console.error("Erro na migracao de cafe funcional:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

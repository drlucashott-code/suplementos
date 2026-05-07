"use server";

import paapi from "amazon-paapi";
import { enrichDynamicAttributesForCategory } from "@/lib/dynamicCategoryMetrics";
import { getDynamicVisibilityBoolean } from "@/lib/dynamicVisibility";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const AMAZON_ACCESS_KEY = process.env.AMAZON_ACCESS_KEY ?? "";
const AMAZON_SECRET_KEY = process.env.AMAZON_SECRET_KEY ?? "";
const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG ?? "";

const PAAPI_COMMON = {
  AccessKey: AMAZON_ACCESS_KEY,
  SecretKey: AMAZON_SECRET_KEY,
  PartnerTag: AMAZON_PARTNER_TAG,
  PartnerType: "Associates",
  Marketplace: "www.amazon.com.br",
} as const;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type PaapiError = {
  Code?: string;
  Message?: string;
};

type PaapiItem = {
  ASIN?: string;
  ParentASIN?: string;
  ItemInfo?: {
    Title?: {
      DisplayValue?: string;
    };
    ByLineInfo?: {
      Brand?: {
        DisplayValue?: string;
      };
    };
  };
  Images?: {
    Primary?: {
      Large?: {
        URL?: string;
      };
    };
  };
  Offers?: {
    Listings?: Array<{
      IsBuyBoxWinner?: boolean;
      Price?: {
        Amount?: number;
        DisplayAmount?: string;
        Money?: {
          Amount?: number;
          DisplayAmount?: string;
        };
      };
    }>;
  };
  OffersV2?: {
    Listings?: Array<{
      IsBuyBoxWinner?: boolean;
      Price?: {
        Amount?: number;
        DisplayAmount?: string;
        Money?: {
          Amount?: number;
          DisplayAmount?: string;
        };
      };
    }>;
  };
};

type DynamicProductSnapshot = {
  name: string;
  totalPrice: number;
  url: string;
  imageUrl: string | null;
  ratingAverage: number | null;
  ratingCount: number | null;
  ratingsUpdatedAt: Date | null;
  lastValidPrice: number | null;
  lastValidPriceAt: Date | null;
  availabilityStatus: string | null;
  lastAvailabilityCheckedAt: Date | null;
  averagePrice30d: number | null;
  lowestPrice30d: number | null;
  highestPrice30d: number | null;
  lowestPrice365d: number | null;
  priceStatsUpdatedAt: Date | null;
  attributes: unknown;
};

type CategoryContext = NonNullable<Awaited<ReturnType<typeof getCategoryContext>>>;

function encodeNotice(message: string) {
  return encodeURIComponent(message);
}

function buildRedirectUrl(params: {
  categoryId?: string;
  status?: string;
  notice?: string;
}) {
  const query = new URLSearchParams();
  if (params.categoryId) query.set("category", params.categoryId);
  if (params.status && params.status !== "all") query.set("status", params.status);
  if (params.notice) query.set("notice", params.notice);
  const suffix = query.toString();
  return `/admin/dynamic/expansoes${suffix ? `?${suffix}` : ""}`;
}

async function getCategoryContext(categoryId: string) {
  return prisma.dynamicCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true, slug: true, displayConfig: true },
  });
}

function getErrorCode(error: unknown) {
  const maybe = error as { Errors?: PaapiError[] };
  if (Array.isArray(maybe?.Errors) && maybe.Errors[0]?.Code) {
    return maybe.Errors[0].Code;
  }
  return "";
}

function toPlainObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function getPaapiListingAmount(listing?: {
  Price?: {
    Amount?: number;
    Money?: { Amount?: number };
  };
} | null): number {
  const moneyAmount = listing?.Price?.Money?.Amount;
  if (typeof moneyAmount === "number" && Number.isFinite(moneyAmount)) {
    return moneyAmount;
  }

  const amount = listing?.Price?.Amount;
  if (typeof amount === "number" && Number.isFinite(amount)) {
    return amount > 1000 ? amount / 100 : amount;
  }

  return 0;
}

function getPaapiItemPrice(item: PaapiItem): number | null {
  const listingsV2 = item.OffersV2?.Listings;
  if (Array.isArray(listingsV2) && listingsV2.length > 0) {
    const buyBoxListing = listingsV2.find((listing) => listing?.IsBuyBoxWinner);
    const candidate = buyBoxListing ?? listingsV2[0];
    const price = getPaapiListingAmount(candidate);
    if (price > 0) return price;
  }

  const listings = item.Offers?.Listings;
  if (Array.isArray(listings) && listings.length > 0) {
    const buyBoxListing = listings.find((listing) => listing?.IsBuyBoxWinner);
    const candidate = buyBoxListing ?? listings[0];
    const price = getPaapiListingAmount(candidate);
    if (price > 0) return price;
  }

  return null;
}

async function withPaapiRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const code = getErrorCode(error);
      const shouldRetry = code === "TooManyRequests" || code === "RequestThrottled";
      attempt += 1;
      if (!shouldRetry || attempt >= retries) {
        break;
      }
      await delay(1200 * attempt);
    }
  }
  throw lastError;
}

async function resolveParentAsin(baseAsin: string) {
  const lookup = await withPaapiRetry(async () =>
    paapi.GetItems(PAAPI_COMMON, {
      ItemIds: [baseAsin],
      Resources: [
        "ParentASIN",
        "ItemInfo.Title",
        "ItemInfo.ByLineInfo",
        "Images.Primary.Large",
        "Offers.Listings.Price",
        "OffersV2.Listings.Price",
      ],
    })
  );

  const items = ((lookup as { ItemsResult?: { Items?: PaapiItem[] } })?.ItemsResult?.Items ??
    []) as PaapiItem[];
  const baseItem = items[0];
  if (!baseItem?.ASIN) {
    return null;
  }

  return {
    parentAsin: baseItem.ParentASIN || baseAsin,
    baseItem,
  };
}

async function fetchFamilyItems(parentAsin: string) {
  const collected = new Map<string, PaapiItem>();
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= 10) {
    if (page > 1) {
      await delay(900);
    }

    const response = await withPaapiRetry(async () =>
      paapi.GetVariations(PAAPI_COMMON, {
        ASIN: parentAsin,
        Resources: [
          "ItemInfo.Title",
          "ItemInfo.ByLineInfo",
          "Images.Primary.Large",
          "Offers.Listings.Price",
          "OffersV2.Listings.Price",
        ],
        VariationPage: page,
      })
    );

    const items =
      ((response as { VariationsResult?: { Items?: PaapiItem[] } })?.VariationsResult?.Items ??
        []) as PaapiItem[];

    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      if (item?.ASIN) {
        collected.set(item.ASIN, item);
      }
    }

    hasMore = items.length === 10;
    page += 1;
  }

  return [...collected.values()];
}

type DiscoveredCandidate = {
  item: PaapiItem;
  sourceAsin: string;
  observedPrice: number | null;
};

async function getSourceProductSnapshot(sourceAsin: string) {
  return prisma.dynamicProduct.findUnique({
    where: { asin: sourceAsin },
    select: {
      name: true,
      totalPrice: true,
      url: true,
      imageUrl: true,
      ratingAverage: true,
      ratingCount: true,
      ratingsUpdatedAt: true,
      lastValidPrice: true,
      lastValidPriceAt: true,
      availabilityStatus: true,
      lastAvailabilityCheckedAt: true,
      averagePrice30d: true,
      lowestPrice30d: true,
      highestPrice30d: true,
      lowestPrice365d: true,
      priceStatsUpdatedAt: true,
      attributes: true,
    },
  }) as Promise<DynamicProductSnapshot | null>;
}

async function importExpansionDecisionIntoCatalog(params: {
  category: CategoryContext;
  decision: {
    id: string;
    asin: string;
    sourceAsin: string | null;
    title: string | null;
    brand: string | null;
    imageUrl: string | null;
    observedPrice: number | null;
  };
}) {
  const { category, decision } = params;
  const sourceProduct = decision.sourceAsin
    ? await getSourceProductSnapshot(decision.sourceAsin)
    : null;
  const sourceAttributes = toPlainObject(sourceProduct?.attributes);

  const productName =
    decision.title?.trim() ||
    sourceProduct?.name?.trim() ||
    `Produto Amazon ${decision.asin}`;
  const totalPrice =
    typeof decision.observedPrice === "number" && decision.observedPrice > 0
      ? decision.observedPrice
      : sourceProduct?.totalPrice ?? 0;
  const visibilityStatus = "pending" as const;

  const attributes = enrichDynamicAttributesForCategory({
    category,
    rawDisplayConfig: category.displayConfig,
    productName,
    totalPrice,
    attributes: {
      ...sourceAttributes,
      asin: decision.asin,
      sourceAsin: decision.sourceAsin || null,
      brand: decision.brand || String(sourceAttributes.brand ?? "") || "",
      marca: decision.brand || String(sourceAttributes.marca ?? "") || "",
    },
  });

  const createdProduct = await prisma.dynamicProduct.create({
    data: {
      asin: decision.asin,
      name: productName,
      totalPrice,
      url: `https://www.amazon.com.br/dp/${decision.asin}`,
      imageUrl: decision.imageUrl || sourceProduct?.imageUrl || "",
      ratingAverage: sourceProduct?.ratingAverage ?? null,
      ratingCount: sourceProduct?.ratingCount ?? null,
      ratingsUpdatedAt: sourceProduct?.ratingsUpdatedAt ?? null,
      lastValidPrice: sourceProduct?.lastValidPrice ?? null,
      lastValidPriceAt: sourceProduct?.lastValidPriceAt ?? null,
      availabilityStatus: sourceProduct?.availabilityStatus ?? "UNKNOWN",
      lastAvailabilityCheckedAt: sourceProduct?.lastAvailabilityCheckedAt ?? null,
      averagePrice30d: sourceProduct?.averagePrice30d ?? null,
      lowestPrice30d: sourceProduct?.lowestPrice30d ?? null,
      highestPrice30d: sourceProduct?.highestPrice30d ?? null,
      lowestPrice365d: sourceProduct?.lowestPrice365d ?? null,
      priceStatsUpdatedAt: sourceProduct?.priceStatsUpdatedAt ?? null,
      categoryId: category.id,
      visibilityStatus,
      isVisibleOnSite: getDynamicVisibilityBoolean(visibilityStatus),
      attributes,
    },
  });

  await prisma.dynamicCategoryAsinDecision.update({
    where: { id: decision.id },
    data: {
      status: "existing",
      productId: createdProduct.id,
      reviewedAt: new Date(),
      lastSeenAt: new Date(),
    },
  });

  return createdProduct;
}

export async function scanCategoryExpansionGaps(formData: FormData) {
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const status = String(formData.get("status") ?? "all").trim() || "all";

  if (!categoryId) {
    redirect(
      buildRedirectUrl({
        status,
        notice: encodeNotice("Selecione uma categoria antes de iniciar a varredura."),
      })
    );
  }

  if (!AMAZON_ACCESS_KEY || !AMAZON_SECRET_KEY || !AMAZON_PARTNER_TAG) {
    redirect(
      buildRedirectUrl({
        categoryId,
        status,
        notice: encodeNotice("Credenciais da Amazon ausentes no ambiente."),
      })
    );
  }

  const category = await getCategoryContext(categoryId);

  if (!category) {
    redirect(
      buildRedirectUrl({
        status,
        notice: encodeNotice("Categoria nao encontrada."),
      })
    );
  }

  const products = await prisma.dynamicProduct.findMany({
    where: { categoryId },
    select: {
      asin: true,
    },
  });

  const productsInCatalog = await prisma.dynamicProduct.findMany({
    select: {
      asin: true,
    },
  });

  const baseAsins = Array.from(new Set(products.map((item) => item.asin).filter(Boolean)));
  if (baseAsins.length === 0) {
    redirect(
      buildRedirectUrl({
        categoryId,
        status,
        notice: encodeNotice("A categoria ainda nao possui ASINs para varrer."),
      })
    );
  }

  const existingAsinsInCatalogSet = new Set(
    productsInCatalog.map((item) => item.asin).filter(Boolean)
  );
  const processedParents = new Set<string>();
  const discoveredCandidates = new Map<string, DiscoveredCandidate>();
  const failedBases: string[] = [];

  for (const baseAsin of baseAsins) {
    try {
      const parentResult = await resolveParentAsin(baseAsin);
      if (!parentResult) {
        failedBases.push(baseAsin);
        continue;
      }

      const parentAsin = parentResult.parentAsin;
      if (processedParents.has(parentAsin)) {
        continue;
      }

      const familyItems = await fetchFamilyItems(parentAsin);
      if (familyItems.length === 0) {
        discoveredCandidates.set(baseAsin, {
          item: parentResult.baseItem,
          sourceAsin: baseAsin,
          observedPrice: getPaapiItemPrice(parentResult.baseItem),
        });
      } else {
        for (const item of familyItems) {
          if (item?.ASIN) {
            discoveredCandidates.set(item.ASIN, {
              item,
              sourceAsin: baseAsin,
              observedPrice: getPaapiItemPrice(item),
            });
          }
        }
      }

      processedParents.add(parentAsin);
      await delay(700);
    } catch {
      failedBases.push(baseAsin);
    }
  }

  const candidateAsins = Array.from(discoveredCandidates.keys());
  const missingAsins = candidateAsins.filter((asin) => !existingAsinsInCatalogSet.has(asin));

  if (missingAsins.length > 0) {
    const existingDecisions = await prisma.dynamicCategoryAsinDecision.findMany({
      where: {
        categoryId,
        asin: { in: missingAsins },
      },
      select: {
        asin: true,
        status: true,
      },
    });

    const decisionByAsin = new Map(existingDecisions.map((row) => [row.asin, row.status]));

  for (const asin of missingAsins) {
    const currentStatus = decisionByAsin.get(asin);
      if (
        currentStatus === "approved" ||
        currentStatus === "existing" ||
        currentStatus === "imported" ||
        currentStatus === "rejected_hard" ||
        currentStatus === "rejected_soft"
      ) {
        continue;
      }

      const discovered = discoveredCandidates.get(asin);
      const item = discovered?.item;
      const sourceAsin = discovered?.sourceAsin ?? asin;
      const observedPrice = discovered?.observedPrice ?? null;
      const title = item?.ItemInfo?.Title?.DisplayValue ?? null;
      const brand = item?.ItemInfo?.ByLineInfo?.Brand?.DisplayValue ?? null;
      const imageUrl = item?.Images?.Primary?.Large?.URL ?? null;

      await prisma.dynamicCategoryAsinDecision.upsert({
        where: {
          categoryId_asin: {
            categoryId,
            asin,
          },
        },
        update: {
          status: "discovered",
          reasonCode: "DISCOVERED_FROM_CATALOG_SCAN",
          reasonText: "ASIN encontrado na expansao da familia de itens ja cadastrados",
          policyHash: "catalog-expansion-scan-v1",
          sourceAsin,
          title,
          brand,
          imageUrl,
          observedPrice,
          lastSeenAt: new Date(),
          reviewedAt: new Date(),
        },
        create: {
          categoryId,
          asin,
          status: "discovered",
          reasonCode: "DISCOVERED_FROM_CATALOG_SCAN",
          reasonText: "ASIN encontrado na expansao da familia de itens ja cadastrados",
          policyHash: "catalog-expansion-scan-v1",
          sourceAsin,
          title,
          brand,
          imageUrl,
          observedPrice,
          firstSeenAt: new Date(),
          lastSeenAt: new Date(),
          reviewedAt: new Date(),
        },
      });
    }
  }

  revalidatePath("/admin/dynamic/expansoes");
  revalidatePath("/admin/dynamic/rejeitados");

  const notice = [
    `Varredura concluida em ${category.name}.`,
    `Base: ${baseAsins.length}`,
    `Familias: ${processedParents.size}`,
    `Descobertos na API: ${candidateAsins.length}`,
    `Faltantes no banco: ${missingAsins.length}`,
    failedBases.length ? `Falhas: ${failedBases.length}` : "",
  ]
    .filter(Boolean)
    .join(" ");

  redirect(
    buildRedirectUrl({
      categoryId,
      status,
      notice: encodeNotice(notice),
    })
  );
}

export async function approveExpansionDecision(formData: FormData) {
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const decisionId = String(formData.get("decisionId") ?? "").trim();
  if (!categoryId || !decisionId) {
    redirect(
      buildRedirectUrl({
        categoryId,
        notice: encodeNotice("Selecione uma categoria e um ASIN valido."),
      })
    );
  }

  const decision = await prisma.dynamicCategoryAsinDecision.findUnique({
    where: { id: decisionId },
    select: {
      id: true,
      categoryId: true,
      asin: true,
      sourceAsin: true,
      title: true,
      brand: true,
      imageUrl: true,
      observedPrice: true,
    },
  });

  if (!decision || decision.categoryId !== categoryId) {
    redirect(
      buildRedirectUrl({
        categoryId,
        notice: encodeNotice("Decisao nao encontrada para esta categoria."),
      })
    );
  }

  const category = await getCategoryContext(categoryId);
  if (!category) {
    redirect(
      buildRedirectUrl({
        categoryId,
        notice: encodeNotice("Categoria nao encontrada."),
      })
    );
  }

  const existingProduct = await prisma.dynamicProduct.findUnique({
    where: { asin: decision.asin },
    select: { id: true },
  });

  if (existingProduct) {
    await prisma.dynamicCategoryAsinDecision.update({
      where: { id: decision.id },
      data: {
        status: "existing",
        productId: existingProduct.id,
        reviewedAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
    revalidatePath("/admin/dynamic/expansoes");
    redirect(
      buildRedirectUrl({
        categoryId,
        notice: encodeNotice(`${decision.asin} ja existe no banco.`),
      })
    );
  }

  await importExpansionDecisionIntoCatalog({
    category,
    decision,
  });

  revalidatePath("/admin/dynamic/expansoes");
  redirect(
    buildRedirectUrl({
      categoryId,
      notice: encodeNotice(`${decision.asin} importado com dados copiados da origem.`),
    })
  );
}

export async function clearExpansionPendingDecisions(formData: FormData) {
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  if (!categoryId) {
    redirect(
      buildRedirectUrl({
        notice: encodeNotice("Selecione uma categoria antes de limpar os pendentes."),
      })
    );
  }

  const category = await getCategoryContext(categoryId);
  if (!category) {
    redirect(
      buildRedirectUrl({
        categoryId,
        notice: encodeNotice("Categoria nao encontrada."),
      })
    );
  }

  const pendingStatuses = ["discovered", "pending_review"];
  const pendingRows = await prisma.dynamicCategoryAsinDecision.findMany({
    where: {
      categoryId,
      status: { in: pendingStatuses },
    },
    select: { id: true },
  });

  if (pendingRows.length === 0) {
    revalidatePath("/admin/dynamic/expansoes");
    redirect(
      buildRedirectUrl({
        categoryId,
        notice: encodeNotice("Nenhum item pendente para limpar."),
      })
    );
  }

  await prisma.dynamicCategoryAsinDecision.deleteMany({
    where: {
      categoryId,
      status: { in: pendingStatuses },
    },
  });

  revalidatePath("/admin/dynamic/expansoes");
  revalidatePath("/admin/dynamic/rejeitados");
  redirect(
    buildRedirectUrl({
      categoryId,
      notice: encodeNotice(`Pendentes limpos: ${pendingRows.length} item(ns) removido(s).`),
    })
  );
}

export async function clearExpansionFindingsAndRejections(formData: FormData) {
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  if (!categoryId) {
    redirect(
      buildRedirectUrl({
        notice: encodeNotice("Selecione uma categoria antes de limpar os resultados."),
      })
    );
  }

  const category = await getCategoryContext(categoryId);
  if (!category) {
    redirect(
      buildRedirectUrl({
        categoryId,
        notice: encodeNotice("Categoria nao encontrada."),
      })
    );
  }

  const statuses = ["discovered", "pending_review", "rejected_hard", "rejected_soft"];
  const rows = await prisma.dynamicCategoryAsinDecision.findMany({
    where: {
      categoryId,
      status: { in: statuses },
    },
    select: { id: true },
  });

  if (rows.length === 0) {
    revalidatePath("/admin/dynamic/expansoes");
    revalidatePath("/admin/dynamic/rejeitados");
    redirect(
      buildRedirectUrl({
        categoryId,
        notice: encodeNotice("Nenhum resultado encontrado para limpar."),
      })
    );
  }

  await prisma.dynamicCategoryAsinDecision.deleteMany({
    where: {
      categoryId,
      status: { in: statuses },
    },
  });

  revalidatePath("/admin/dynamic/expansoes");
  revalidatePath("/admin/dynamic/rejeitados");
  redirect(
    buildRedirectUrl({
      categoryId,
      notice: encodeNotice(`Limpeza concluida: ${rows.length} item(ns) removido(s).`),
    })
  );
}

export async function clearExpansionRejectedDecisions(formData: FormData) {
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  if (!categoryId) {
    redirect(
      buildRedirectUrl({
        notice: encodeNotice("Selecione uma categoria antes de limpar os rejeitados."),
      })
    );
  }

  const category = await getCategoryContext(categoryId);
  if (!category) {
    redirect(
      buildRedirectUrl({
        categoryId,
        notice: encodeNotice("Categoria nao encontrada."),
      })
    );
  }

  const rejectedStatuses = ["rejected_hard", "rejected_soft"];
  const rejectedRows = await prisma.dynamicCategoryAsinDecision.findMany({
    where: {
      categoryId,
      status: { in: rejectedStatuses },
    },
    select: { id: true },
  });

  if (rejectedRows.length === 0) {
    revalidatePath("/admin/dynamic/expansoes");
    revalidatePath("/admin/dynamic/rejeitados");
    redirect(
      buildRedirectUrl({
        categoryId,
        notice: encodeNotice("Nenhum rejeitado para limpar."),
      })
    );
  }

  await prisma.dynamicCategoryAsinDecision.deleteMany({
    where: {
      categoryId,
      status: { in: rejectedStatuses },
    },
  });

  revalidatePath("/admin/dynamic/expansoes");
  revalidatePath("/admin/dynamic/rejeitados");
  redirect(
    buildRedirectUrl({
      categoryId,
      notice: encodeNotice(`Rejeitados limpos: ${rejectedRows.length} item(ns) removido(s).`),
    })
  );
}

export async function clearExpansionExistingDecisions(formData: FormData) {
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  if (!categoryId) {
    redirect(
      buildRedirectUrl({
        notice: encodeNotice("Selecione uma categoria antes de limpar os existentes."),
      })
    );
  }

  const category = await getCategoryContext(categoryId);
  if (!category) {
    redirect(
      buildRedirectUrl({
        categoryId,
        notice: encodeNotice("Categoria nao encontrada."),
      })
    );
  }

  const existingStatuses = ["existing", "imported"];
  const existingRows = await prisma.dynamicCategoryAsinDecision.findMany({
    where: {
      categoryId,
      status: { in: existingStatuses },
    },
    select: { id: true },
  });

  if (existingRows.length === 0) {
    revalidatePath("/admin/dynamic/expansoes");
    redirect(
      buildRedirectUrl({
        categoryId,
        notice: encodeNotice("Nenhum item existente para limpar."),
      })
    );
  }

  await prisma.dynamicCategoryAsinDecision.deleteMany({
    where: {
      categoryId,
      status: { in: existingStatuses },
    },
  });

  revalidatePath("/admin/dynamic/expansoes");
  redirect(
    buildRedirectUrl({
      categoryId,
      notice: encodeNotice(`Existentes limpos: ${existingRows.length} item(ns) removido(s).`),
    })
  );
}

export async function rejectExpansionDecision(formData: FormData) {
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const decisionId = String(formData.get("decisionId") ?? "").trim();
  if (!categoryId || !decisionId) {
    redirect(
      buildRedirectUrl({
        categoryId,
        notice: encodeNotice("Selecione uma categoria e um ASIN valido."),
      })
    );
  }

  const decision = await prisma.dynamicCategoryAsinDecision.findUnique({
    where: { id: decisionId },
    select: { id: true, categoryId: true, asin: true },
  });

  if (!decision || decision.categoryId !== categoryId) {
    redirect(
      buildRedirectUrl({
        categoryId,
        notice: encodeNotice("Decisao nao encontrada para esta categoria."),
      })
    );
  }

  await prisma.dynamicCategoryAsinDecision.update({
    where: { id: decision.id },
    data: {
      status: "rejected_hard",
      reviewedAt: new Date(),
      lastSeenAt: new Date(),
    },
  });

  revalidatePath("/admin/dynamic/expansoes");
  redirect(
    buildRedirectUrl({
      categoryId,
      notice: encodeNotice(`${decision.asin} rejeitado.`),
    })
  );
}

export async function refreshApprovedExpansionDecisions(formData: FormData) {
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  if (!categoryId) {
    redirect(
      buildRedirectUrl({
        notice: encodeNotice("Selecione uma categoria antes de atualizar os aprovados."),
      })
    );
  }

  const category = await getCategoryContext(categoryId);
  if (!category) {
    redirect(
      buildRedirectUrl({
        categoryId,
        notice: encodeNotice("Categoria nao encontrada."),
      })
    );
  }

  const approvedDecisions = await prisma.dynamicCategoryAsinDecision.findMany({
    where: {
      categoryId,
      status: "approved",
    },
    select: {
      id: true,
      asin: true,
      sourceAsin: true,
      title: true,
      brand: true,
      imageUrl: true,
      observedPrice: true,
    },
  });

  if (approvedDecisions.length === 0) {
    revalidatePath("/admin/dynamic/expansoes");
    redirect(
      buildRedirectUrl({
        categoryId,
        notice: encodeNotice("Nenhum aprovado para atualizar."),
      })
    );
  }

  const existingProducts = await prisma.dynamicProduct.findMany({
    where: { asin: { in: approvedDecisions.map((item) => item.asin) } },
    select: { asin: true },
  });
  const existingAsins = new Set(existingProducts.map((item) => item.asin));

  let insertedCount = 0;
  let movedExistingCount = 0;

  for (const decision of approvedDecisions) {
    if (existingAsins.has(decision.asin)) {
      await prisma.dynamicCategoryAsinDecision.update({
        where: { id: decision.id },
        data: {
          status: "existing",
          reviewedAt: new Date(),
          lastSeenAt: new Date(),
        },
      });
      movedExistingCount += 1;
      continue;
    }

    await importExpansionDecisionIntoCatalog({
      category,
      decision,
    });
    insertedCount += 1;
  }

  revalidatePath("/admin/dynamic/expansoes");
  revalidatePath("/admin/dynamic/produtos");
  redirect(
    buildRedirectUrl({
      categoryId,
      notice: encodeNotice(
        `Atualizacao concluida: ${insertedCount} inserido(s) e ${movedExistingCount} ja existentes.`
      ),
    })
  );
}

"use server";

import {
  getAmazonItemPrice,
  getAmazonVariationsViaCreators,
  type AmazonItem,
} from "@/lib/amazonApiClient";
import { enrichDynamicAttributesForCategory } from "@/lib/dynamicCategoryMetrics";
import { getDynamicVisibilityBoolean } from "@/lib/dynamicVisibility";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const AMAZON_PARTNER_TAG = process.env.AMAZON_PARTNER_TAG ?? "";
const MAX_VARIATION_PAGES = 10;
const VARIATION_PAGE_SIZE = 10;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

function toPlainObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function getExpansionErrorDetails(error: unknown) {
  const fallback = "unknown_error";
  if (!error || typeof error !== "object") {
    return { code: fallback, message: String(error) };
  }

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    body?: { reason?: unknown; type?: unknown; message?: unknown };
  };
  const code =
    (typeof candidate.body?.reason === "string" && candidate.body.reason) ||
    (typeof candidate.body?.type === "string" && candidate.body.type) ||
    (typeof candidate.code === "string" && candidate.code) ||
    fallback;
  const message =
    (typeof candidate.body?.message === "string" && candidate.body.message) ||
    (typeof candidate.message === "string" && candidate.message) ||
    "Erro sem detalhes retornados pela Amazon.";

  return { code, message };
}

async function withCreatorsRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let attempt = 0;
  let lastError: unknown;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const { code, message } = getExpansionErrorDetails(error);
      const retryText = `${code} ${message}`.toLowerCase();
      const shouldRetry =
        retryText.includes("toomanyrequests") ||
        retryText.includes("requestthrottled") ||
        retryText.includes("serviceunavailable") ||
        retryText.includes("internalfailure");
      attempt += 1;
      if (!shouldRetry || attempt >= retries) {
        break;
      }
      await delay(1200 * attempt);
    }
  }
  throw lastError;
}

async function fetchFamilyItems(asin: string) {
  const collected = new Map<string, AmazonItem>();
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= MAX_VARIATION_PAGES) {
    if (page > 1) {
      await delay(900);
    }

    const items = await withCreatorsRetry(() =>
      getAmazonVariationsViaCreators({
        asin,
        resources: [
          "ParentASIN",
          "ItemInfo.Title",
          "ItemInfo.ByLineInfo",
          "Images.Primary.Large",
          "OffersV2.Listings.Price",
        ],
        variationPage: page,
        variationCount: VARIATION_PAGE_SIZE,
      })
    );

    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      if (item?.ASIN) {
        collected.set(item.ASIN, item);
      }
    }

    hasMore = items.length === VARIATION_PAGE_SIZE;
    page += 1;
  }

  return [...collected.values()];
}

type DiscoveredCandidate = {
  item: AmazonItem;
  sourceAsin: string;
  observedPrice: number | null;
};

type ExpansionErrorSummary = Record<
  string,
  { count: number; sampleAsins: string[]; message: string }
>;

function recordExpansionError(
  summary: ExpansionErrorSummary,
  asin: string,
  error: unknown
) {
  const { code, message } = getExpansionErrorDetails(error);
  const entry = summary[code] ?? { count: 0, sampleAsins: [], message };
  entry.count += 1;
  if (entry.sampleAsins.length < 10) {
    entry.sampleAsins.push(asin);
  }
  summary[code] = entry;
}

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
  const totalPrice = typeof decision.observedPrice === "number" && decision.observedPrice > 0 ? decision.observedPrice : 0;
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

  if (!AMAZON_PARTNER_TAG) {
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

  const baseAsins = Array.from(new Set(products.map((item) => item.asin).filter(Boolean)));
  const expansionRun = await prisma.dynamicCategoryExpansionRun.create({
    data: {
      categoryId,
      status: "running",
      totalBaseAsins: baseAsins.length,
    },
  });

  if (baseAsins.length === 0) {
    await prisma.dynamicCategoryExpansionRun.update({
      where: { id: expansionRun.id },
      data: { status: "completed", finishedAt: new Date() },
    });
    redirect(
      buildRedirectUrl({
        categoryId,
        status,
        notice: encodeNotice("A categoria ainda nao possui ASINs para varrer."),
      })
    );
  }

  const processedFamilyMembers = new Set<string>();
  const discoveredCandidates = new Map<string, DiscoveredCandidate>();
  const failedBases: string[] = [];
  const errorSummary: ExpansionErrorSummary = {};
  let processedFamilies = 0;
  let noResultsBases = 0;

  for (const baseAsin of baseAsins) {
    if (processedFamilyMembers.has(baseAsin)) {
      continue;
    }

    try {
      // GetVariations aceita ASIN filho ou pai. Os filhos retornados são
      // marcados para não consultar a mesma família novamente.
      const familyItems = await fetchFamilyItems(baseAsin);
      processedFamilyMembers.add(baseAsin);
      if (familyItems.length === 0) {
        noResultsBases += 1;
      } else {
        processedFamilies += 1;
        for (const item of familyItems) {
          if (item?.ASIN) {
            processedFamilyMembers.add(item.ASIN);
            const price = getAmazonItemPrice(item);
            discoveredCandidates.set(item.ASIN, {
              item,
              sourceAsin: baseAsin,
              observedPrice: price > 0 ? price : null,
            });
          }
        }
      }

      await delay(700);
    } catch (error) {
      failedBases.push(baseAsin);
      recordExpansionError(errorSummary, baseAsin, error);
    }
  }

  const candidateAsins = Array.from(discoveredCandidates.keys());
  // A expansão não precisa ler o catálogo inteiro: consulta somente os
  // ASINs retornados pela API nesta execução.
  const existingProductsInCatalog =
    candidateAsins.length > 0
      ? await prisma.dynamicProduct.findMany({
          where: { asin: { in: candidateAsins } },
          select: { asin: true },
        })
      : [];
  const existingAsinsInCatalogSet = new Set(
    existingProductsInCatalog.map((item) => item.asin)
  );
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

  await prisma.dynamicCategoryExpansionRun.update({
    where: { id: expansionRun.id },
    data: {
      status: "completed",
      processedFamilies,
      discoveredItems: candidateAsins.length,
      missingAsins: missingAsins.length,
      failedBases: failedBases.length,
      noResultsBases,
      errorSummary: Object.keys(errorSummary).length > 0 ? errorSummary : undefined,
      finishedAt: new Date(),
    },
  });

  revalidatePath("/admin/dynamic/expansoes");
  revalidatePath("/admin/dynamic/rejeitados");

  const notice = [
    `Varredura concluida em ${category.name}.`,
    `Base: ${baseAsins.length}`,
    `Familias: ${processedFamilies}`,
    `Descobertos na API: ${candidateAsins.length}`,
    `Faltantes no banco: ${missingAsins.length}`,
    noResultsBases ? `Sem variacoes: ${noResultsBases}` : "",
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

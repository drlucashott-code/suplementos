"use server";

import paapi from "amazon-paapi";
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
};

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

function getErrorCode(error: unknown) {
  const maybe = error as { Errors?: PaapiError[] };
  if (Array.isArray(maybe?.Errors) && maybe.Errors[0]?.Code) {
    return maybe.Errors[0].Code;
  }
  return "";
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
      Resources: ["ParentASIN", "ItemInfo.Title", "ItemInfo.ByLineInfo", "Images.Primary.Large"],
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
        Resources: ["ItemInfo.Title", "ItemInfo.ByLineInfo", "Images.Primary.Large"],
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

  const category = await prisma.dynamicCategory.findUnique({
    where: { id: categoryId },
    select: { id: true, name: true },
  });

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
  const discoveredCandidates = new Map<string, PaapiItem>();
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
        discoveredCandidates.set(baseAsin, parentResult.baseItem);
      } else {
        for (const item of familyItems) {
          if (item?.ASIN) {
            discoveredCandidates.set(item.ASIN, item);
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
      if (currentStatus === "rejected_hard" || currentStatus === "imported") {
        continue;
      }

      const item = discoveredCandidates.get(asin);
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
          title,
          brand,
          imageUrl,
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
          title,
          brand,
          imageUrl,
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

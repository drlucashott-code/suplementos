"use server";

import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { enqueuePriorityRefresh } from "@/lib/priorityRefreshQueue";
import {
  touchDynamicProductPriority,
  touchTrackedProductPriority,
} from "@/lib/priceRefreshSignals";

async function logSchedulerAction(params: {
  actionType: string;
  productSource: "dynamic" | "tracked";
  asin: string;
  productId?: string;
  trackedProductId?: string;
  notes?: string;
}) {
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "AdminSchedulerActionLog" (
      "id",
      "actor",
      "actionType",
      "productSource",
      "asin",
      "productId",
      "trackedProductId",
      "notes",
      "createdAt"
    )
    VALUES (
      ${crypto.randomUUID()},
      'admin',
      ${params.actionType},
      ${params.productSource},
      ${params.asin},
      ${params.productId ?? null},
      ${params.trackedProductId ?? null},
      ${params.notes ?? null},
      NOW()
    )
  `);
}

export async function boostDynamicSchedulerProduct(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim();

  if (!productId) return;

  const result = await touchDynamicProductPriority({
    productId,
    signal: "admin_boost",
    extraBoost: 12,
  });

  if (result?.shouldEnqueue && result.asin) {
    await enqueuePriorityRefresh({
      asin: result.asin,
      reason: "admin",
    });
  }

  if (result?.asin) {
    await logSchedulerAction({
      actionType: "boost_manual",
      productSource: "dynamic",
      asin: result.asin,
      productId,
      notes: result.shouldEnqueue ? "boost com enqueue priority" : "boost sem enqueue por cooldown",
    });
  }

  revalidatePath("/admin/dynamic/refresh-scheduler");
  revalidatePath("/admin/dynamic");
}

export async function forceDynamicSchedulerRefresh(formData: FormData) {
  const productId = String(formData.get("productId") ?? "").trim();

  if (!productId) return;

  const rows = await prisma.$queryRaw<Array<{ asin: string }>>(Prisma.sql`
    UPDATE "DynamicProduct"
    SET
      "nextPriceRefreshAt" = NOW(),
      "nextPriorityEnqueueAt" = NOW(),
      "refreshLockUntil" = NULL,
      "updatedAt" = NOW()
    WHERE "id" = ${productId}
    RETURNING "asin"
  `);

  const asin = rows[0]?.asin?.trim().toUpperCase();
  if (asin) {
    await enqueuePriorityRefresh({
      asin,
      reason: "admin",
    });

    await logSchedulerAction({
      actionType: "force_refresh_now",
      productSource: "dynamic",
      asin,
      productId,
      notes: "forcado para priority immediate enqueue",
    });
  }

  revalidatePath("/admin/dynamic/refresh-scheduler");
  revalidatePath("/admin/dynamic");
}

export async function forceTrackedSchedulerRefresh(formData: FormData) {
  const trackedProductId = String(formData.get("trackedProductId") ?? "").trim();

  if (!trackedProductId) return;

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "SiteTrackedAmazonProduct"
    SET
      "nextPriceRefreshAt" = NOW(),
      "nextPriorityEnqueueAt" = NOW(),
      "refreshLockUntil" = NULL,
      "updatedAt" = NOW()
    WHERE "id" = ${trackedProductId}
  `);

  const trackedRows = await prisma.$queryRaw<Array<{ asin: string }>>(Prisma.sql`
    SELECT "asin"
    FROM "SiteTrackedAmazonProduct"
    WHERE "id" = ${trackedProductId}
    LIMIT 1
  `);

  const asin = trackedRows[0]?.asin?.trim().toUpperCase();
  if (asin) {
    await logSchedulerAction({
      actionType: "force_refresh_now",
      productSource: "tracked",
      asin,
      trackedProductId,
      notes: "forcado para proximo ciclo global",
    });
  }

  revalidatePath("/admin/dynamic/refresh-scheduler");
  revalidatePath("/admin/dynamic");
}

export async function boostTrackedSchedulerProduct(formData: FormData) {
  const trackedProductId = String(formData.get("trackedProductId") ?? "").trim();

  if (!trackedProductId) return;

  const result = await touchTrackedProductPriority({
    trackedProductId,
    signal: "admin_boost",
    extraBoost: 12,
  });

  if (result?.asin) {
    await logSchedulerAction({
      actionType: "boost_manual",
      productSource: "tracked",
      asin: result.asin,
      trackedProductId,
      notes: "boost manual para scheduler global",
    });
  }

  revalidatePath("/admin/dynamic/refresh-scheduler");
  revalidatePath("/admin/dynamic");
}

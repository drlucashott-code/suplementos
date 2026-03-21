"use server";

import { revalidatePath } from "next/cache";
import { upsertDynamicFallbackConfig } from "@/lib/dynamicFallback";

export async function saveDynamicFallbackConfig(formData: FormData) {
  const fallbackManualEnabled = formData.get("fallbackManualEnabled") === "on";
  const fallbackAutoEnabled = formData.get("fallbackAutoEnabled") === "on";
  const rawMaxAgeHours = Number(formData.get("fallbackMaxAgeHours") || 24);
  const fallbackMaxAgeHours = Number.isFinite(rawMaxAgeHours)
    ? Math.max(1, Math.min(168, Math.round(rawMaxAgeHours)))
    : 24;
  const rawAutoFailedProductsThreshold = Number(
    formData.get("fallbackAutoFailedProductsThreshold") || 200
  );
  const fallbackAutoFailedProductsThreshold = Number.isFinite(
    rawAutoFailedProductsThreshold
  )
    ? Math.max(1, Math.min(5000, Math.round(rawAutoFailedProductsThreshold)))
    : 20;
  const fallbackReason = String(formData.get("fallbackReason") || "").trim();

  await upsertDynamicFallbackConfig({
    fallbackManualEnabled,
    fallbackAutoEnabled,
    fallbackAutoFailedProductsThreshold,
    fallbackMaxAgeHours,
    fallbackReason,
  });

  revalidatePath("/admin/dynamic/fallback");
  revalidatePath("/admin/dynamic");
}

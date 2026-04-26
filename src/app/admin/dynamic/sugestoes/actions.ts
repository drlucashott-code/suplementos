"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateProductSuggestionStatus(formData: FormData) {
  const suggestionId = String(formData.get("suggestionId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  const reviewNotes = String(formData.get("reviewNotes") ?? "").trim() || null;

  if (!suggestionId || !status) return;

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "SiteProductSuggestion"
    SET
      "status" = ${status},
      "reviewNotes" = ${reviewNotes},
      "updatedAt" = NOW()
    WHERE "id" = ${suggestionId}
  `);

  revalidatePath("/admin/dynamic/sugestoes");
}

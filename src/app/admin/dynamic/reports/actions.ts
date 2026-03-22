"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function deleteProductIssueReport(formData: FormData) {
  const reportId = String(formData.get("reportId") || "").trim();

  if (!reportId) {
    return;
  }

  await prisma.$executeRaw`
    DELETE FROM "DynamicProductIssueReport"
    WHERE "id" = ${reportId}
  `;

  revalidatePath("/admin/dynamic/reports");
}

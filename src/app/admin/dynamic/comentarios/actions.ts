"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function moderateProductComment(formData: FormData) {
  const commentId = String(formData.get("commentId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!commentId || !status) return;

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "SiteProductComment"
    SET
      "status" = ${status},
      "updatedAt" = NOW()
    WHERE "id" = ${commentId}
  `);

  revalidatePath("/admin/dynamic/comentarios");
}

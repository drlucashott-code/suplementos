"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleUserCommentsBlock(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  const blocked = String(formData.get("blocked") ?? "").trim() === "true";
  if (!userId) return;

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "SiteUser"
    SET
      "commentsBlocked" = ${blocked},
      "updatedAt" = NOW()
    WHERE "id" = ${userId}
  `);

  revalidatePath("/admin/dynamic/contas");
}

export async function deleteSiteUser(formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();
  if (!userId) return;

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "SiteUser"
    WHERE "id" = ${userId}
  `);

  revalidatePath("/admin/dynamic/contas");
}

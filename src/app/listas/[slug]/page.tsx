import { notFound, redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildPublicListPath } from "@/lib/siteSocial";

export const revalidate = 300;

export default async function LegacyPublicListRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const rows = await prisma.$queryRaw<Array<{ slug: string; ownerUsername: string | null }>>(Prisma.sql`
    SELECT
      l."slug",
      u."username" AS "ownerUsername"
    FROM "SiteUserList" l
    INNER JOIN "SiteUser" u ON u."id" = l."userId"
    WHERE l."slug" = ${slug}
      AND l."isPublic" = true
    LIMIT 1
  `);

  const row = rows[0];
  if (!row) return notFound();
  if (!row.ownerUsername) return notFound();

  redirect(buildPublicListPath(row.ownerUsername, row.slug));
}

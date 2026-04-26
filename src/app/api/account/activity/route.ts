import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSiteUser } from "@/lib/siteAuth";

export async function GET() {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const [comments, reactions] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        id: string;
        body: string;
        createdAt: Date;
        productName: string;
        categoryGroup: string;
        categorySlug: string;
      }>
    >(Prisma.sql`
      SELECT
        c."id",
        c."body",
        c."createdAt",
        p."name" AS "productName",
        cat."group" AS "categoryGroup",
        cat."slug" AS "categorySlug"
      FROM "SiteProductComment" c
      INNER JOIN "DynamicProduct" p ON p."id" = c."productId"
      INNER JOIN "DynamicCategory" cat ON cat."id" = p."categoryId"
      WHERE c."userId" = ${user.id}
        AND c."status" = 'published'
      ORDER BY c."createdAt" DESC
      LIMIT 30
    `),
    prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        body: string | null;
        href: string | null;
        createdAt: Date;
      }>
    >(Prisma.sql`
      SELECT "id", "title", "body", "href", "createdAt"
      FROM "SiteUserNotification"
      WHERE "userId" = ${user.id}
        AND "type" IN ('comment_liked', 'comment_replied')
      ORDER BY "createdAt" DESC
      LIMIT 30
    `),
  ]);

  return NextResponse.json({
    ok: true,
    comments: comments.map((comment) => ({
      id: comment.id,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      productName: comment.productName,
      href: `/${comment.categoryGroup}/${comment.categorySlug}`,
    })),
    reactions: reactions.map((reaction) => ({
      id: reaction.id,
      title: reaction.title,
      body: reaction.body,
      href: reaction.href,
      createdAt: reaction.createdAt.toISOString(),
    })),
  });
}

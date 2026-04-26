import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSiteUser } from "@/lib/siteAuth";
import { createSiteNotification } from "@/lib/siteNotifications";

export async function POST(
  _request: Request,
  context: { params: Promise<{ commentId: string }> }
) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { commentId } = await context.params;
  const commentRows = await prisma.$queryRaw<
    Array<{
      userId: string;
      body: string;
      categoryGroup: string;
      categorySlug: string;
    }>
  >(Prisma.sql`
    SELECT
      c."userId",
      c."body",
      cat."group" AS "categoryGroup",
      cat."slug" AS "categorySlug"
    FROM "SiteProductComment" c
    INNER JOIN "DynamicProduct" p ON p."id" = c."productId"
    INNER JOIN "DynamicCategory" cat ON cat."id" = p."categoryId"
    WHERE c."id" = ${commentId}
    LIMIT 1
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "SiteProductCommentReaction" (
      "id",
      "commentId",
      "userId",
      "reaction",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${commentId},
      ${user.id},
      'like',
      NOW(),
      NOW()
    )
    ON CONFLICT ("commentId", "userId", "reaction") DO NOTHING
  `);

  const targetComment = commentRows[0];
  if (targetComment && targetComment.userId !== user.id) {
    await createSiteNotification({
      userId: targetComment.userId,
      type: "comment_liked",
      title: "Seu comentario recebeu uma curtida",
      body: targetComment.body.slice(0, 120),
      href: `/${targetComment.categoryGroup}/${targetComment.categorySlug}`,
      metadata: {
        commentId,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ commentId: string }> }
) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { commentId } = await context.params;
  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "SiteProductCommentReaction"
    WHERE "commentId" = ${commentId}
      AND "userId" = ${user.id}
      AND "reaction" = 'like'
  `);

  return NextResponse.json({ ok: true });
}

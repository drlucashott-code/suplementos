import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCurrentSiteUser,
  isSiteUserVerified,
  verificationRequiredResponse,
} from "@/lib/siteAuth";
import { createSiteNotification } from "@/lib/siteNotifications";
import { buildPublicListPath } from "@/lib/siteSocial";

export async function POST(
  _request: Request,
  context: { params: Promise<{ commentId: string }> }
) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  const { commentId } = await context.params;
  const commentRows = await prisma.$queryRaw<
    Array<{
      userId: string;
      body: string;
      listSlug: string;
      listOwnerUsername: string | null;
    }>
  >(Prisma.sql`
    SELECT
      c."userId",
      c."body",
      l."slug" AS "listSlug",
      u."username" AS "listOwnerUsername"
    FROM "SiteUserListComment" c
    INNER JOIN "SiteUserList" l ON l."id" = c."listId"
    INNER JOIN "SiteUser" u ON u."id" = l."userId"
    WHERE c."id" = ${commentId}
    LIMIT 1
  `);

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "SiteUserListCommentReaction" (
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
  if (targetComment && targetComment.userId !== user.id && targetComment.listOwnerUsername) {
    await createSiteNotification({
      userId: targetComment.userId,
      type: "list_comment_liked",
      title: "Seu comentario em lista recebeu uma curtida",
      body: targetComment.body.slice(0, 120),
      href: `${buildPublicListPath(targetComment.listOwnerUsername, targetComment.listSlug)}?comments=1`,
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
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  const { commentId } = await context.params;
  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "SiteUserListCommentReaction"
    WHERE "commentId" = ${commentId}
      AND "userId" = ${user.id}
      AND "reaction" = 'like'
  `);

  return NextResponse.json({ ok: true });
}

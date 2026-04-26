import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSiteUser } from "@/lib/siteAuth";

export async function POST(
  _request: Request,
  context: { params: Promise<{ commentId: string }> }
) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { commentId } = await context.params;
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

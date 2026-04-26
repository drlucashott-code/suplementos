import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCurrentSiteUser,
  isSiteUserVerified,
  verificationRequiredResponse,
} from "@/lib/siteAuth";

function canModerate(role: string | null | undefined) {
  return role === "admin";
}

export async function PATCH(
  request: Request,
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
  const body = (await request.json()) as { body?: string };
  const content = body.body?.trim() ?? "";

  if (content.length < 2) {
    return NextResponse.json({ ok: false, error: "comment_too_short" }, { status: 400 });
  }

  if (content.length > 1200) {
    return NextResponse.json({ ok: false, error: "comment_too_long" }, { status: 400 });
  }

  const rows = await prisma.$queryRaw<Array<{ id: string; userId: string }>>(Prisma.sql`
    SELECT "id", "userId"
    FROM "SiteUserListComment"
    WHERE "id" = ${commentId}
      AND "status" = 'published'
    LIMIT 1
  `);

  const comment = rows[0];
  if (!comment) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (comment.userId !== user.id && !canModerate(user.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "SiteUserListComment"
    SET
      "body" = ${content},
      "isEdited" = true,
      "updatedAt" = NOW()
    WHERE "id" = ${commentId}
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
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  const { commentId } = await context.params;
  const rows = await prisma.$queryRaw<Array<{ id: string; userId: string }>>(Prisma.sql`
    SELECT "id", "userId"
    FROM "SiteUserListComment"
    WHERE "id" = ${commentId}
      AND "status" = 'published'
    LIMIT 1
  `);

  const comment = rows[0];
  if (!comment) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  if (comment.userId !== user.id && !canModerate(user.role)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "SiteUserListComment"
    SET
      "status" = 'deleted',
      "updatedAt" = NOW()
    WHERE "id" = ${commentId}
  `);

  return NextResponse.json({ ok: true });
}

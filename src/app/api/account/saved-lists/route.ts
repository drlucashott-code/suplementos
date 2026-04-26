import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSiteUser } from "@/lib/siteAuth";

export async function GET() {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      isPublic: boolean;
      ownerDisplayName: string;
      ownerUsername: string | null;
      itemsCount: number;
    }>
  >(Prisma.sql`
    SELECT
      l."id",
      l."slug",
      l."title",
      l."description",
      l."isPublic",
      owner."displayName" AS "ownerDisplayName",
      owner."username" AS "ownerUsername",
      COUNT(i."id")::int AS "itemsCount"
    FROM "SiteUserSavedList" s
    INNER JOIN "SiteUserList" l ON l."id" = s."listId"
    INNER JOIN "SiteUser" owner ON owner."id" = l."userId"
    LEFT JOIN "SiteUserListItem" i ON i."listId" = l."id"
    WHERE s."userId" = ${user.id}
    GROUP BY l."id", owner."displayName", owner."username"
    ORDER BY s."createdAt" DESC
  `);

  return NextResponse.json({ ok: true, lists: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { listId?: string };
  const listId = body.listId?.trim() ?? "";
  if (!listId) {
    return NextResponse.json({ ok: false, error: "invalid_list" }, { status: 400 });
  }

  const listRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "SiteUserList"
    WHERE "id" = ${listId}
      AND "isPublic" = true
    LIMIT 1
  `);

  if (!listRows[0]) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "SiteUserSavedList" (
      "id",
      "userId",
      "listId",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${user.id},
      ${listId},
      NOW(),
      NOW()
    )
    ON CONFLICT ("userId", "listId") DO NOTHING
  `);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { listId?: string };
  const listId = body.listId?.trim() ?? "";
  if (!listId) {
    return NextResponse.json({ ok: false, error: "invalid_list" }, { status: 400 });
  }

  await prisma.$executeRaw(Prisma.sql`
    DELETE FROM "SiteUserSavedList"
    WHERE "userId" = ${user.id}
      AND "listId" = ${listId}
  `);

  return NextResponse.json({ ok: true });
}

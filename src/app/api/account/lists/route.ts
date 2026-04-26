import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSiteUser } from "@/lib/siteAuth";
import { createUniqueListSlug } from "@/lib/siteSocial";

export async function GET() {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const lists = await prisma.$queryRaw<
    Array<{
      id: string;
      slug: string;
      title: string;
      description: string | null;
      isPublic: boolean;
      updatedAt: Date;
      itemsCount: number;
    }>
  >(Prisma.sql`
    SELECT
      l."id",
      l."slug",
      l."title",
      l."description",
      l."isPublic",
      l."updatedAt",
      COUNT(i."id")::int AS "itemsCount"
    FROM "SiteUserList" l
    LEFT JOIN "SiteUserListItem" i ON i."listId" = l."id"
    WHERE l."userId" = ${user.id}
    GROUP BY l."id"
    ORDER BY l."updatedAt" DESC
  `);

  return NextResponse.json({ ok: true, lists });
}

export async function POST(request: Request) {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      isPublic?: boolean;
    };

    const title = body.title?.trim() ?? "";
    if (title.length < 2) {
      return NextResponse.json({ ok: false, error: "invalid_title" }, { status: 400 });
    }

    const slug = await createUniqueListSlug(user.id, title);
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        slug: string;
        title: string;
        description: string | null;
        isPublic: boolean;
      }>
    >(Prisma.sql`
      INSERT INTO "SiteUserList" (
        "id",
        "userId",
        "slug",
        "title",
        "description",
        "isPublic",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${user.id},
        ${slug},
        ${title},
        ${body.description?.trim() || null},
        ${body.isPublic === true},
        NOW(),
        NOW()
      )
      RETURNING "id", "slug", "title", "description", "isPublic"
    `);

    const list = rows[0]!;

    return NextResponse.json({ ok: true, list });
  } catch (error) {
    console.error("list_create_failed", error);
    return NextResponse.json({ ok: false, error: "list_create_failed" }, { status: 500 });
  }
}

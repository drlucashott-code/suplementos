import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isMissingRelationError } from "@/lib/prismaSchemaCompat";
import {
  getCurrentSiteUser,
  isSiteUserVerified,
  verificationRequiredResponse,
} from "@/lib/siteAuth";
import {
  touchDynamicProductPriority,
  touchTrackedProductPriority,
} from "@/lib/priceRefreshSignals";
import { enqueuePriorityRefresh } from "@/lib/priorityRefreshQueue";
import { notifyListFollower } from "@/lib/siteNotifications";

export async function GET() {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  const rows = await prisma
    .$queryRaw<
      Array<{
        id: string;
        slug: string;
        title: string;
        description: string | null;
        isPublic: boolean;
        notificationsEnabled: boolean;
        createdAt: Date;
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
        s."notificationsEnabled",
        l."createdAt",
        owner."displayName" AS "ownerDisplayName",
        owner."username" AS "ownerUsername",
        COUNT(i."id")::int AS "itemsCount",
        MAX(s."createdAt") AS "savedAt"
      FROM "SiteUserSavedList" s
      INNER JOIN "SiteUserList" l ON l."id" = s."listId"
      INNER JOIN "SiteUser" owner ON owner."id" = l."userId"
      LEFT JOIN "SiteUserListItem" i ON i."listId" = l."id"
      WHERE s."userId" = ${user.id}
      GROUP BY l."id", owner."displayName", owner."username"
      ORDER BY "savedAt" DESC
    `)
    .catch((error) => {
      if (isMissingRelationError(error, "SiteUserSavedList")) {
        return [];
      }

      throw error;
    });

  return NextResponse.json({ ok: true, lists: rows });
}

export async function POST(request: Request) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  const body = (await request.json()) as { listId?: string };
  const listId = body.listId?.trim() ?? "";
  if (!listId) {
    return NextResponse.json({ ok: false, error: "invalid_list" }, { status: 400 });
  }

  const listRows = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      userId: string;
      ownerDisplayName: string;
      ownerUsername: string | null;
    }>
  >(Prisma.sql`
    SELECT
      l."id",
      l."title",
      l."userId",
      owner."displayName" AS "ownerDisplayName",
      owner."username" AS "ownerUsername"
    FROM "SiteUserList" l
    INNER JOIN "SiteUser" owner ON owner."id" = l."userId"
    WHERE l."id" = ${listId}
      AND l."isPublic" = true
    LIMIT 1
  `);

  const list = listRows[0];
  if (!list) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const existingSaved = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "SiteUserSavedList"
    WHERE "userId" = ${user.id}
      AND "listId" = ${listId}
    LIMIT 1
  `);
  const wasAlreadySaved = Boolean(existingSaved[0]);

  try {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "SiteUserSavedList" (
        "id",
        "userId",
        "listId",
        "notificationsEnabled",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${user.id},
        ${listId},
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT ("userId", "listId") DO NOTHING
    `);
  } catch (error) {
    if (isMissingRelationError(error, "SiteUserSavedList")) {
      return NextResponse.json({ ok: false, error: "feature_unavailable" }, { status: 503 });
    }

    throw error;
  }

  if (!wasAlreadySaved && list.userId !== user.id) {
    await notifyListFollower({
      ownerUserId: list.userId,
      actorUserId: user.id,
      actorDisplayName: user.displayName,
      listId: list.id,
      listTitle: list.title,
    });
  }

  const listItems = await prisma.$queryRaw<
    Array<{ productId: string | null; trackedAmazonProductId: string | null }>
  >(Prisma.sql`
    SELECT "productId", "trackedAmazonProductId"
    FROM "SiteUserListItem"
    WHERE "listId" = ${listId}
  `);

  for (const item of listItems) {
    if (item.productId) {
      const priorityTouch = await touchDynamicProductPriority({
        productId: item.productId,
        signal: "public_list",
      });
      if (priorityTouch?.shouldEnqueue && priorityTouch.asin) {
        await enqueuePriorityRefresh({
          asin: priorityTouch.asin,
          reason: "list",
          notBeforeAt: priorityTouch.enqueueNotBeforeAt,
        });
      }
    } else if (item.trackedAmazonProductId) {
      const priorityTouch = await touchTrackedProductPriority({
        trackedProductId: item.trackedAmazonProductId,
        signal: "public_list",
      });
      if (priorityTouch?.shouldEnqueue && priorityTouch.asin) {
        await enqueuePriorityRefresh({
          asin: priorityTouch.asin,
          reason: "list",
          notBeforeAt: priorityTouch.enqueueNotBeforeAt,
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  const body = (await request.json()) as {
    listId?: string;
    notificationsEnabled?: boolean;
  };

  const listId = body.listId?.trim() ?? "";
  if (!listId || typeof body.notificationsEnabled !== "boolean") {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  try {
    const rows = await prisma.$queryRaw<
      Array<{ listId: string; notificationsEnabled: boolean }>
    >(Prisma.sql`
      UPDATE "SiteUserSavedList"
      SET
        "notificationsEnabled" = ${body.notificationsEnabled},
        "updatedAt" = NOW()
      WHERE "userId" = ${user.id}
        AND "listId" = ${listId}
      RETURNING "listId", "notificationsEnabled"
    `);

    if (!rows[0]) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      listId: rows[0].listId,
      notificationsEnabled: rows[0].notificationsEnabled,
    });
  } catch (error) {
    if (isMissingRelationError(error, "SiteUserSavedList")) {
      return NextResponse.json({ ok: false, error: "feature_unavailable" }, { status: 503 });
    }

    throw error;
  }
}

export async function DELETE(request: Request) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  const body = (await request.json()) as { listId?: string };
  const listId = body.listId?.trim() ?? "";
  if (!listId) {
    return NextResponse.json({ ok: false, error: "invalid_list" }, { status: 400 });
  }

  try {
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "SiteUserSavedList"
      WHERE "userId" = ${user.id}
        AND "listId" = ${listId}
    `);
  } catch (error) {
    if (isMissingRelationError(error, "SiteUserSavedList")) {
      return NextResponse.json({ ok: false, error: "feature_unavailable" }, { status: 503 });
    }

    throw error;
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCurrentSiteUser,
  isSiteUserVerified,
  verificationRequiredResponse,
} from "@/lib/siteAuth";
import { createSiteNotification } from "@/lib/siteNotifications";
import { buildPublicListPath } from "@/lib/siteSocial";

type CommentRow = {
  id: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
  parentId: string | null;
  status: string;
  userId: string;
  userDisplayName: string;
  username: string | null;
  userAvatarUrl: string | null;
  likeCount: number;
  likedByMe: boolean;
};

type CommentNode = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  isEdited: boolean;
  parentId: string | null;
  likeCount: number;
  likedByMe: boolean;
  canEdit: boolean;
  canDelete: boolean;
  user: {
    id: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  };
  replies: CommentNode[];
};

function canModerate(role: string | null | undefined) {
  return role === "admin";
}

function buildCommentTree(rows: CommentRow[], currentUserId?: string | null, currentUserRole?: string | null) {
  const nodes = new Map<string, CommentNode>();

  for (const row of rows) {
    nodes.set(row.id, {
      id: row.id,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      isEdited: row.isEdited,
      parentId: row.parentId,
      likeCount: row.likeCount,
      likedByMe: row.likedByMe,
      canEdit: currentUserId === row.userId,
      canDelete: currentUserId === row.userId || canModerate(currentUserRole),
      user: {
        id: row.userId,
        displayName: row.userDisplayName,
        username: row.username,
        avatarUrl: row.userAvatarUrl,
      },
      replies: [],
    });
  }

  const roots: CommentNode[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    if (row.parentId && nodes.has(row.parentId)) {
      nodes.get(row.parentId)!.replies.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

async function fetchComments(listId: string, currentUserId?: string | null, currentUserRole?: string | null) {
  const rows = await prisma.$queryRaw<CommentRow[]>(Prisma.sql`
    SELECT
      c."id",
      c."body",
      c."createdAt",
      c."updatedAt",
      c."isEdited",
      c."parentId",
      c."status",
      u."id" AS "userId",
      u."displayName" AS "userDisplayName",
      u."username" AS "username",
      u."avatarUrl" AS "userAvatarUrl",
      COALESCE((
        SELECT COUNT(*)::int
        FROM "SiteUserListCommentReaction" r
        WHERE r."commentId" = c."id"
          AND r."reaction" = 'like'
      ), 0) AS "likeCount",
      COALESCE((
        SELECT EXISTS(
          SELECT 1
          FROM "SiteUserListCommentReaction" r2
          WHERE r2."commentId" = c."id"
            AND r2."reaction" = 'like'
            AND r2."userId" = ${currentUserId ?? ""}
        )
      ), false) AS "likedByMe"
    FROM "SiteUserListComment" c
    INNER JOIN "SiteUser" u ON u."id" = c."userId"
    WHERE c."listId" = ${listId}
      AND c."status" = 'published'
      AND (
        u."commentsBlocked" = false
        OR c."userId" = ${currentUserId ?? ""}
        OR ${canModerate(currentUserRole)}
      )
    ORDER BY c."createdAt" ASC
  `);

  return buildCommentTree(rows, currentUserId, currentUserRole);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const currentUser = await getCurrentSiteUser();

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "SiteUserList"
    WHERE "id" = ${id}
      AND "isPublic" = true
    LIMIT 1
  `);

  if (!rows[0]) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const comments = await fetchComments(id, currentUser?.id, currentUser?.role);
  return NextResponse.json({
    ok: true,
    comments,
    currentUserId: currentUser?.id ?? null,
  });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  const { id } = await context.params;

  try {
    const body = (await request.json()) as {
      body?: string;
      parentId?: string;
    };

    const content = body.body?.trim() ?? "";
    const parentId = body.parentId?.trim() || null;

    if (content.length < 2) {
      return NextResponse.json({ ok: false, error: "comment_too_short" }, { status: 400 });
    }

    if (content.length > 1200) {
      return NextResponse.json({ ok: false, error: "comment_too_long" }, { status: 400 });
    }

    const listRows = await prisma.$queryRaw<
      Array<{ id: string; slug: string; userUsername: string | null }>
    >(Prisma.sql`
      SELECT
        l."id",
        l."slug",
        u."username" AS "userUsername"
      FROM "SiteUserList" l
      INNER JOIN "SiteUser" u ON u."id" = l."userId"
      WHERE l."id" = ${id}
        AND l."isPublic" = true
      LIMIT 1
    `);

    const list = listRows[0];
    if (!list) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
    }

    const userRows = await prisma.$queryRaw<Array<{ commentsBlocked: boolean }>>(Prisma.sql`
      SELECT "commentsBlocked"
      FROM "SiteUser"
      WHERE "id" = ${user.id}
      LIMIT 1
    `);

    const isCommentsBlocked = userRows[0]?.commentsBlocked === true;

    if (parentId) {
      const parent = await prisma.$queryRaw<Array<{ id: string; userId: string }>>(Prisma.sql`
        SELECT "id", "userId"
        FROM "SiteUserListComment"
        WHERE "id" = ${parentId}
          AND "listId" = ${id}
          AND "status" = 'published'
        LIMIT 1
      `);

      if (!parent[0]) {
        return NextResponse.json({ ok: false, error: "invalid_parent" }, { status: 400 });
      }

      if (parent[0].userId !== user.id && list.userUsername) {
        await createSiteNotification({
          userId: parent[0].userId,
          type: "list_comment_replied",
          title: "Seu comentario em lista recebeu uma resposta",
          body: content.slice(0, 120),
          href: `${buildPublicListPath(list.userUsername, list.slug)}?comments=1`,
          metadata: {
            parentCommentId: parentId,
            listId: id,
          },
        });
      }
    }

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "SiteUserListComment" (
        "id",
        "listId",
        "userId",
        "parentId",
        "body",
        "status",
        "isEdited",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${id},
        ${user.id},
        ${parentId},
        ${content},
        'published',
        false,
        NOW(),
        NOW()
      )
    `);

    const comments = await fetchComments(id, user.id, user.role);
    return NextResponse.json({ ok: true, comments, shadowBlocked: isCommentsBlocked });
  } catch (error) {
    console.error("list_comment_create_failed", error);
    return NextResponse.json(
      { ok: false, error: "list_comment_create_failed" },
      { status: 500 }
    );
  }
}

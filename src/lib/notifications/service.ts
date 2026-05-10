import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildAccountListPath } from "@/lib/siteSocial";
import {
  buildNotificationEmailPayload,
  sendTransactionalEmail,
} from "@/lib/notifications/email";
import {
  getNotificationPreferences,
  isNotificationChannelEnabled,
} from "@/lib/notifications/preferences";
import { sendPushToUser } from "@/lib/notifications/push";
import type {
  CreateSiteNotificationInput,
  NotificationCategory,
  SiteNotificationItem,
} from "@/lib/notifications/types";

const PRICE_TYPES = new Set([
  "favorite_price_drop",
  "monitored_price_drop",
  "favorite_back_in_stock",
  "monitored_back_in_stock",
  "composite_price_stock",
]);

const COMMENT_TYPES = new Set([
  "comment_replied",
  "comment_liked",
  "list_comment_replied",
  "list_comment_liked",
]);

const LIST_TYPES = new Set(["list_saved", "list_comment", "list_followed"]);

function getNotificationCategory(type: string): NotificationCategory {
  if (PRICE_TYPES.has(type)) return "product";
  if (COMMENT_TYPES.has(type)) return "social";
  if (LIST_TYPES.has(type)) return "list";
  if (type === "mention" || type === "comment_mentioned") return "social";
  return "system";
}

function getNotificationPriority(type: string, category: NotificationCategory) {
  if (type === "composite_price_stock") return 100;
  if (PRICE_TYPES.has(type)) return 90;
  if (type === "mention") return 80;
  if (type === "comment_replied" || type === "list_comment_replied") return 75;
  if (type === "comment_liked" || type === "list_comment_liked") return 60;
  if (type === "list_saved" || type === "list_followed") return 50;
  return category === "system" ? 40 : 55;
}

function getCooldownMinutes(type: string) {
  if (PRICE_TYPES.has(type)) return 60;
  if (type === "mention") return 20;
  if (type.includes("comment")) return 20;
  if (type.includes("list")) return 30;
  return 15;
}

function mergeJsonMetadata(
  left: Prisma.JsonValue | null | undefined,
  right: Prisma.InputJsonValue | null | undefined
) {
  const leftObject =
    left && typeof left === "object" && !Array.isArray(left) ? (left as Record<string, unknown>) : {};
  const rightObject =
    right && typeof right === "object" && !Array.isArray(right) ? (right as Record<string, unknown>) : {};

  return {
    ...leftObject,
    ...rightObject,
  } as Prisma.InputJsonValue;
}

function getMetadataValue(
  metadata: Prisma.JsonValue | Prisma.InputJsonValue | null | undefined,
  key: string
) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === "string" ? value : value == null ? null : String(value);
}

function formatCurrency(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return null;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function buildDefaultHref(input: CreateSiteNotificationInput) {
  if (input.href) return input.href;
  if (input.targetListId) return buildAccountListPath(input.targetListId, "mine");
  if (input.targetProductId) return `/produto/${input.targetProductId}`;
  if (input.targetCommentId && input.targetListId) {
    return `${buildAccountListPath(input.targetListId, "mine")}?comments=1`;
  }
  return "/notificacoes";
}

function getGroupedKey(input: CreateSiteNotificationInput) {
  if (input.groupedKey) return input.groupedKey;
  if (input.targetProductId) return `product:${input.targetProductId}`;
  if (input.targetCommentId) return `comment:${input.targetCommentId}`;
  if (input.targetListId) return `list:${input.targetListId}`;
  if (input.targetUserId) return `user:${input.targetUserId}`;
  return `${input.type}:${input.userId}`;
}

function buildCompositePriceBody(params: {
  title: string;
  oldPrice?: number | null;
  newPrice?: number | null;
}) {
  const oldPrice = formatCurrency(params.oldPrice);
  const newPrice = formatCurrency(params.newPrice);
  if (oldPrice && newPrice) {
    return `${params.title} agora está por ${newPrice}, abaixo do preço anterior de ${oldPrice}.`;
  }
  if (newPrice) {
    return `${params.title} agora está por ${newPrice}.`;
  }
  return params.title;
}

function buildSimpleBody(params: {
  title: string;
  actorName?: string | null;
  snippet?: string | null;
}) {
  const parts = [params.actorName, params.snippet].filter(Boolean);
  if (parts.length === 0) return params.title;
  return parts.join(" · ");
}

type NotificationDispatchTarget = {
  id: string;
  userId: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string | null;
  href: string | null;
  priority: number;
  groupedKey: string | null;
  clickedAt: Date | null;
  actorUserId: string | null;
  targetUserId: string | null;
  targetProductId: string | null;
  targetListId: string | null;
  targetCommentId: string | null;
};

async function createDeliveryLog(input: {
  userId: string;
  notificationId: string | null;
  channel: "email" | "push";
  status: "pending" | "sent" | "failed" | "skipped";
  providerMessageId?: string | null;
  payload?: Prisma.InputJsonValue;
  lastError?: string | null;
}) {
  try {
    return await prisma.siteNotificationDelivery.create({
      data: {
        userId: input.userId,
        notificationId: input.notificationId,
        channel: input.channel,
        status: input.status,
        providerMessageId: input.providerMessageId ?? null,
        payload: input.payload ?? Prisma.JsonNull,
        lastError: input.lastError ?? null,
        attemptCount: input.status === "failed" ? 1 : 0,
        scheduledAt: new Date(),
      },
    });
  } catch (error) {
    console.error("notification_delivery_log_failed", error);
    return null;
  }
}

async function mergeOrCreateCentralNotification(input: CreateSiteNotificationInput) {
  const category = input.category ?? getNotificationCategory(input.type);
  const groupedKey = getGroupedKey(input);
  const priority = input.priority ?? getNotificationPriority(input.type, category);
  const cooldownMinutes = getCooldownMinutes(input.type);
  const cutoff = new Date(Date.now() - cooldownMinutes * 60_000);

  const candidate = await prisma.siteUserNotification.findFirst({
    where: {
      userId: input.userId,
      isRead: false,
      groupedKey,
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!candidate) {
    const created = await prisma.siteUserNotification.create({
      data: {
        userId: input.userId,
        category,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        href: buildDefaultHref(input),
        metadata: input.metadata ?? undefined,
        priority,
        groupedKey,
        actorUserId: input.actorUserId ?? null,
        targetUserId: input.targetUserId ?? null,
        targetProductId: input.targetProductId ?? null,
        targetListId: input.targetListId ?? null,
        targetCommentId: input.targetCommentId ?? null,
      },
    });

    return { notification: created, merged: false as const };
  }

  const isPriceComposite =
    PRICE_TYPES.has(candidate.type) && PRICE_TYPES.has(input.type) && candidate.type !== input.type;

  const mergedType = isPriceComposite ? "composite_price_stock" : input.type;
  const mergedCategory = isPriceComposite ? "product" : category;
  const mergedPriority = Math.max(candidate.priority ?? 0, priority);
  const mergedMetadata = mergeJsonMetadata(candidate.metadata, input.metadata);
  const mergedBody =
    input.body ?? candidate.body ?? null;
  const mergedTitle = isPriceComposite
    ? "Produto voltou ao estoque com preço reduzido"
    : input.title ?? candidate.title;

  const updated = await prisma.siteUserNotification.update({
    where: { id: candidate.id },
    data: {
      category: mergedCategory,
      type: mergedType,
      title: mergedTitle,
      body: mergedBody,
      href: buildDefaultHref(input),
      metadata: mergedMetadata,
      priority: mergedPriority,
      groupedKey,
      actorUserId: input.actorUserId ?? candidate.actorUserId,
      targetUserId: input.targetUserId ?? candidate.targetUserId,
      targetProductId: input.targetProductId ?? candidate.targetProductId,
      targetListId: input.targetListId ?? candidate.targetListId,
      targetCommentId: input.targetCommentId ?? candidate.targetCommentId,
      updatedAt: new Date(),
    },
  });

  return { notification: updated, merged: true as const };
}

async function dispatchDeliveryChannels(
  notification: NotificationDispatchTarget,
  input: CreateSiteNotificationInput
) {
  const prefs = await getNotificationPreferences(input.userId);
  const user = await prisma.siteUser.findUnique({
    where: { id: input.userId },
    select: { email: true, displayName: true },
  });

  if (!user) return;

  const basePayload = {
    title: notification.title,
    body: notification.body ?? notification.title,
    href: notification.href ?? buildDefaultHref(input),
  };
  const actorDisplayName = getMetadataValue(input.metadata as Prisma.JsonValue | undefined, "actorDisplayName");
  const listName = getMetadataValue(input.metadata as Prisma.JsonValue | undefined, "listName");
  const productName = getMetadataValue(input.metadata as Prisma.JsonValue | undefined, "productName");
  const oldPrice = getMetadataValue(input.metadata as Prisma.JsonValue | undefined, "oldPrice");
  const newPrice = getMetadataValue(input.metadata as Prisma.JsonValue | undefined, "newPrice");
  const priceDropPercent = getMetadataValue(input.metadata as Prisma.JsonValue | undefined, "priceDropPercent");
  const centralEnabled = isNotificationChannelEnabled(prefs, notification.type, "central");
  const emailEnabled = isNotificationChannelEnabled(prefs, notification.type, "email");
  const pushEnabled = isNotificationChannelEnabled(prefs, notification.type, "push");

  if (emailEnabled) {
    const emailKind =
      notification.type === "composite_price_stock"
        ? "composite_price_stock"
        : notification.type === "comment_replied"
          ? "comment_reply"
          : notification.type === "comment_liked"
            ? "comment_like"
            : notification.type === "list_comment_replied"
              ? "list_comment_reply"
              : notification.type === "list_comment_liked"
                ? "list_comment_like"
                : PRICE_TYPES.has(notification.type)
                  ? notification.type.includes("back_in_stock")
                    ? "back_in_stock"
                    : "price_drop"
                  : notification.type === "mention"
                    ? "mention"
                    : notification.type.includes("list")
                      ? "list_follow"
                      : "interaction";

    const emailPayload = buildNotificationEmailPayload({
      to: user.email,
      kind: emailKind,
      actorName: actorDisplayName ?? user.displayName,
      title: notification.title,
      body: notification.body ?? notification.title,
      href: basePayload.href,
      productName,
      listName,
      oldPrice: oldPrice ? Number(oldPrice) : null,
      newPrice: newPrice ? Number(newPrice) : null,
      priceDropPercent: priceDropPercent ? Number(priceDropPercent) : null,
    });

    const emailLog = await createDeliveryLog({
      userId: input.userId,
      notificationId: centralEnabled ? notification.id : null,
      channel: "email",
      status: "pending",
      payload: emailPayload as unknown as Prisma.InputJsonValue,
    });

    const sent = await sendTransactionalEmail(emailPayload);
    if (emailLog) {
      await prisma.siteNotificationDelivery.update({
        where: { id: emailLog.id },
        data: {
          status: sent ? "sent" : "failed",
          sentAt: sent ? new Date() : null,
          lastError: sent ? null : "email_delivery_failed",
          attemptCount: { increment: 1 },
        },
      });
    }
  }

  if (pushEnabled) {
    const pushPayload = {
      title: basePayload.title,
      body: basePayload.body ?? basePayload.title,
      href: basePayload.href,
      tag: notification.groupedKey ?? notification.href ?? notification.id,
      data: {
        notificationId: notification.id,
        userId: input.userId,
        type: notification.type,
        href: basePayload.href,
      },
    };

    const pushLog = await createDeliveryLog({
      userId: input.userId,
      notificationId: centralEnabled ? notification.id : null,
      channel: "push",
      status: "pending",
      payload: pushPayload as unknown as Prisma.InputJsonValue,
    });

    const pushResult = await sendPushToUser({
      userId: input.userId,
      title: pushPayload.title,
      body: pushPayload.body,
      href: pushPayload.href,
      tag: pushPayload.tag,
      data: pushPayload.data,
    });

    if (pushLog) {
      await prisma.siteNotificationDelivery.update({
        where: { id: pushLog.id },
        data: {
          status: pushResult.sent ? "sent" : "failed",
          sentAt: pushResult.sent ? new Date() : null,
          lastError: pushResult.sent ? null : (pushResult.reason ?? "push_delivery_failed"),
          attemptCount: { increment: 1 },
        },
      });
    }
  }
}

export async function createSiteNotification(input: CreateSiteNotificationInput) {
  const prefs = await getNotificationPreferences(input.userId);
  const category = input.category ?? getNotificationCategory(input.type);
  const groupedKey = getGroupedKey(input);
  const priority = input.priority ?? getNotificationPriority(input.type, category);
  const notificationInput = {
    ...input,
    category,
    groupedKey,
    priority,
    href: buildDefaultHref(input),
  };

  if (
    !isNotificationChannelEnabled(prefs, input.type, "central") &&
    !isNotificationChannelEnabled(prefs, input.type, "email") &&
    !isNotificationChannelEnabled(prefs, input.type, "push")
  ) {
    return null;
  }

  let notification: NotificationDispatchTarget | null = null;

  if (isNotificationChannelEnabled(prefs, input.type, "central")) {
    const result = await mergeOrCreateCentralNotification(notificationInput);
    notification = result.notification as NotificationDispatchTarget;
  }

  const targetNotification =
    notification ??
    ({
      id: randomUUID(),
      userId: input.userId,
      type: input.type,
      category,
      title: input.title,
      body: input.body ?? null,
      href: notificationInput.href ?? null,
      priority,
      groupedKey,
      clickedAt: null,
      actorUserId: input.actorUserId ?? null,
      targetUserId: input.targetUserId ?? null,
      targetProductId: input.targetProductId ?? null,
      targetListId: input.targetListId ?? null,
      targetCommentId: input.targetCommentId ?? null,
    } as const);

  await dispatchDeliveryChannels(targetNotification, notificationInput);

  return notification;
}

export async function getSiteNotifications(userId: string, limit = 20) {
  const rows = await prisma.siteUserNotification.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: Math.max(1, Math.min(limit, 100)),
  });

  return rows.map<SiteNotificationItem>((row) => ({
    id: row.id,
    type: row.type,
    category: row.category as NotificationCategory,
    title: row.title,
    body: row.body,
    href: row.href,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
    priority: row.priority,
    groupedKey: row.groupedKey,
    clickedAt: row.clickedAt ? row.clickedAt.toISOString() : null,
    actorUserId: row.actorUserId,
    targetUserId: row.targetUserId,
    targetProductId: row.targetProductId,
    targetListId: row.targetListId,
    targetCommentId: row.targetCommentId,
  }));
}

export async function listSiteNotifications(input: {
  userId: string;
  limit?: number;
  cursor?: string | null;
  unreadOnly?: boolean;
}) {
  const limit = Math.max(1, Math.min(input.limit ?? 20, 100));
  const cursorDate = input.cursor ? new Date(input.cursor) : null;
  const conditions: Prisma.Sql[] = [Prisma.sql`n."userId" = ${input.userId}`];

  if (cursorDate) {
    conditions.push(Prisma.sql`n."createdAt" < ${cursorDate}`);
  }

  if (input.unreadOnly) {
    conditions.push(Prisma.sql`n."isRead" = false`);
  }

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      type: string;
      category: string;
      title: string;
      body: string | null;
      href: string | null;
      isRead: boolean;
      createdAt: Date;
      priority: number;
      groupedKey: string | null;
      clickedAt: Date | null;
      actorUserId: string | null;
      targetUserId: string | null;
      targetProductId: string | null;
      targetListId: string | null;
      targetCommentId: string | null;
    }>
  >(Prisma.sql`
    SELECT
      n."id",
      n."type",
      n."category",
      n."title",
      n."body",
      n."href",
      n."isRead",
      n."createdAt",
      n."priority",
      n."groupedKey",
      n."clickedAt",
      n."actorUserId",
      n."targetUserId",
      n."targetProductId",
      n."targetListId",
      n."targetCommentId"
    FROM "SiteUserNotification" n
    WHERE ${Prisma.join(conditions, " AND ")}
    ORDER BY n."createdAt" DESC, n."id" DESC
    LIMIT ${limit + 1}
  `);

  const hasMore = rows.length > limit;
  const nextRows = hasMore ? rows.slice(0, limit) : rows;
  const items = nextRows.map<SiteNotificationItem>((row) => ({
    id: row.id,
    type: row.type,
    category: row.category as NotificationCategory,
    title: row.title,
    body: row.body,
    href: row.href,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
    priority: row.priority,
    groupedKey: row.groupedKey,
    clickedAt: row.clickedAt ? row.clickedAt.toISOString() : null,
    actorUserId: row.actorUserId,
    targetUserId: row.targetUserId,
    targetProductId: row.targetProductId,
    targetListId: row.targetListId,
    targetCommentId: row.targetCommentId,
  }));

  return {
    items,
    hasMore,
    nextCursor: items.length > 0 ? items[items.length - 1]?.createdAt ?? null : null,
  };
}

export async function countUnreadNotifications(userId: string) {
  return prisma.siteUserNotification.count({
    where: {
      userId,
      isRead: false,
    },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.siteUserNotification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  await prisma.siteUserNotification.updateMany({
    where: { userId, id: notificationId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function clearNotifications(userId: string) {
  await prisma.siteUserNotification.deleteMany({
    where: { userId },
  });
}

export async function markNotificationClicked(userId: string, notificationId: string) {
  await prisma.siteUserNotification.updateMany({
    where: { userId, id: notificationId },
    data: { clickedAt: new Date() },
  });
}

export function extractMentionUsernames(body: string) {
  const usernames = new Set<string>();
  const regex = /(^|[^A-Za-z0-9._-])@([A-Za-z0-9._-]{3,32})/g;
  let match: RegExpExecArray | null = null;

  while ((match = regex.exec(body)) !== null) {
    const username = match[2]?.trim().toLowerCase();
    if (username) {
      usernames.add(username);
    }
  }

  return [...usernames];
}

export async function notifyMentions(params: {
  actorUserId: string;
  actorDisplayName: string;
  body: string;
  href: string;
  title: string;
  category?: NotificationCategory;
  targetListId?: string | null;
  targetProductId?: string | null;
  targetCommentId?: string | null;
}) {
  const usernames = extractMentionUsernames(params.body);
  if (usernames.length === 0) return;

  const mentionedUsers = await prisma.$queryRaw<
    Array<{ id: string; username: string | null; displayName: string; email: string }>
  >(Prisma.sql`
    SELECT "id", "username", "displayName", "email"
    FROM "SiteUser"
    WHERE lower("username") IN (${Prisma.join(usernames.map((username) => Prisma.sql`${username}`))})
  `);

  for (const mentionedUser of mentionedUsers) {
    if (!mentionedUser.username || mentionedUser.id === params.actorUserId) continue;

    await createSiteNotification({
      userId: mentionedUser.id,
      type: "mention",
      category: params.category ?? "social",
      title: "Você foi mencionado",
      body: buildSimpleBody({
        title: params.title,
        actorName: params.actorDisplayName,
        snippet: params.body.slice(0, 140),
      }),
      href: params.href,
      actorUserId: params.actorUserId,
      targetListId: params.targetListId ?? null,
      targetProductId: params.targetProductId ?? null,
      targetCommentId: params.targetCommentId ?? null,
      targetUserId: mentionedUser.id,
      metadata: {
        actorUserId: params.actorUserId,
        actorDisplayName: params.actorDisplayName,
        listName: params.title,
      },
      groupedKey: params.targetCommentId ? `mention:${params.targetCommentId}` : undefined,
    });
  }
}

export async function notifyListFollower(params: {
  ownerUserId: string;
  actorUserId: string;
  actorDisplayName: string;
  listId: string;
  listTitle: string;
}) {
  if (params.ownerUserId === params.actorUserId) return;

  await createSiteNotification({
    userId: params.ownerUserId,
    type: "list_followed",
    category: "list",
    title: "Sua lista ganhou um seguidor",
    body: `${params.actorDisplayName} passou a acompanhar "${params.listTitle}".`,
    href: buildAccountListPath(params.listId, "mine"),
    actorUserId: params.actorUserId,
    targetListId: params.listId,
    targetUserId: params.ownerUserId,
    priority: 50,
    groupedKey: `list-follow:${params.listId}:${params.actorUserId}`,
    metadata: {
      actorDisplayName: params.actorDisplayName,
      listTitle: params.listTitle,
      listName: params.listTitle,
    },
  });
}

export async function notifyCommentReply(params: {
  recipientUserId: string;
  actorUserId: string;
  actorDisplayName: string;
  body: string;
  href: string;
  title: string;
  targetCommentId: string;
  targetListId?: string | null;
  targetProductId?: string | null;
}) {
  if (params.recipientUserId === params.actorUserId) return;

  await createSiteNotification({
    userId: params.recipientUserId,
    type: "comment_replied",
    category: "social",
    title: params.title,
    body: buildSimpleBody({
      title: params.title,
      actorName: params.actorDisplayName,
      snippet: params.body.slice(0, 140),
    }),
    href: params.href,
    actorUserId: params.actorUserId,
    targetCommentId: params.targetCommentId,
    targetListId: params.targetListId ?? null,
    targetProductId: params.targetProductId ?? null,
    targetUserId: params.recipientUserId,
    groupedKey: `reply:${params.targetCommentId}`,
    priority: 75,
  });
}

export async function notifyCommentReaction(params: {
  recipientUserId: string;
  actorUserId: string;
  actorDisplayName: string;
  body: string;
  href: string;
  title: string;
  targetCommentId: string;
  targetListId?: string | null;
  targetProductId?: string | null;
  type?: "comment_liked" | "list_comment_liked";
}) {
  if (params.recipientUserId === params.actorUserId) return;

  await createSiteNotification({
    userId: params.recipientUserId,
    type: params.type ?? "comment_liked",
    category: "social",
    title: params.title,
    body: buildSimpleBody({
      title: params.title,
      actorName: params.actorDisplayName,
      snippet: params.body.slice(0, 140),
    }),
    href: params.href,
    actorUserId: params.actorUserId,
    targetCommentId: params.targetCommentId,
    targetListId: params.targetListId ?? null,
    targetProductId: params.targetProductId ?? null,
    targetUserId: params.recipientUserId,
    groupedKey: `reaction:${params.targetCommentId}`,
    priority: 60,
  });
}

export async function notifyPriceChange(params: {
  userId: string;
  productId: string;
  productName: string;
  href: string;
  type: "favorite_price_drop" | "monitored_price_drop" | "favorite_back_in_stock" | "monitored_back_in_stock";
  oldPrice?: number | null;
  newPrice?: number | null;
  priceDropPercent?: number | null;
}) {
  const category = "product";
  const isStock = params.type.includes("back_in_stock");
  const title = isStock
    ? "Produto voltou ao estoque"
    : "Produto monitorado caiu de preço";
  const body = isStock
    ? `${params.productName} voltou ao estoque.`
    : buildCompositePriceBody({
        title: params.productName,
        oldPrice: params.oldPrice,
        newPrice: params.newPrice,
      });

  await createSiteNotification({
    userId: params.userId,
    type: params.type,
    category,
    title,
    body,
    href: params.href,
    targetProductId: params.productId,
    priority: isStock ? 90 : 95,
    groupedKey: `product:${params.productId}`,
    metadata: {
      productId: params.productId,
      productName: params.productName,
      oldPrice: params.oldPrice,
      newPrice: params.newPrice,
      priceDropPercent: params.priceDropPercent,
    },
  });
}

export async function notifyComposedPriceStock(params: {
  userId: string;
  productId: string;
  productName: string;
  href: string;
  oldPrice?: number | null;
  newPrice?: number | null;
  priceDropPercent?: number | null;
}) {
  await createSiteNotification({
    userId: params.userId,
    type: "composite_price_stock",
    category: "product",
    title: "Produto voltou ao estoque com preço reduzido",
    body: buildCompositePriceBody({
      title: params.productName,
      oldPrice: params.oldPrice,
      newPrice: params.newPrice,
    }),
    href: params.href,
    targetProductId: params.productId,
    priority: 100,
    groupedKey: `product:${params.productId}`,
    metadata: {
      productId: params.productId,
      productName: params.productName,
      oldPrice: params.oldPrice,
      newPrice: params.newPrice,
      priceDropPercent: params.priceDropPercent,
      composed: true,
    },
  });
}

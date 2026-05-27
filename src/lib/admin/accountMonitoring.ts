import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AccountMonitoringFilter =
  | "all"
  | "active"
  | "new"
  | "abandoned"
  | "push"
  | "no-lists"
  | "suspicious"
  | "power"
  | "inactive";

export type AccountMonitoringUserRow = {
  id: string;
  displayName: string;
  username: string | null;
  email: string;
  role: string;
  commentsBlocked: boolean;
  avatarUrl: string | null;
  googleId: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  lastSessionAt: Date | null;
  activeSessionCount: number;
  sessions30d: number;
  listsCreated: number;
  publicLists: number;
  privateLists: number;
  savedListsCount: number;
  monitoredProductsCount: number;
  productCommentsCount: number;
  listCommentsCount: number;
  productReactionsGiven: number;
  listReactionsGiven: number;
  productReactionsReceived: number;
  listReactionsReceived: number;
  followersCount: number;
  pushEnabled: boolean;
  emailEnabled: boolean;
  centralEnabled: boolean;
  notificationsEnabled: boolean;
  lastCommentAt: Date | null;
  lastListAt: Date | null;
  lastMonitoredAt: Date | null;
  lastNotificationAt: Date | null;
  userAgent: string | null;
};

export type AccountMonitoringSummary = {
  totalUsers: number;
  activeToday: number;
  newToday: number;
  returning7d: number;
  abandoned: number;
  pushEnabledPct: number;
  avgListsPerUser: number;
  avgCommentsPerUser: number;
  noActivityAfterSignup: number;
};

export type AccountMonitoringTimelineItem = {
  id: string;
  type: "login" | "list" | "comment" | "reaction" | "monitoring" | "notification";
  title: string;
  body: string | null;
  href: string | null;
  createdAt: string;
};

function maxDate(...values: Array<Date | string | null | undefined>) {
  const timestamps = values
    .map((value) => (value ? new Date(value).getTime() : Number.NaN))
    .filter((value) => Number.isFinite(value));
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps));
}

function parseUserAgent(userAgent: string | null) {
  if (!userAgent) {
    return { browser: "Desconhecido", os: "Desconhecido" };
  }

  const lower = userAgent.toLowerCase();
  const browser =
    lower.includes("edg/") || lower.includes("edge/")
      ? "Edge"
      : lower.includes("chrome/")
        ? "Chrome"
        : lower.includes("safari/")
          ? "Safari"
          : lower.includes("firefox/")
            ? "Firefox"
            : "Navegador";

  const os = lower.includes("windows")
    ? "Windows"
    : lower.includes("iphone") || lower.includes("ipad") || lower.includes("ios")
      ? "iPhone"
      : lower.includes("android")
        ? "Android"
        : lower.includes("mac os") || lower.includes("macintosh")
          ? "macOS"
          : lower.includes("linux")
            ? "Linux"
            : "Sistema";

  return { browser, os };
}

function activityLabel(row: AccountMonitoringUserRow) {
  const lastAccess = row.lastLoginAt ?? row.lastSessionAt ?? row.lastCommentAt ?? row.lastListAt ?? row.createdAt;
  const ageDays = Math.max(0, Math.floor((Date.now() - lastAccess.getTime()) / 86_400_000));
  if (row.activeSessionCount > 0 || ageDays === 0) return "Agora";
  if (ageDays <= 1) return "Hoje";
  if (ageDays <= 7) return "Recente";
  if (ageDays <= 30) return "Pouco ativo";
  return "Abandonado";
}

function activityHealth(row: AccountMonitoringUserRow) {
  if (row.commentsBlocked) return "Alto risco";
  const lastAccess = row.lastLoginAt ?? row.lastSessionAt ?? row.lastCommentAt ?? row.lastListAt ?? row.createdAt;
  const ageDays = Math.max(0, Math.floor((Date.now() - lastAccess.getTime()) / 86_400_000));
  const signalScore =
    row.listsCreated * 8 +
    row.monitoredProductsCount * 5 +
    row.productCommentsCount * 3 +
    row.listCommentsCount * 3 +
    row.followersCount * 2 +
    row.productReactionsReceived * 2 +
    row.listReactionsReceived * 2 +
    (row.pushEnabled ? 5 : 0);

  if (row.productCommentsCount === 0 && row.listCommentsCount === 0 && row.listsCreated === 0 && row.monitoredProductsCount === 0) {
    if (ageDays > 30) return "Sem atividade";
    if (ageDays > 7) return "Conta fria";
  }

  if (signalScore >= 60) return "Muito engajado";
  if (signalScore >= 20) return "Ativo";
  if (ageDays > 14) return "Pouco ativo";
  return "Novo";
}

function riskScore(row: AccountMonitoringUserRow) {
  let score = 0;
  if (row.commentsBlocked) score += 60;
  const lastAccess = row.lastLoginAt ?? row.lastSessionAt ?? row.lastCommentAt ?? row.lastListAt ?? row.createdAt;
  const ageDays = Math.max(0, Math.floor((Date.now() - lastAccess.getTime()) / 86_400_000));
  if (ageDays > 30) score += 35;
  if (ageDays > 7) score += 15;
  if (row.listsCreated === 0 && row.monitoredProductsCount === 0 && row.productCommentsCount === 0 && row.listCommentsCount === 0) {
    score += 20;
  }
  if (!row.pushEnabled && !row.emailEnabled && !row.centralEnabled) score += 8;
  if (row.productCommentsCount > 50 || row.listCommentsCount > 50) score += 8;
  return Math.min(100, score);
}

function normalizeRow(row: AccountMonitoringUserRow) {
  const lastActivityAt =
    maxDate(
      row.lastLoginAt,
      row.lastSessionAt,
      row.lastCommentAt,
      row.lastListAt,
      row.lastMonitoredAt,
      row.lastNotificationAt
    ) ?? row.createdAt;

  return {
    ...row,
    lastAccessAt: lastActivityAt,
    activityLabel: activityLabel(row),
    riskScore: riskScore(row),
    healthLabel:
      riskScore(row) >= 60
        ? "Possível spam"
        : riskScore(row) >= 30
          ? "Atenção"
          : "Saudável",
    signupSource: row.googleId ? "Google OAuth" : "Email/senha",
    deviceLabel: parseUserAgent(row.userAgent),
  };
}

export async function getAccountMonitoringRows() {
  const rows = await prisma.$queryRaw<Array<AccountMonitoringUserRow>>(Prisma.sql`
    SELECT
      u."id",
      u."displayName",
      u."username",
      u."email",
      u."role",
      u."commentsBlocked",
      u."avatarUrl",
      u."googleId",
      u."createdAt",
      u."lastLoginAt",
      (
        SELECT MAX(s."createdAt")
        FROM "SiteSession" s
        WHERE s."userId" = u."id"
      ) AS "lastSessionAt",
      (
        SELECT COUNT(*)::int
        FROM "SiteSession" s
        WHERE s."userId" = u."id"
          AND s."expiresAt" > NOW()
      ) AS "activeSessionCount",
      (
        SELECT COUNT(*)::int
        FROM "SiteSession" s
        WHERE s."userId" = u."id"
          AND s."createdAt" >= NOW() - INTERVAL '30 days'
      ) AS "sessions30d",
      (
        SELECT COUNT(*)::int
        FROM "SiteUserList" l
        WHERE l."userId" = u."id"
      ) AS "listsCreated",
      (
        SELECT COUNT(*)::int
        FROM "SiteUserList" l
        WHERE l."userId" = u."id" AND l."isPublic" = true
      ) AS "publicLists",
      (
        SELECT COUNT(*)::int
        FROM "SiteUserList" l
        WHERE l."userId" = u."id" AND l."isPublic" = false
      ) AS "privateLists",
      (
        SELECT COUNT(*)::int
        FROM "SiteUserSavedList" s
        WHERE s."userId" = u."id"
      ) AS "savedListsCount",
      (
        SELECT COUNT(*)::int
        FROM "SiteUserMonitoredProduct" mp
        WHERE mp."userId" = u."id"
      ) AS "monitoredProductsCount",
      (
        SELECT COUNT(*)::int
        FROM "SiteProductComment" c
        WHERE c."userId" = u."id" AND c."status" = 'published'
      ) AS "productCommentsCount",
      (
        SELECT COUNT(*)::int
        FROM "SiteUserListComment" lc
        WHERE lc."userId" = u."id" AND lc."status" = 'published'
      ) AS "listCommentsCount",
      (
        SELECT COUNT(*)::int
        FROM "SiteProductCommentReaction" r
        WHERE r."userId" = u."id"
      ) AS "productReactionsGiven",
      (
        SELECT COUNT(*)::int
        FROM "SiteUserListCommentReaction" r
        WHERE r."userId" = u."id"
      ) AS "listReactionsGiven",
      (
        SELECT COUNT(*)::int
        FROM "SiteProductCommentReaction" r
        INNER JOIN "SiteProductComment" c ON c."id" = r."commentId"
        WHERE c."userId" = u."id"
      ) AS "productReactionsReceived",
      (
        SELECT COUNT(*)::int
        FROM "SiteUserListCommentReaction" r
        INNER JOIN "SiteUserListComment" lc ON lc."id" = r."commentId"
        WHERE lc."userId" = u."id"
      ) AS "listReactionsReceived",
      (
        SELECT COUNT(*)::int
        FROM "SiteUserList" l
        INNER JOIN "SiteUserSavedList" s ON s."listId" = l."id"
        WHERE l."userId" = u."id"
      ) AS "followersCount",
      (
        SELECT p."centralEnabled"
        FROM "SiteUserNotificationPreference" p
        WHERE p."userId" = u."id"
        LIMIT 1
      ) AS "centralEnabled",
      (
        SELECT p."emailEnabled"
        FROM "SiteUserNotificationPreference" p
        WHERE p."userId" = u."id"
        LIMIT 1
      ) AS "emailEnabled",
      (
        SELECT p."pushEnabled"
        FROM "SiteUserNotificationPreference" p
        WHERE p."userId" = u."id"
        LIMIT 1
      ) AS "pushEnabled",
      (
        SELECT MAX(n."createdAt")
        FROM "SiteUserNotification" n
        WHERE n."userId" = u."id"
      ) AS "lastNotificationAt",
      (
        SELECT MAX(c."createdAt")
        FROM "SiteProductComment" c
        WHERE c."userId" = u."id" AND c."status" = 'published'
      ) AS "lastCommentAt",
      (
        SELECT MAX(l."createdAt")
        FROM "SiteUserList" l
        WHERE l."userId" = u."id"
      ) AS "lastListAt",
      (
        SELECT MAX(mp."createdAt")
        FROM "SiteUserMonitoredProduct" mp
        WHERE mp."userId" = u."id"
      ) AS "lastMonitoredAt",
      (
        SELECT s."userAgent"
        FROM "SiteSession" s
        WHERE s."userId" = u."id"
        ORDER BY s."createdAt" DESC
        LIMIT 1
      ) AS "userAgent"
    FROM "SiteUser" u
    ORDER BY u."createdAt" DESC
    LIMIT 300
  `);

  return rows.map((row) => {
    const normalized = normalizeRow(row);
    const totalComments = normalized.productCommentsCount + normalized.listCommentsCount;
    return {
      ...normalized,
      totalComments,
    };
  });
}

export function filterAccountMonitoringRows(
  rows: Awaited<ReturnType<typeof getAccountMonitoringRows>>,
  filter: AccountMonitoringFilter,
  query: string,
) {
  const normalizedQuery = query.trim().toLowerCase();
  let filtered = rows.filter((row) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      row.displayName.toLowerCase().includes(normalizedQuery) ||
      (row.username?.toLowerCase().includes(normalizedQuery) ?? false) ||
      row.email.toLowerCase().includes(normalizedQuery);

    if (!matchesQuery) return false;

    switch (filter) {
      case "active":
        return row.activityLabel === "Agora" || row.activityLabel === "Hoje" || row.activityLabel === "Recente";
      case "new":
        return Math.floor((Date.now() - row.createdAt.getTime()) / 86_400_000) <= 7;
      case "abandoned":
        return row.activityLabel === "Abandonado" || row.activityLabel === "Sem atividade";
      case "push":
        return Boolean(row.pushEnabled);
      case "no-lists":
        return row.listsCreated === 0;
      case "suspicious":
        return row.riskScore >= 60;
      case "power":
        return row.activityLabel === "Muito engajado";
      case "inactive":
        return row.activityLabel === "Sem atividade" || row.activityLabel === "Conta fria";
      default:
        return true;
    }
  });

  return filtered;
}

export function paginateAccountMonitoringRows(
  rows: Awaited<ReturnType<typeof getAccountMonitoringRows>>,
  page: number,
  pageSize: number,
) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(10, Math.min(pageSize, 50));
  const totalPages = Math.max(1, Math.ceil(rows.length / safePageSize));
  const currentPage = Math.min(safePage, totalPages);
  const start = (currentPage - 1) * safePageSize;
  const items = rows.slice(start, start + safePageSize);

  return {
    items,
    currentPage,
    pageSize: safePageSize,
    totalPages,
    total: rows.length,
  };
}

export async function getAccountMonitoringSummary() {
  const rows = await getAccountMonitoringRows();
  const now = Date.now();
  const totalUsers = rows.length;
  const activeToday = rows.filter((row) => now - row.lastAccessAt.getTime() <= 24 * 60 * 60_000).length;
  const newToday = rows.filter((row) => now - row.createdAt.getTime() <= 24 * 60 * 60_000).length;
  const returning7d = rows.filter((row) => {
    const lastAccessDays = Math.floor((now - row.lastAccessAt.getTime()) / 86_400_000);
    const createdDays = Math.floor((now - row.createdAt.getTime()) / 86_400_000);
    return lastAccessDays <= 7 && createdDays > 7;
  }).length;
  const abandoned = rows.filter((row) => {
    const lastAccessDays = Math.floor((now - row.lastAccessAt.getTime()) / 86_400_000);
    return lastAccessDays >= 30 && row.totalComments === 0 && row.listsCreated === 0 && row.monitoredProductsCount === 0;
  }).length;
  const pushEnabledPct = totalUsers === 0 ? 0 : Math.round((rows.filter((row) => row.pushEnabled).length / totalUsers) * 100);
  const avgListsPerUser = totalUsers === 0 ? 0 : Number((rows.reduce((sum, row) => sum + row.listsCreated, 0) / totalUsers).toFixed(1));
  const avgCommentsPerUser = totalUsers === 0 ? 0 : Number((rows.reduce((sum, row) => sum + row.totalComments, 0) / totalUsers).toFixed(1));
  const noActivityAfterSignup = rows.filter((row) => {
    const ageDays = Math.floor((now - row.createdAt.getTime()) / 86_400_000);
    return ageDays >= 7 && row.totalComments === 0 && row.listsCreated === 0 && row.monitoredProductsCount === 0;
  }).length;

  return {
    totalUsers,
    activeToday,
    newToday,
    returning7d,
    abandoned,
    pushEnabledPct,
    avgListsPerUser,
    avgCommentsPerUser,
    noActivityAfterSignup,
  } satisfies AccountMonitoringSummary;
}

export async function getAccountMonitoringUserById(userId: string) {
  const rows = await getAccountMonitoringRows();
  return rows.find((row) => row.id === userId) ?? null;
}

export async function getAccountMonitoringTimeline(userId: string) {
  const [sessions, lists, comments, monitored, notifications] = await Promise.all([
    prisma.$queryRaw<Array<{ id: string; title: string; body: string | null; href: string | null; createdAt: Date }>>(Prisma.sql`
      SELECT
        s."id",
        'Login' AS "title",
        s."userAgent" AS "body",
        NULL::text AS "href",
        s."createdAt"
      FROM "SiteSession" s
      WHERE s."userId" = ${userId}
      ORDER BY s."createdAt" DESC
      LIMIT 5
    `),
    prisma.$queryRaw<Array<{ id: string; title: string; body: string | null; href: string | null; createdAt: Date }>>(Prisma.sql`
      SELECT
        l."id",
        l."title",
        l."description" AS "body",
        CONCAT('/minha-conta/listas?list=', l."id") AS "href",
        l."createdAt"
      FROM "SiteUserList" l
      WHERE l."userId" = ${userId}
      ORDER BY l."createdAt" DESC
      LIMIT 5
    `),
    prisma.$queryRaw<Array<{ id: string; title: string; body: string | null; href: string | null; createdAt: Date }>>(Prisma.sql`
      SELECT
        c."id",
        'Comentário' AS "title",
        c."body" AS "body",
        CONCAT('/produto/', COALESCE(c."productAsin", p."asin", tp."asin", mp."asin", c."productId"), '?comments=1') AS "href",
        c."createdAt"
      FROM "SiteProductComment" c
      LEFT JOIN "DynamicProduct" p ON p."id" = c."productId"
      LEFT JOIN "SiteTrackedAmazonProduct" tp ON tp."asin" = c."productAsin"
      LEFT JOIN "SiteUserMonitoredProduct" mp ON mp."asin" = c."productAsin"
      WHERE c."userId" = ${userId}
        AND c."status" = 'published'
      ORDER BY c."createdAt" DESC
      LIMIT 5
    `),
    prisma.$queryRaw<Array<{ id: string; title: string; body: string | null; href: string | null; createdAt: Date }>>(Prisma.sql`
      SELECT
        mp."id",
        'Monitoramento' AS "title",
        mp."name" AS "body",
        mp."amazonUrl" AS "href",
        mp."createdAt"
      FROM "SiteUserMonitoredProduct" mp
      WHERE mp."userId" = ${userId}
      ORDER BY mp."createdAt" DESC
      LIMIT 5
    `),
    prisma.$queryRaw<Array<{ id: string; title: string; body: string | null; href: string | null; createdAt: Date }>>(Prisma.sql`
      SELECT
        n."id",
        n."title",
        n."body",
        n."href",
        n."createdAt"
      FROM "SiteUserNotification" n
      WHERE n."userId" = ${userId}
      ORDER BY n."createdAt" DESC
      LIMIT 5
    `),
  ]);

  const timeline = [
    ...sessions.map((item) => ({ ...item, type: "login" as const })),
    ...lists.map((item) => ({ ...item, type: "list" as const })),
    ...comments.map((item) => ({ ...item, type: "comment" as const })),
    ...monitored.map((item) => ({ ...item, type: "monitoring" as const })),
    ...notifications.map((item) => ({ ...item, type: "notification" as const })),
  ]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .slice(0, 20)
    .map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      href: item.href,
      createdAt: item.createdAt.toISOString(),
    }));

  return timeline satisfies AccountMonitoringTimelineItem[];
}

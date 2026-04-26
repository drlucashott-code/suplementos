import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isMissingColumnError, isMissingRelationError } from "@/lib/prismaSchemaCompat";

export type SiteNotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  isRead: boolean;
  createdAt: string;
};

export async function createSiteNotification(input: {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.siteUserNotification.create({
      data: {
        id: randomUUID(),
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        href: input.href ?? null,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    if (isMissingRelationError(error, "SiteUserNotification")) {
      return;
    }

    throw error;
  }
}

export async function syncFavoriteNotifications(userId: string) {
  let favorites;
  try {
    favorites = await prisma.siteUserFavorite.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            category: {
              select: {
                group: true,
                slug: true,
              },
            },
          },
        },
      },
    });
  } catch (error) {
    if (
      isMissingColumnError(error, "lastTrackedPrice") ||
      isMissingColumnError(error, "lastTrackedAvailability")
    ) {
      return;
    }

    throw error;
  }

  for (const favorite of favorites) {
    const currentPrice = favorite.product.totalPrice > 0 ? favorite.product.totalPrice : null;
    const currentAvailability = favorite.product.availabilityStatus ?? "UNKNOWN";
    const productPath = `/produto/${favorite.productId}`;

    if (favorite.lastTrackedPrice == null && favorite.lastTrackedAvailability == null) {
      await prisma.siteUserFavorite.update({
        where: { id: favorite.id },
        data: {
          lastTrackedPrice: currentPrice,
          lastTrackedAvailability: currentAvailability,
        },
      });
      continue;
    }

    if (
      currentPrice != null &&
      favorite.lastTrackedPrice != null &&
      currentPrice < favorite.lastTrackedPrice
    ) {
      await createSiteNotification({
        userId,
        type: "favorite_price_drop",
        title: "Produto salvo caiu de preco",
        body: `${favorite.product.name} agora está por ${currentPrice.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}.`,
        href: productPath,
        metadata: {
          productId: favorite.productId,
          oldPrice: favorite.lastTrackedPrice,
          newPrice: currentPrice,
        },
      });
    }

    if (
      favorite.lastTrackedAvailability === "OUT_OF_STOCK" &&
      currentAvailability !== "OUT_OF_STOCK" &&
      currentPrice != null
    ) {
      await createSiteNotification({
        userId,
        type: "favorite_back_in_stock",
        title: "Produto salvo voltou ao estoque",
        body: favorite.product.name,
        href: productPath,
        metadata: {
          productId: favorite.productId,
        },
      });
    }

    await prisma.siteUserFavorite.update({
      where: { id: favorite.id },
      data: {
        lastTrackedPrice: currentPrice,
        lastTrackedAvailability: currentAvailability,
      },
    });
  }

  const monitoredProducts = await prisma.$queryRaw<
    Array<{
      id: string;
      asin: string;
      amazonUrl: string;
      name: string;
      totalPrice: number;
      availabilityStatus: string | null;
      lastTrackedPrice: number | null;
      lastTrackedAvailability: string | null;
    }>
  >(Prisma.sql`
    SELECT
      mp."id",
      mp."asin",
      mp."amazonUrl",
      mp."name",
      mp."totalPrice",
      mp."availabilityStatus",
      mp."lastTrackedPrice",
      mp."lastTrackedAvailability"
    FROM "SiteUserMonitoredProduct" mp
    WHERE mp."userId" = ${userId}
  `).catch((error) => {
    if (isMissingRelationError(error, "SiteUserMonitoredProduct")) {
      return [];
    }

    throw error;
  });

  for (const monitoredProduct of monitoredProducts) {
    const currentPrice = monitoredProduct.totalPrice > 0 ? monitoredProduct.totalPrice : null;
    const currentAvailability = monitoredProduct.availabilityStatus ?? "UNKNOWN";
    const productPath = monitoredProduct.amazonUrl;

    if (
      monitoredProduct.lastTrackedPrice == null &&
      monitoredProduct.lastTrackedAvailability == null
    ) {
      await prisma.$executeRaw`
        UPDATE "SiteUserMonitoredProduct"
        SET
          "lastTrackedPrice" = ${currentPrice},
          "lastTrackedAvailability" = ${currentAvailability},
          "updatedAt" = NOW()
        WHERE "id" = ${monitoredProduct.id}
      `;
      continue;
    }

    if (
      currentPrice != null &&
      monitoredProduct.lastTrackedPrice != null &&
      currentPrice < monitoredProduct.lastTrackedPrice
    ) {
      await createSiteNotification({
        userId,
        type: "monitored_price_drop",
        title: "Produto monitorado caiu de preco",
        body: `${monitoredProduct.name} agora está por ${currentPrice.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}.`,
        href: productPath,
        metadata: {
          asin: monitoredProduct.asin,
          oldPrice: monitoredProduct.lastTrackedPrice,
          newPrice: currentPrice,
        },
      });
    }

    if (
      monitoredProduct.lastTrackedAvailability === "OUT_OF_STOCK" &&
      currentAvailability !== "OUT_OF_STOCK" &&
      currentPrice != null
    ) {
      await createSiteNotification({
        userId,
        type: "monitored_back_in_stock",
        title: "Produto monitorado voltou ao estoque",
        body: monitoredProduct.name,
        href: productPath,
        metadata: {
          asin: monitoredProduct.asin,
        },
      });
    }

    await prisma.$executeRaw`
      UPDATE "SiteUserMonitoredProduct"
      SET
        "lastTrackedPrice" = ${currentPrice},
        "lastTrackedAvailability" = ${currentAvailability},
        "updatedAt" = NOW()
      WHERE "id" = ${monitoredProduct.id}
    `;
  }
}

export async function getSiteNotifications(userId: string) {
  let rows;
  try {
    rows = await prisma.siteUserNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  } catch (error) {
    if (isMissingRelationError(error, "SiteUserNotification")) {
      return [];
    }

    throw error;
  }

  return rows.map<SiteNotificationItem>((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function markAllNotificationsRead(userId: string) {
  try {
    await prisma.siteUserNotification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  } catch (error) {
    if (isMissingRelationError(error, "SiteUserNotification")) {
      return;
    }

    throw error;
  }
}

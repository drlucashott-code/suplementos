import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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
}

export async function syncFavoriteNotifications(userId: string) {
  const favorites = await prisma.siteUserFavorite.findMany({
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

  for (const favorite of favorites) {
    const currentPrice = favorite.product.totalPrice > 0 ? favorite.product.totalPrice : null;
    const currentAvailability = favorite.product.availabilityStatus ?? "UNKNOWN";
    const productPath = `/${favorite.product.category.group}/${favorite.product.category.slug}`;

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
}

export async function getSiteNotifications(userId: string) {
  const rows = await prisma.siteUserNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

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
  await prisma.siteUserNotification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isMissingColumnError, isMissingRelationError } from "@/lib/prismaSchemaCompat";
import {
  clearNotifications as clearNotificationInbox,
  createSiteNotification as createNotificationRecord,
  countUnreadNotifications,
  getSiteNotifications as getNotificationItems,
  listSiteNotifications,
  markAllNotificationsRead as markAllNotificationRecordsRead,
  markNotificationClicked,
  markNotificationRead,
  notifyCommentReaction,
  notifyCommentReply,
  notifyComposedPriceStock,
  notifyListFollower,
  notifySavedListFollowersOfNewItem,
  notifyMentions,
  notifyPriceChange,
} from "@/lib/notifications/service";

export type SiteNotificationItem = Awaited<
  ReturnType<typeof getNotificationItems>
>[number];

export async function createSiteNotification(input: {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  href?: string | null;
  metadata?: Prisma.InputJsonValue;
  category?: "social" | "product" | "list" | "system";
  priority?: number;
  groupedKey?: string | null;
  actorUserId?: string | null;
  targetUserId?: string | null;
  targetProductId?: string | null;
  targetListId?: string | null;
  targetCommentId?: string | null;
}) {
  return createNotificationRecord(input);
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
      isMissingRelationError(error, "SiteUserFavorite") ||
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
    const productPath = `/produto/${favorite.product.asin || favorite.productId}`;

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

    const priceDropped =
      currentPrice != null &&
      favorite.lastTrackedPrice != null &&
      currentPrice < favorite.lastTrackedPrice;
    const backInStock =
      favorite.lastTrackedAvailability === "OUT_OF_STOCK" &&
      currentAvailability !== "OUT_OF_STOCK";

    if (backInStock && priceDropped) {
      await notifyComposedPriceStock({
        userId,
        productId: favorite.productId,
        productName: favorite.product.name,
        href: productPath,
        oldPrice: favorite.lastTrackedPrice,
        newPrice: currentPrice,
        priceDropPercent:
          favorite.lastTrackedPrice && currentPrice
            ? Math.round(
                ((favorite.lastTrackedPrice - currentPrice) / favorite.lastTrackedPrice) * 100
              )
            : null,
      });
    } else if (priceDropped) {
      await notifyPriceChange({
        userId,
        productId: favorite.productId,
        productName: favorite.product.name,
        href: productPath,
        type: "favorite_price_drop",
        oldPrice: favorite.lastTrackedPrice,
        newPrice: currentPrice,
        priceDropPercent:
          favorite.lastTrackedPrice && currentPrice
            ? Math.round(
                ((favorite.lastTrackedPrice - currentPrice) / favorite.lastTrackedPrice) * 100
              )
            : null,
      });
    } else if (backInStock) {
      await notifyPriceChange({
        userId,
        productId: favorite.productId,
        productName: favorite.product.name,
        href: productPath,
        type: "favorite_back_in_stock",
        oldPrice: favorite.lastTrackedPrice,
        newPrice: currentPrice,
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
      COALESCE(tp."asin", mp."asin") AS "asin",
      COALESCE(tp."amazonUrl", mp."amazonUrl") AS "amazonUrl",
      COALESCE(tp."name", mp."name") AS "name",
      COALESCE(tp."totalPrice", mp."totalPrice") AS "totalPrice",
      COALESCE(tp."availabilityStatus", mp."availabilityStatus") AS "availabilityStatus",
      mp."lastTrackedPrice",
      mp."lastTrackedAvailability"
    FROM "SiteUserMonitoredProduct" mp
    LEFT JOIN "SiteTrackedAmazonProduct" tp ON tp."id" = mp."trackedProductId"
    WHERE mp."userId" = ${userId}
  `).catch((error: unknown) => {
    if (isMissingRelationError(error, "SiteUserMonitoredProduct")) {
      return [];
    }

    throw error;
  });

  for (const monitoredProduct of monitoredProducts) {
    const currentPrice = monitoredProduct.totalPrice > 0 ? monitoredProduct.totalPrice : null;
    const currentAvailability = monitoredProduct.availabilityStatus ?? "UNKNOWN";
    const productPath = `/produto/${monitoredProduct.asin}`;

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

    const priceDropped =
      currentPrice != null &&
      monitoredProduct.lastTrackedPrice != null &&
      currentPrice < monitoredProduct.lastTrackedPrice;
    const backInStock =
      monitoredProduct.lastTrackedAvailability === "OUT_OF_STOCK" &&
      currentAvailability !== "OUT_OF_STOCK";

    if (backInStock && priceDropped) {
      await notifyComposedPriceStock({
        userId,
        productId: monitoredProduct.id,
        productName: monitoredProduct.name,
        href: productPath,
        oldPrice: monitoredProduct.lastTrackedPrice,
        newPrice: currentPrice,
        priceDropPercent:
          monitoredProduct.lastTrackedPrice && currentPrice
            ? Math.round(
                ((monitoredProduct.lastTrackedPrice - currentPrice) /
                  monitoredProduct.lastTrackedPrice) *
                  100
              )
            : null,
      });
    } else if (priceDropped) {
      await notifyPriceChange({
        userId,
        productId: monitoredProduct.id,
        productName: monitoredProduct.name,
        href: productPath,
        type: "monitored_price_drop",
        oldPrice: monitoredProduct.lastTrackedPrice,
        newPrice: currentPrice,
        priceDropPercent:
          monitoredProduct.lastTrackedPrice && currentPrice
            ? Math.round(
                ((monitoredProduct.lastTrackedPrice - currentPrice) /
                  monitoredProduct.lastTrackedPrice) *
                  100
              )
            : null,
      });
    } else if (backInStock) {
      await notifyPriceChange({
        userId,
        productId: monitoredProduct.id,
        productName: monitoredProduct.name,
        href: productPath,
        type: "monitored_back_in_stock",
        oldPrice: monitoredProduct.lastTrackedPrice,
        newPrice: currentPrice,
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

// Gera notificações de queda de preço / volta ao estoque para quem favoritou o
// produto, no momento em que o evento realmente acontece (chamado pelo job de
// atualização de preço). createdAt = agora = hora real do evento, corrigindo o
// timestamp que antes refletia a hora da visita. Idempotente: o job só chama
// isto quando o preço persistido muda de verdade.
export async function notifyFavoritesOfDynamicPriceChange(params: {
  productId: string;
  productName: string;
  asin: string | null;
  oldPrice: number | null;
  newPrice: number | null;
  wasOutOfStock: boolean;
  isInStock: boolean;
}) {
  const priceDropped =
    params.newPrice != null &&
    params.newPrice > 0 &&
    params.oldPrice != null &&
    params.oldPrice > 0 &&
    params.newPrice < params.oldPrice;
  const backInStock = params.wasOutOfStock && params.isInStock;

  if (!priceDropped && !backInStock) return;

  let favorites: Array<{ userId: string }>;
  try {
    favorites = await prisma.siteUserFavorite.findMany({
      where: { productId: params.productId },
      select: { userId: true },
    });
  } catch (error) {
    if (isMissingRelationError(error, "SiteUserFavorite")) return;
    throw error;
  }

  if (favorites.length === 0) return;

  const href = `/produto/${params.asin || params.productId}`;
  const priceDropPercent =
    priceDropped && params.oldPrice
      ? Math.round(((params.oldPrice - (params.newPrice as number)) / params.oldPrice) * 100)
      : null;

  for (const favorite of favorites) {
    try {
      if (backInStock && priceDropped) {
        await notifyComposedPriceStock({
          userId: favorite.userId,
          productId: params.productId,
          productName: params.productName,
          href,
          oldPrice: params.oldPrice,
          newPrice: params.newPrice,
          priceDropPercent,
        });
      } else if (priceDropped) {
        await notifyPriceChange({
          userId: favorite.userId,
          productId: params.productId,
          productName: params.productName,
          href,
          type: "favorite_price_drop",
          oldPrice: params.oldPrice,
          newPrice: params.newPrice,
          priceDropPercent,
        });
      } else if (backInStock) {
        await notifyPriceChange({
          userId: favorite.userId,
          productId: params.productId,
          productName: params.productName,
          href,
          type: "favorite_back_in_stock",
          oldPrice: params.oldPrice,
          newPrice: params.newPrice,
        });
      }
    } catch (error) {
      console.error(
        "notify_favorite_price_change_failed",
        { userId: favorite.userId, productId: params.productId },
        error
      );
    }
  }

  // Alinha o watermark dos favoritos com o preço/estoque atual, para o sync
  // lazy (na visita às páginas) não recriar a mesma notificação.
  try {
    await prisma.siteUserFavorite.updateMany({
      where: { productId: params.productId },
      data: {
        lastTrackedPrice: params.newPrice,
        lastTrackedAvailability: params.isInStock ? "IN_STOCK" : "OUT_OF_STOCK",
      },
    });
  } catch (error) {
    if (!isMissingColumnError(error, "lastTrackedPrice")) {
      console.error("favorite_watermark_update_failed", params.productId, error);
    }
  }
}

// Análogo para produtos MONITORADOS (SiteUserMonitoredProduct, ligados a um
// SiteTrackedAmazonProduct). Chamado pelo job de atualização (z-UpdatePrices) no
// instante real da mudança, com createdAt correto, e alinha o watermark dos
// monitorados para o sync lazy não duplicar na visita.
export async function notifyMonitorsOfTrackedPriceChange(params: {
  trackedProductId: string;
  productName: string;
  asin: string | null;
  oldPrice: number | null;
  newPrice: number | null;
  wasOutOfStock: boolean;
  isInStock: boolean;
}) {
  const priceDropped =
    params.newPrice != null &&
    params.newPrice > 0 &&
    params.oldPrice != null &&
    params.oldPrice > 0 &&
    params.newPrice < params.oldPrice;
  const backInStock = params.wasOutOfStock && params.isInStock;

  if (!priceDropped && !backInStock) return;

  let monitors: Array<{ id: string; userId: string }>;
  try {
    monitors = await prisma.siteUserMonitoredProduct.findMany({
      where: { trackedProductId: params.trackedProductId },
      select: { id: true, userId: true },
    });
  } catch (error) {
    if (isMissingRelationError(error, "SiteUserMonitoredProduct")) return;
    throw error;
  }

  if (monitors.length === 0) return;

  const href = `/produto/${params.asin || params.trackedProductId}`;
  const priceDropPercent =
    priceDropped && params.oldPrice
      ? Math.round(((params.oldPrice - (params.newPrice as number)) / params.oldPrice) * 100)
      : null;

  for (const monitor of monitors) {
    try {
      if (backInStock && priceDropped) {
        await notifyComposedPriceStock({
          userId: monitor.userId,
          productId: monitor.id,
          productName: params.productName,
          href,
          oldPrice: params.oldPrice,
          newPrice: params.newPrice,
          priceDropPercent,
        });
      } else if (priceDropped) {
        await notifyPriceChange({
          userId: monitor.userId,
          productId: monitor.id,
          productName: params.productName,
          href,
          type: "monitored_price_drop",
          oldPrice: params.oldPrice,
          newPrice: params.newPrice,
          priceDropPercent,
        });
      } else if (backInStock) {
        await notifyPriceChange({
          userId: monitor.userId,
          productId: monitor.id,
          productName: params.productName,
          href,
          type: "monitored_back_in_stock",
          oldPrice: params.oldPrice,
          newPrice: params.newPrice,
        });
      }
    } catch (error) {
      console.error(
        "notify_monitored_price_change_failed",
        { userId: monitor.userId, trackedProductId: params.trackedProductId },
        error
      );
    }
  }

  try {
    await prisma.siteUserMonitoredProduct.updateMany({
      where: { trackedProductId: params.trackedProductId },
      data: {
        lastTrackedPrice: params.newPrice,
        lastTrackedAvailability: params.isInStock ? "IN_STOCK" : "OUT_OF_STOCK",
      },
    });
  } catch (error) {
    if (!isMissingColumnError(error, "lastTrackedPrice")) {
      console.error("monitored_watermark_update_failed", params.trackedProductId, error);
    }
  }
}

export {
  listSiteNotifications,
  countUnreadNotifications,
  markAllNotificationRecordsRead as markAllNotificationsRead,
  markNotificationRead,
  clearNotificationInbox as clearNotifications,
  markNotificationClicked,
  notifyMentions,
  notifyCommentReply,
  notifyCommentReaction,
  notifyListFollower,
  notifySavedListFollowersOfNewItem,
  notifyPriceChange,
  notifyComposedPriceStock,
};

export async function getSiteNotifications(userId: string, limit = 20) {
  const page = await listSiteNotifications({ userId, limit });
  return page.items;
}

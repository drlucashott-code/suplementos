import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export async function writeDynamicDailyPriceHistoryIfChanged(params: {
  productId: string;
  date: Date;
  price: number;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.dynamicPriceHistory.findFirst({
      where: {
        productId: params.productId,
        date: params.date,
      },
      select: {
        id: true,
        price: true,
      },
    });

    if (!existing) {
      await tx.dynamicPriceHistory.create({
        data: {
          id: randomUUID(),
          productId: params.productId,
          date: params.date,
          price: params.price,
          updateCount: 1,
        },
      });
      return true;
    }

    if (existing.price === params.price) {
      return false;
    }

    await tx.dynamicPriceHistory.update({
      where: { id: existing.id },
      data: {
        price: params.price,
        updateCount: {
          increment: 1,
        },
        updatedAt: new Date(),
      },
    });

    return true;
  });
}

export async function writeTrackedDailyPriceHistoryIfChanged(params: {
  trackedProductId: string;
  date: Date;
  price: number;
}) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.siteTrackedAmazonProductPriceHistory.findFirst({
      where: {
        trackedProductId: params.trackedProductId,
        date: params.date,
      },
      select: {
        id: true,
        price: true,
      },
    });

    if (!existing) {
      await tx.siteTrackedAmazonProductPriceHistory.create({
        data: {
          id: randomUUID(),
          trackedProductId: params.trackedProductId,
          date: params.date,
          price: params.price,
          updateCount: 1,
        },
      });
      return true;
    }

    if (existing.price === params.price) {
      return false;
    }

    await tx.siteTrackedAmazonProductPriceHistory.update({
      where: { id: existing.id },
      data: {
        price: params.price,
        updateCount: {
          increment: 1,
        },
        updatedAt: new Date(),
      },
    });

    return true;
  });
}

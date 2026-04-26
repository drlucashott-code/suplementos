import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentSiteUser,
  isSiteUserVerified,
  verificationRequiredResponse,
} from "@/lib/siteAuth";

export async function PATCH(request: Request) {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  try {
    const body = (await request.json()) as {
      orderedItems?: Array<{ source?: "favorite" | "monitored"; id?: string }>;
    };

    const orderedItems = Array.isArray(body.orderedItems)
      ? body.orderedItems
          .map((item) => ({
            source: item.source === "monitored" ? "monitored" : "favorite",
            id: item.id?.trim() ?? "",
          }))
          .filter((item) => item.id)
      : [];

    if (orderedItems.length === 0) {
      return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
    }

    const [favorites, monitoredProducts] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string }>>`
        SELECT f."id"
        FROM "SiteUserFavorite" f
        WHERE f."userId" = ${user.id}
      `,
      prisma.$queryRaw<Array<{ id: string }>>`
        SELECT mp."id"
        FROM "SiteUserMonitoredProduct" mp
        WHERE mp."userId" = ${user.id}
      `,
    ]);

    const expectedCount = favorites.length + monitoredProducts.length;
    if (expectedCount !== orderedItems.length) {
      return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
    }

    const favoriteIds = new Set(favorites.map((item) => item.id));
    const monitoredIds = new Set(monitoredProducts.map((item) => item.id));

    const hasInvalidItem = orderedItems.some((item) => {
      if (item.source === "favorite") return !favoriteIds.has(item.id);
      return !monitoredIds.has(item.id);
    });

    if (hasInvalidItem) {
      return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
    }

    for (let index = 0; index < orderedItems.length; index += 1) {
      const item = orderedItems[index]!;
      if (item.source === "favorite") {
        await prisma.$executeRaw`
          UPDATE "SiteUserFavorite"
          SET "sortOrder" = ${index}, "updatedAt" = NOW()
          WHERE "id" = ${item.id}
            AND "userId" = ${user.id}
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE "SiteUserMonitoredProduct"
          SET "sortOrder" = ${index}, "updatedAt" = NOW()
          WHERE "id" = ${item.id}
            AND "userId" = ${user.id}
        `;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("tracked_product_reorder_failed", error);
    return NextResponse.json({ ok: false, error: "tracked_product_reorder_failed" }, { status: 500 });
  }
}

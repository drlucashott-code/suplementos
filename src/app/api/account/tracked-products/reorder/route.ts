import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCurrentSiteUser,
  isSiteUserVerified,
  verificationRequiredResponse,
} from "@/lib/siteAuth";
import { migrateLegacyFavoritesToDefaultList } from "@/lib/siteDefaultList";

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

    const defaultList = await migrateLegacyFavoritesToDefaultList(user.id);

    const [favoriteItems, monitoredProducts] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string }>>`
        SELECT i."id"
        FROM "SiteUserListItem" i
        WHERE i."listId" = ${defaultList.id}
          AND i."productId" IS NOT NULL
      `,
      prisma.$queryRaw<Array<{ id: string }>>`
        SELECT mp."id"
        FROM "SiteUserMonitoredProduct" mp
        WHERE mp."userId" = ${user.id}
      `,
    ]);

    const expectedCount = favoriteItems.length + monitoredProducts.length;
    if (expectedCount !== orderedItems.length) {
      return NextResponse.json({ ok: false, error: "invalid_order" }, { status: 400 });
    }

    const favoriteIds = new Set(favoriteItems.map((item) => item.id));
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
          UPDATE "SiteUserListItem"
          SET "sortOrder" = ${index}, "updatedAt" = NOW()
          WHERE "id" = ${item.id}
            AND "listId" = ${defaultList.id}
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

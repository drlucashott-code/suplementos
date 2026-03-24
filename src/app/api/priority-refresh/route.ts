import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { enqueuePriorityRefresh } from "@/lib/priorityRefreshQueue";
import { sendDynamicClickAlertEmail } from "@/lib/dynamicClickAlerts";

const ASIN_PATTERN = /^[A-Z0-9]{10}$/;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      asin?: string;
      reason?: "click" | "admin" | "system";
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      inferredSource?: string;
      pagePath?: string;
      referrer?: string;
    };

    const asin = body.asin?.trim().toUpperCase() || "";

    if (!ASIN_PATTERN.test(asin)) {
      return NextResponse.json(
        { ok: false, error: "invalid_asin" },
        { status: 400 }
      );
    }

    const result = await enqueuePriorityRefresh({
      asin,
      reason: body.reason ?? "click",
    });

    const product = await prisma.dynamicProduct.findUnique({
      where: { asin },
      select: { id: true },
    });

    if (product) {
      const normalizeOptionalText = (value: string | undefined, maxLength = 255) => {
        const normalized = value?.trim();
        return normalized ? normalized.slice(0, maxLength) : null;
      };

      const utmSource = normalizeOptionalText(body.utmSource, 100);
      const utmMedium = normalizeOptionalText(body.utmMedium, 100);
      const utmCampaign = normalizeOptionalText(body.utmCampaign, 150);
      const inferredSource = normalizeOptionalText(body.inferredSource, 100);
      const pagePath = normalizeOptionalText(body.pagePath, 300);
      const referrer = normalizeOptionalText(body.referrer, 500);

      await prisma.$executeRaw`
        INSERT INTO "DynamicProductClickStats" ("id", "productId", "clickCount", "lastClickedAt", "createdAt", "updatedAt")
        VALUES (${crypto.randomUUID()}, ${product.id}, 1, NOW(), NOW(), NOW())
        ON CONFLICT ("productId")
        DO UPDATE SET
          "clickCount" = "DynamicProductClickStats"."clickCount" + 1,
          "lastClickedAt" = NOW(),
          "updatedAt" = NOW()
      `;

      await prisma.$executeRaw`
        INSERT INTO "DynamicProductClickEvent" (
          "id",
          "productId",
          "utmSource",
          "utmMedium",
          "utmCampaign",
          "inferredSource",
          "pagePath",
          "referrer",
          "createdAt"
        )
        VALUES (
          ${crypto.randomUUID()},
          ${product.id},
          ${utmSource},
          ${utmMedium},
          ${utmCampaign},
          ${inferredSource},
          ${pagePath},
          ${referrer},
          NOW()
        )
      `;

      const productInfo = await prisma.dynamicProduct.findUnique({
        where: { id: product.id },
        select: {
          asin: true,
          name: true,
          url: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      });

      if (productInfo) {
        const source =
          utmSource ||
          inferredSource ||
          "direto";

        await sendDynamicClickAlertEmail({
          asin: productInfo.asin,
          productName: productInfo.name,
          categoryName: productInfo.category?.name ?? null,
          pagePath,
          source,
          productUrl: productInfo.url,
        });
      }
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Erro ao enfileirar atualizacao prioritaria:", error);

    return NextResponse.json(
      { ok: false, error: "queue_failed" },
      { status: 500 }
    );
  }
}

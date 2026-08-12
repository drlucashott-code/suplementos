import crypto from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const ASIN_PATTERN = /^[A-Z0-9]{10}$/;
const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{8,120}$/;
const VISITOR_ID_PATTERN = /^[a-zA-Z0-9_-]{8,120}$/;

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.replace(/[\r\n\t]+/g, " ").trim().slice(0, maxLength)
    : "";
}

function optionalNumber(value: unknown, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const asin = cleanText(body.asin, 10).toUpperCase();
    const productName = cleanText(body.productName, 300);
    const visitorId = cleanText(body.visitorId, 120);
    const sessionId = cleanText(body.sessionId, 120);

    if (
      !ASIN_PATTERN.test(asin) ||
      !productName ||
      !VISITOR_ID_PATTERN.test(visitorId) ||
      !SESSION_ID_PATTERN.test(sessionId)
    ) {
      return NextResponse.json({ ok: false, error: "invalid_click" }, { status: 400 });
    }

    const parsedStartedAt = body.sessionStartedAt
      ? new Date(String(body.sessionStartedAt))
      : null;
    const startedAt =
      parsedStartedAt && Number.isFinite(parsedStartedAt.getTime())
        ? parsedStartedAt
        : new Date();
    const pagePath = cleanText(body.pagePath, 300) || "/ofertas";

    await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "DynamicClickSession" (
          "id", "visitorId", "sessionId", "source", "firstPagePath",
          "startedAt", "lastActivityAt", "createdAt", "updatedAt"
        )
        VALUES (
          ${crypto.randomUUID()}, ${visitorId}, ${sessionId}, 'top_ofertas',
          ${pagePath}, ${startedAt}, NOW(), NOW(), NOW()
        )
        ON CONFLICT ("sessionId") DO UPDATE SET
          "lastActivityAt" = NOW(),
          "endedAt" = NULL,
          "source" = COALESCE("DynamicClickSession"."source", 'top_ofertas'),
          "updatedAt" = NOW()
      `;

      await tx.$executeRaw`
        INSERT INTO "DynamicTopOfferClickEvent" (
          "id", "sessionId", "visitorId", "asin", "productName",
          "categoryName", "pagePath", "displayedPrice", "displayedDiscount", "createdAt"
        )
        VALUES (
          ${crypto.randomUUID()}, ${sessionId}, ${visitorId}, ${asin}, ${productName},
          ${cleanText(body.categoryName, 120) || null}, ${pagePath},
          ${optionalNumber(body.displayedPrice, 0, 10_000_000)},
          ${optionalNumber(body.displayedDiscount, 0, 100)}, NOW()
        )
      `;

      await tx.$executeRaw`
        UPDATE "DynamicClickSession" s
        SET
          "totalClicks" = counts."totalClicks",
          "uniqueProducts" = counts."uniqueProducts",
          "updatedAt" = NOW()
        FROM (
          SELECT
            COUNT(*)::int AS "totalClicks",
            COUNT(DISTINCT x."asin")::int AS "uniqueProducts"
          FROM (
            SELECT p."asin" FROM "DynamicProductClickEvent" e
            JOIN "DynamicProduct" p ON p."id" = e."productId"
            WHERE e."sessionId" = ${sessionId}
            UNION ALL
            SELECT t."asin" FROM "DynamicTopOfferClickEvent" t
            WHERE t."sessionId" = ${sessionId}
          ) x
        ) counts
        WHERE s."sessionId" = ${sessionId}
      `;
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao registrar clique das Top Ofertas na sessao:", error);
    return NextResponse.json({ ok: false, error: "session_click_failed" }, { status: 500 });
  }
}

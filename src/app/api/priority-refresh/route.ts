import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { enqueuePriorityRefresh } from "@/lib/priorityRefreshQueue";
import { sendDynamicClickSessionAlertEmail } from "@/lib/dynamicClickAlerts";
import {
  normalizeAttributionSource,
  resolveAttributionSource,
} from "@/lib/attributionSource";

const ASIN_PATTERN = /^[A-Z0-9]{10}$/;
const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{8,120}$/;
const VISITOR_ID_PATTERN = /^[a-zA-Z0-9_-]{8,120}$/;
const SESSION_IDLE_TIMEOUT_MINUTES = Number(
  process.env.CLICK_SESSION_IDLE_TIMEOUT_MINUTES ?? 30
);

type SessionProductRow = {
  asin: string;
  productName: string;
  clickCount: number;
  source: string;
};

type SessionSummaryRow = {
  visitorId: string;
  sessionId: string;
  startedAt: Date;
  endedAt: Date | null;
  source: string | null;
  totalClicks: number;
  uniqueProducts: number;
  summaryEmailSentAt: Date | null;
};

async function sendSessionSummaryEmailAndMark(sessionId: string, endedAt: Date) {
  const [summary] = await prisma.$queryRaw<SessionSummaryRow[]>`
    SELECT
      s."visitorId",
      s."sessionId",
      s."startedAt",
      s."endedAt",
      s."source",
      s."totalClicks",
      s."uniqueProducts",
      s."summaryEmailSentAt"
    FROM "DynamicClickSession" s
    WHERE s."sessionId" = ${sessionId}
    LIMIT 1
  `;

  if (!summary || summary.summaryEmailSentAt || summary.totalClicks <= 0) {
    return;
  }

  const productRows = await prisma.$queryRaw<SessionProductRow[]>`
    WITH base AS (
      SELECT
        p."asin" AS "asin",
        p."name" AS "productName",
        COALESCE(NULLIF(e."utmSource", ''), NULLIF(e."inferredSource", ''), 'direto') AS "source",
        COUNT(*)::int AS "clickCount"
      FROM "DynamicProductClickEvent" e
      INNER JOIN "DynamicProduct" p ON p."id" = e."productId"
      WHERE e."sessionId" = ${sessionId}
      GROUP BY p."asin", p."name", 3
    )
    SELECT
      b."asin",
      b."productName",
      b."source",
      b."clickCount"
    FROM base b
    ORDER BY b."clickCount" DESC, b."productName" ASC
  `;

  const groupedProducts = new Map<
    string,
    {
      asin: string;
      productName: string;
      clickCount: number;
      sourceBreakdown: Array<{ source: string; clickCount: number }>;
    }
  >();

  for (const row of productRows) {
    const key = row.asin;
    if (!groupedProducts.has(key)) {
      groupedProducts.set(key, {
        asin: row.asin,
        productName: row.productName,
        clickCount: 0,
        sourceBreakdown: [],
      });
    }
    const entry = groupedProducts.get(key)!;
    entry.clickCount += Number(row.clickCount) || 0;
    entry.sourceBreakdown.push({
      source: resolveAttributionSource({
        utmSource: normalizeAttributionSource(row.source) ?? null,
        inferredSource: normalizeAttributionSource(row.source) ?? null,
      }),
      clickCount: Number(row.clickCount) || 0,
    });
  }

  const sent = await sendDynamicClickSessionAlertEmail({
    visitorId: summary.visitorId,
    sessionId: summary.sessionId,
    startedAt: summary.startedAt,
    endedAt: summary.endedAt ?? endedAt,
    source: summary.source,
    totalClicks: summary.totalClicks,
    uniqueProducts: summary.uniqueProducts,
    products: Array.from(groupedProducts.values()).sort(
      (a, b) => b.clickCount - a.clickCount
    ),
  });

  if (sent) {
    await prisma.$executeRaw`
      UPDATE "DynamicClickSession"
      SET
        "summaryEmailSentAt" = NOW(),
        "updatedAt" = NOW()
      WHERE "sessionId" = ${sessionId}
    `;
  }
}

async function closeStaleSessions(visitorId: string, keepSessionId?: string | null) {
  const rows = await prisma.$queryRaw<Array<{ sessionId: string }>>`
    SELECT s."sessionId"
    FROM "DynamicClickSession" s
    WHERE
      s."visitorId" = ${visitorId}
      AND s."endedAt" IS NULL
      AND (${keepSessionId ?? ""} = '' OR s."sessionId" <> ${keepSessionId ?? ""})
      AND s."lastActivityAt" < NOW() - (${SESSION_IDLE_TIMEOUT_MINUTES} * INTERVAL '1 minute')
  `;

  for (const row of rows) {
    await prisma.$executeRaw`
      UPDATE "DynamicClickSession"
      SET
        "endedAt" = NOW(),
        "updatedAt" = NOW()
      WHERE "sessionId" = ${row.sessionId}
    `;
    await sendSessionSummaryEmailAndMark(row.sessionId, new Date());
  }
}

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
      visitorId?: string;
      sessionId?: string;
      sessionStartedAt?: string;
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

      const utmSource = normalizeOptionalText(
        normalizeAttributionSource(body.utmSource) ?? undefined,
        100
      );
      const utmMedium = normalizeOptionalText(body.utmMedium, 100);
      const utmCampaign = normalizeOptionalText(body.utmCampaign, 150);
      const inferredSource = normalizeOptionalText(
        normalizeAttributionSource(body.inferredSource) ?? undefined,
        100
      );
      const pagePath = normalizeOptionalText(body.pagePath, 300);
      const referrer = normalizeOptionalText(body.referrer, 500);
      const visitorIdRaw = normalizeOptionalText(body.visitorId, 120);
      const sessionIdRaw = normalizeOptionalText(body.sessionId, 120);
      const visitorId =
        visitorIdRaw && VISITOR_ID_PATTERN.test(visitorIdRaw) ? visitorIdRaw : null;
      const sessionId =
        sessionIdRaw && SESSION_ID_PATTERN.test(sessionIdRaw) ? sessionIdRaw : null;

      await prisma.$executeRaw`
        INSERT INTO "DynamicProductClickStats" ("id", "productId", "clickCount", "lastClickedAt", "createdAt", "updatedAt")
        VALUES (${crypto.randomUUID()}, ${product.id}, 1, NOW(), NOW(), NOW())
        ON CONFLICT ("productId")
        DO UPDATE SET
          "clickCount" = "DynamicProductClickStats"."clickCount" + 1,
          "lastClickedAt" = NOW(),
          "updatedAt" = NOW()
      `;

      const source = resolveAttributionSource({
        utmSource,
        inferredSource,
      });

      if (visitorId) {
        await closeStaleSessions(visitorId, sessionId);
      }

      if (visitorId && sessionId) {
        const parsedStartedAt = body.sessionStartedAt
          ? new Date(body.sessionStartedAt)
          : null;
        const sessionStartedAt =
          parsedStartedAt && Number.isFinite(parsedStartedAt.getTime())
            ? parsedStartedAt
            : new Date();

        await prisma.$executeRaw`
          INSERT INTO "DynamicClickSession" (
            "id",
            "visitorId",
            "sessionId",
            "source",
            "firstPagePath",
            "startedAt",
            "lastActivityAt",
            "createdAt",
            "updatedAt"
          )
          VALUES (
            ${crypto.randomUUID()},
            ${visitorId},
            ${sessionId},
            ${source},
            ${pagePath},
            ${sessionStartedAt},
            NOW(),
            NOW(),
            NOW()
          )
          ON CONFLICT ("sessionId")
          DO UPDATE SET
            "lastActivityAt" = NOW(),
            "endedAt" = NULL,
            "source" = COALESCE("DynamicClickSession"."source", ${source}),
            "updatedAt" = NOW()
        `;
      }

      await prisma.$executeRaw`
        INSERT INTO "DynamicProductClickEvent" (
          "id",
          "productId",
          "visitorId",
          "sessionId",
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
          ${visitorId},
          ${sessionId},
          ${utmSource},
          ${utmMedium},
          ${utmCampaign},
          ${inferredSource},
          ${pagePath},
          ${referrer},
          NOW()
        )
      `;

      if (sessionId) {
        await prisma.$executeRaw`
          UPDATE "DynamicClickSession" s
          SET
            "totalClicks" = x."totalClicks",
            "uniqueProducts" = x."uniqueProducts",
            "lastActivityAt" = NOW(),
            "updatedAt" = NOW()
          FROM (
            SELECT
              e."sessionId",
              COUNT(*)::int AS "totalClicks",
              COUNT(DISTINCT e."productId")::int AS "uniqueProducts"
            FROM "DynamicProductClickEvent" e
            WHERE e."sessionId" = ${sessionId}
            GROUP BY e."sessionId"
          ) x
          WHERE s."sessionId" = x."sessionId"
            AND s."sessionId" = ${sessionId}
        `;
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

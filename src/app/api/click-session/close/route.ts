import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDynamicClickSessionAlertEmail } from "@/lib/dynamicClickAlerts";
import {
  normalizeAttributionSource,
  resolveAttributionSource,
} from "@/lib/attributionSource";

const SESSION_ID_PATTERN = /^[a-zA-Z0-9_-]{8,120}$/;
const VISITOR_ID_PATTERN = /^[a-zA-Z0-9_-]{8,120}$/;

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

type SessionProductRow = {
  asin: string;
  productName: string;
  clickCount: number;
  source: string;
};

async function sendSessionSummaryEmailAndMark(sessionId: string) {
  const [summary] = await prisma.$queryRaw<SessionSummaryRow[]>`
    UPDATE "DynamicClickSession" s
    SET
      "summaryEmailSentAt" = NOW(),
      "updatedAt" = NOW()
    WHERE
      s."sessionId" = ${sessionId}
      AND s."summaryEmailSentAt" IS NULL
      AND s."endedAt" IS NOT NULL
      AND s."totalClicks" > 0
    RETURNING
      s."visitorId",
      s."sessionId",
      s."startedAt",
      s."endedAt",
      s."source",
      s."totalClicks",
      s."uniqueProducts",
      s."summaryEmailSentAt"
  `;

  if (!summary || !summary.endedAt) {
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
    if (!groupedProducts.has(row.asin)) {
      groupedProducts.set(row.asin, {
        asin: row.asin,
        productName: row.productName,
        clickCount: 0,
        sourceBreakdown: [],
      });
    }

    const entry = groupedProducts.get(row.asin)!;
    const clicks = Number(row.clickCount) || 0;
    entry.clickCount += clicks;
    entry.sourceBreakdown.push({
      source: resolveAttributionSource({
        utmSource: normalizeAttributionSource(row.source) ?? null,
        inferredSource: normalizeAttributionSource(row.source) ?? null,
      }),
      clickCount: clicks,
    });
  }

  await sendDynamicClickSessionAlertEmail({
    visitorId: summary.visitorId,
    sessionId: summary.sessionId,
    startedAt: summary.startedAt,
    endedAt: summary.endedAt,
    source: summary.source,
    totalClicks: summary.totalClicks,
    uniqueProducts: summary.uniqueProducts,
    products: Array.from(groupedProducts.values()).sort(
      (a, b) => b.clickCount - a.clickCount
    ),
  });

  // summaryEmailSentAt ja foi preenchido de forma atomica para evitar duplicidade.
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      visitorId?: string;
      sessionId?: string;
    };

    const visitorId = body.visitorId?.trim() ?? "";
    const sessionId = body.sessionId?.trim() ?? "";

    if (!VISITOR_ID_PATTERN.test(visitorId) || !SESSION_ID_PATTERN.test(sessionId)) {
      return NextResponse.json({ ok: false, error: "invalid_session" }, { status: 400 });
    }

    await prisma.$executeRaw`
      UPDATE "DynamicClickSession"
      SET
        "endedAt" = COALESCE("endedAt", NOW()),
        "updatedAt" = NOW()
      WHERE
        "sessionId" = ${sessionId}
        AND "visitorId" = ${visitorId}
    `;

    await sendSessionSummaryEmailAndMark(sessionId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao fechar sessão de cliques:", error);
    return NextResponse.json({ ok: false, error: "session_close_failed" }, { status: 500 });
  }
}

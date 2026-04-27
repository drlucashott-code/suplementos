import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { touchDynamicProductPriority } from "@/lib/priceRefreshSignals";
import { enqueuePriorityRefresh } from "@/lib/priorityRefreshQueue";

const ASIN_PATTERN = /^[A-Z0-9]{10}$/;
const VALID_REASONS = new Set([
  "Preço desatualizado",
  "Produto indisponível",
  "Informação incorreta",
  "Outro",
]);

function normalizeOptionalText(value: string | undefined, maxLength: number) {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      asin?: string;
      reason?: string;
      details?: string;
      pagePath?: string;
    };

    const asin = body.asin?.trim().toUpperCase() || "";
    const reason = body.reason?.trim() || "";

    if (!ASIN_PATTERN.test(asin)) {
      return NextResponse.json(
        { ok: false, error: "invalid_asin" },
        { status: 400 }
      );
    }

    if (!VALID_REASONS.has(reason)) {
      return NextResponse.json(
        { ok: false, error: "invalid_reason" },
        { status: 400 }
      );
    }

    const product = await prisma.dynamicProduct.findUnique({
      where: { asin },
      select: { id: true },
    });

    if (!product) {
      return NextResponse.json(
        { ok: false, error: "product_not_found" },
        { status: 404 }
      );
    }

    await prisma.$executeRaw`
      INSERT INTO "DynamicProductIssueReport" (
        "id",
        "productId",
        "asin",
        "reason",
        "details",
        "pagePath",
        "status",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${crypto.randomUUID()},
        ${product.id},
        ${asin},
        ${reason},
        ${normalizeOptionalText(body.details, 1000)},
        ${normalizeOptionalText(body.pagePath, 300)},
        ${"open"},
        NOW(),
        NOW()
      )
    `;

    const priorityTouch = await touchDynamicProductPriority({
      productId: product.id,
      signal: "issue_report",
      extraBoost: reason === "Preço desatualizado" || reason === "PreÃ§o desatualizado" ? 6 : 0,
    });
    if (priorityTouch?.shouldEnqueue && priorityTouch.asin) {
      await enqueuePriorityRefresh({
        asin,
        reason: "issue_report",
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao registrar problema de produto:", error);

    return NextResponse.json(
      { ok: false, error: "report_failed" },
      { status: 500 }
    );
  }
}

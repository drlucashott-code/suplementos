import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ASIN_PATTERN = /^[A-Z0-9]{10}$/;
const VISITOR_PATTERN = /^[a-f0-9-]{36}$/i;
const VALID_REACTIONS = new Set(["like", "dislike"]);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      asin?: string;
      visitorId?: string;
      reaction?: "like" | "dislike";
    };

    const asin = body.asin?.trim().toUpperCase() || "";
    const visitorId = body.visitorId?.trim() || "";
    const reaction = body.reaction?.trim() || "";

    if (!ASIN_PATTERN.test(asin)) {
      return NextResponse.json({ ok: false, error: "invalid_asin" }, { status: 400 });
    }

    if (!VISITOR_PATTERN.test(visitorId)) {
      return NextResponse.json(
        { ok: false, error: "invalid_visitor" },
        { status: 400 }
      );
    }

    if (!VALID_REACTIONS.has(reaction)) {
      return NextResponse.json(
        { ok: false, error: "invalid_reaction" },
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

    const existingRows = await prisma.$queryRaw<Array<{ reaction: string }>>`
      SELECT "reaction"
      FROM "DynamicProductReaction"
      WHERE "productId" = ${product.id}
        AND "visitorId" = ${visitorId}
      LIMIT 1
    `;

    const currentReaction = existingRows[0]?.reaction ?? null;
    const nextReaction = currentReaction === reaction ? null : reaction;

    if (nextReaction === null) {
      await prisma.$executeRaw`
        DELETE FROM "DynamicProductReaction"
        WHERE "productId" = ${product.id}
          AND "visitorId" = ${visitorId}
      `;
    } else {
      await prisma.$executeRaw`
        INSERT INTO "DynamicProductReaction" (
          "id",
          "productId",
          "visitorId",
          "reaction",
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${crypto.randomUUID()},
          ${product.id},
          ${visitorId},
          ${nextReaction},
          NOW(),
          NOW()
        )
        ON CONFLICT ("productId", "visitorId")
        DO UPDATE SET
          "reaction" = ${nextReaction},
          "updatedAt" = NOW()
      `;
    }

    const counts = await prisma.$queryRaw<Array<{ likeCount: bigint; dislikeCount: bigint }>>`
      SELECT
        COUNT(*) FILTER (WHERE "reaction" = 'like')::bigint AS "likeCount",
        COUNT(*) FILTER (WHERE "reaction" = 'dislike')::bigint AS "dislikeCount"
      FROM "DynamicProductReaction"
      WHERE "productId" = ${product.id}
    `;

    return NextResponse.json({
      ok: true,
      reaction: nextReaction,
      likeCount: Number(counts[0]?.likeCount ?? 0),
      dislikeCount: Number(counts[0]?.dislikeCount ?? 0),
    });
  } catch (error) {
    console.error("Erro ao registrar reacao de produto:", error);

    return NextResponse.json(
      { ok: false, error: "reaction_failed" },
      { status: 500 }
    );
  }
}

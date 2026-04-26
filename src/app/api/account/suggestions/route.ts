import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getCurrentSiteUser,
  isSiteUserVerified,
  verificationRequiredResponse,
} from "@/lib/siteAuth";

export async function POST(request: Request) {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isSiteUserVerified(user)) {
    return verificationRequiredResponse();
  }

  try {
    const body = (await request.json()) as {
      asin?: string;
      amazonUrl?: string;
      title?: string;
      notes?: string;
    };

    const notes = body.notes?.trim() ?? "";
    if (notes.length < 4) {
      return NextResponse.json({ ok: false, error: "invalid_notes" }, { status: 400 });
    }

    const asin = body.asin?.trim() || null;
    if (asin) {
      const existingSuggestion = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
        SELECT s."id"
        FROM "SiteProductSuggestion" s
        WHERE s."asin" = ${asin}
        LIMIT 1
      `);

      if (existingSuggestion.length > 0) {
        return NextResponse.json({ ok: true, alreadyExists: true });
      }
    }

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO "SiteProductSuggestion" (
        "id",
        "userId",
        "asin",
        "amazonUrl",
        "title",
        "notes",
        "status",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${user.id},
        ${asin},
        ${body.amazonUrl?.trim() || null},
        ${body.title?.trim() || null},
        ${notes},
        'pending',
        NOW(),
        NOW()
      )
    `);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("suggestion_create_failed", error);
    return NextResponse.json({ ok: false, error: "suggestion_create_failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentSiteUser } from "@/lib/siteAuth";

export async function POST(request: Request) {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
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
        ${body.asin?.trim() || null},
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

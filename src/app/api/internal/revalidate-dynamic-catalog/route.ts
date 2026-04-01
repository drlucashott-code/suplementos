import { NextRequest, NextResponse } from "next/server";
import { revalidateDynamicCatalogCategoryRefs } from "@/lib/dynamicCatalogRevalidation";
import { type DynamicCatalogCategoryRef } from "@/lib/dynamicCatalogCache";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret =
    process.env.INTERNAL_REVALIDATE_SECRET || process.env.CRON_SECRET || "";

  if (!secret) {
    return false;
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function parseRefs(value: unknown): DynamicCatalogCategoryRef[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      group: String(item.group || "").trim(),
      slug: String(item.slug || "").trim(),
    }))
    .filter((item) => item.group && item.slug);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const refs = parseRefs((body as { refs?: unknown }).refs);

    revalidateDynamicCatalogCategoryRefs(refs);

    return NextResponse.json({
      ok: true,
      count: refs.length,
    });
  } catch (error) {
    console.error("Erro ao revalidar catalogo dinamico:", error);

    return NextResponse.json(
      { ok: false, error: "dynamic_catalog_revalidation_failed" },
      { status: 500 }
    );
  }
}

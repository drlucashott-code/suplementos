import { NextRequest, NextResponse } from "next/server";
import { getDynamicCatalogData } from "@/lib/dynamicCatalog";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const group = searchParams.get("group");
  const slug = searchParams.get("slug");
  const limit = Number(searchParams.get("limit") || "12");
  const offset = Number(searchParams.get("offset") || "0");

  if (!group || !slug) {
    return NextResponse.json(
      { ok: false, error: "missing_group_or_slug" },
      { status: 400 }
    );
  }

  const search: Record<string, string | string[] | undefined> = {};

  searchParams.forEach((value, key) => {
    if (["group", "slug", "limit", "offset"].includes(key)) return;

    const allValues = searchParams.getAll(key);
    search[key] = allValues.length > 1 ? allValues : value;
  });

  const catalog = await getDynamicCatalogData({
    group,
    slug,
    search,
    limit,
    offset,
  });

  if (!catalog) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    products: catalog.products,
    totalProducts: catalog.totalProducts,
    hasMore: catalog.hasMore,
    nextOffset: offset + catalog.products.length,
  });
}

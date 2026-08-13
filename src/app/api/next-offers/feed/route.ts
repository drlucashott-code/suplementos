import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { fetchNextOffersFeed } from "@/lib/next-offers/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = new URLSearchParams(request.nextUrl.searchParams);
    if ([...params.keys()].length === 0) params.set("view", "home");
    const feed = await fetchNextOffersFeed(params, 12_000);
    const response = NextResponse.json(feed);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Falha ao consultar o feed novo de ofertas.", error);
    return NextResponse.json(
      { error: "O feed de ofertas está temporariamente indisponível." },
      { status: 503 },
    );
  }
}

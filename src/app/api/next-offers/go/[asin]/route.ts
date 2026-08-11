import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getNextOffersBaseUrl } from "@/lib/next-offers/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ asin: string }> },
) {
  const { asin: rawAsin } = await context.params;
  const asin = rawAsin.trim().toUpperCase();
  const baseUrl = getNextOffersBaseUrl();

  if (!baseUrl || !/^[A-Z0-9]{10}$/.test(asin)) {
    return NextResponse.redirect(new URL("/", request.url), 307);
  }

  const upstreamUrl = new URL(`/go/${asin}`, baseUrl);
  request.nextUrl.searchParams.forEach((value, key) => {
    upstreamUrl.searchParams.set(key, value);
  });

  try {
    const upstream = await fetch(upstreamUrl, {
      redirect: "manual",
      cache: "no-store",
      headers: {
        ...(request.headers.get("cookie")
          ? { Cookie: request.headers.get("cookie")! }
          : {}),
        ...(request.headers.get("user-agent")
          ? { "User-Agent": request.headers.get("user-agent")! }
          : {}),
      },
      signal: AbortSignal.timeout(8_000),
    });
    const location = upstream.headers.get("location");
    if (!location || upstream.status < 300 || upstream.status >= 400) {
      throw new Error(`Redirecionamento inválido: HTTP ${upstream.status}.`);
    }

    const response = NextResponse.redirect(new URL(location, upstreamUrl), 307);
    const cookie = upstream.headers.get("set-cookie");
    if (cookie) response.headers.set("set-cookie", cookie);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Falha no redirecionamento do feed novo.", error);
    return NextResponse.redirect(new URL("/", request.url), 307);
  }
}

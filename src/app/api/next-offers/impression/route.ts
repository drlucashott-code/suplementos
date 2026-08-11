import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getNextOffersBaseUrl } from "@/lib/next-offers/server";

const maximumBodyLength = 64 * 1024;

export async function POST(request: NextRequest) {
  const baseUrl = getNextOffersBaseUrl();
  if (!baseUrl) {
    return NextResponse.json({ error: "Feed não configurado." }, { status: 503 });
  }

  const body = await request.text();
  if (!body || body.length > maximumBodyLength) {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${baseUrl}/api/analytics/impression`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(request.headers.get("cookie")
          ? { Cookie: request.headers.get("cookie")! }
          : {}),
        ...(request.headers.get("user-agent")
          ? { "User-Agent": request.headers.get("user-agent")! }
          : {}),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const response = new NextResponse(null, { status: upstream.status });
    const cookie = upstream.headers.get("set-cookie");
    if (cookie) response.headers.set("set-cookie", cookie);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Falha ao registrar impressão no feed novo.", error);
    return new NextResponse(null, { status: 204 });
  }
}

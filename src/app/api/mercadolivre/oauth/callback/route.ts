import { NextRequest, NextResponse } from "next/server";
import {
  getMercadoLivreClientId,
  getMercadoLivreClientSecret,
  getMercadoLivreRedirectUri,
  normalizeMercadoLivreItemId,
} from "@/lib/mercadoLivreOAuth";

export const dynamic = "force-dynamic";

type JsonValue = Record<string, unknown> | unknown[] | string | number | boolean | null;

async function readResponse(response: Response): Promise<JsonValue> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as JsonValue;
  } catch {
    return text.slice(0, 1000);
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const providerError = request.nextUrl.searchParams.get("error");
  const expectedState = request.cookies.get("ml_oauth_state")?.value;
  const codeVerifier = request.cookies.get("ml_oauth_verifier")?.value;
  const itemId = normalizeMercadoLivreItemId(
    request.cookies.get("ml_oauth_item_id")?.value
  );

  if (providerError) {
    return NextResponse.json(
      { ok: false, error: "mercado_livre_authorization_denied", detail: providerError },
      { status: 400 }
    );
  }

  if (!code || !returnedState || !expectedState || returnedState !== expectedState) {
    return NextResponse.json(
      { ok: false, error: "invalid_oauth_state_or_code" },
      { status: 400 }
    );
  }

  if (!codeVerifier) {
    return NextResponse.json(
      { ok: false, error: "missing_pkce_verifier" },
      { status: 400 }
    );
  }

  try {
    const tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: getMercadoLivreClientId(),
        client_secret: getMercadoLivreClientSecret(),
        code,
        redirect_uri: getMercadoLivreRedirectUri(),
        code_verifier: codeVerifier,
      }),
      cache: "no-store",
    });

    const tokenBody = (await readResponse(tokenResponse)) as Record<string, unknown> | null;
    if (!tokenResponse.ok || !tokenBody || typeof tokenBody.access_token !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error: "mercado_livre_token_exchange_failed",
          providerStatus: tokenResponse.status,
          providerResponse: tokenBody,
        },
        { status: 502 }
      );
    }

    const authorization = `Bearer ${tokenBody.access_token}`;
    const endpointResults = await Promise.all(
      [
        ["prices", `https://api.mercadolibre.com/items/${itemId}/prices`],
        [
          "sale_price",
          `https://api.mercadolibre.com/items/${itemId}/sale_price?context=channel_marketplace`,
        ],
      ].map(async ([name, url]) => {
        const response = await fetch(url, {
          headers: { Accept: "application/json", Authorization: authorization },
          cache: "no-store",
        });

        return {
          name,
          status: response.status,
          ok: response.ok,
          body: await readResponse(response),
        };
      })
    );

    const response = NextResponse.json({
      ok: endpointResults.some((result) => result.ok),
      itemId,
      results: endpointResults,
      token: {
        received: true,
        expiresIn: tokenBody.expires_in ?? null,
        scope: tokenBody.scope ?? null,
      },
      note: "O token não foi persistido nem incluído na resposta.",
    });

    for (const name of ["ml_oauth_state", "ml_oauth_verifier", "ml_oauth_item_id"]) {
      response.cookies.set(name, "", {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 0,
        path: "/api/mercadolivre/oauth",
      });
    }

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "mercado_livre_oauth_test_failed",
        detail: error instanceof Error ? error.message : "unknown_error",
      },
      { status: 502 }
    );
  }
}

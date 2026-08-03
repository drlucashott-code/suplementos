import { NextRequest, NextResponse } from "next/server";
import {
  createOAuthState,
  createPkcePair,
  getMercadoLivreClientId,
  getMercadoLivreRedirectUri,
  normalizeMercadoLivreItemId,
} from "@/lib/mercadoLivreOAuth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const state = createOAuthState();
    const { verifier, challenge } = createPkcePair();
    const itemId = normalizeMercadoLivreItemId(
      request.nextUrl.searchParams.get("item_id")
    );
    const redirectUri = getMercadoLivreRedirectUri();

    const authorizationUrl = new URL(
      "https://auth.mercadolivre.com.br/authorization"
    );
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("client_id", getMercadoLivreClientId());
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("code_challenge", challenge);
    authorizationUrl.searchParams.set("code_challenge_method", "S256");

    const response = NextResponse.redirect(authorizationUrl);
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: "lax" as const,
      maxAge: 600,
      path: "/api/mercadolivre/oauth",
    };

    response.cookies.set("ml_oauth_state", state, cookieOptions);
    response.cookies.set("ml_oauth_verifier", verifier, cookieOptions);
    response.cookies.set("ml_oauth_item_id", itemId, cookieOptions);

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "oauth_start_failed",
      },
      { status: 500 }
    );
  }
}

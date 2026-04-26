import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const GOOGLE_STATE_COOKIE = "amazonpicks_google_state";

function getBaseUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const requestUrl = new URL(request.url);

  if (process.env.NODE_ENV === "production" && configured) {
    return configured.replace(/\/$/, "");
  }

  return requestUrl.origin.replace(/\/$/, "");
}

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const baseUrl = getBaseUrl(request);

  if (!clientId) {
    return NextResponse.redirect(`${baseUrl}/entrar?google=indisponivel`);
  }

  const state = randomBytes(24).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 10 * 60,
  });

  const callbackUrl = `${baseUrl}/api/auth/google/callback`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  return NextResponse.redirect(url.toString());
}

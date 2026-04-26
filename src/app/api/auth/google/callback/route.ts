import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { loginOrCreateGoogleUser } from "@/lib/siteAuth";

const GOOGLE_STATE_COOKIE = "amazonpicks_google_state";

type GoogleTokenResponse = {
  access_token: string;
  id_token?: string;
};

type GoogleUserInfo = {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://www.amazonpicks.com.br";

  if (error) {
    return NextResponse.redirect(`${baseUrl}/entrar?google=cancelado`);
  }

  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;
  cookieStore.set(GOOGLE_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });

  if (!code || !state || !stateCookie || state !== stateCookie) {
    return NextResponse.redirect(`${baseUrl}/entrar?google=estado-invalido`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/entrar?google=indisponivel`);
  }

  try {
    const callbackUrl = `${baseUrl}/api/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      return NextResponse.redirect(`${baseUrl}/entrar?google=token-failed`);
    }

    const tokenData = (await tokenResponse.json()) as GoogleTokenResponse;
    const userResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      return NextResponse.redirect(`${baseUrl}/entrar?google=userinfo-failed`);
    }

    const googleUser = (await userResponse.json()) as GoogleUserInfo;

    await loginOrCreateGoogleUser({
      googleId: googleUser.sub,
      email: googleUser.email,
      displayName: googleUser.name ?? googleUser.email.split("@")[0] ?? "Usuário",
      avatarUrl: googleUser.picture ?? null,
      emailVerified: googleUser.email_verified === true,
    });

    return NextResponse.redirect(`${baseUrl}/minha-conta`);
  } catch (callbackError) {
    console.error("google_callback_failed", callbackError);
    return NextResponse.redirect(`${baseUrl}/entrar?google=erro`);
  }
}

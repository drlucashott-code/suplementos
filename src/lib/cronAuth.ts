import { NextRequest } from "next/server";

function getRequestSecret(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length).trim();
  }

  const headerSecret =
    request.headers.get("x-cron-secret") ??
    request.headers.get("x-api-key") ??
    request.headers.get("x-vercel-protection-bypass");

  if (headerSecret?.trim()) {
    return headerSecret.trim();
  }

  const querySecret =
    request.nextUrl.searchParams.get("secret") ??
    request.nextUrl.searchParams.get("cron_secret") ??
    request.nextUrl.searchParams.get("token");

  return querySecret?.trim() || "";
}

export function isAuthorizedCronRequest(
  request: NextRequest,
  secret: string | null | undefined
) {
  const expectedSecret = secret?.trim() || "";
  if (!expectedSecret) {
    return false;
  }

  return getRequestSecret(request) === expectedSecret;
}

import { randomUUID, createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AuthRateLimitOptions = {
  scope: string;
  windowType: string;
  limit: number;
  windowMs: number;
};

type AuthRateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

function hashScopeKey(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function sanitizeEmail(value?: string | null) {
  return value?.trim().toLowerCase() ?? "";
}

function floorWindow(dateMs: number, windowMs: number) {
  return Math.floor(dateMs / windowMs) * windowMs;
}

function resolveWindowBounds(windowMs: number) {
  const nowMs = Date.now();
  const windowStartMs = floorWindow(nowMs, windowMs);

  return {
    nowMs,
    windowStart: new Date(windowStartMs),
    windowEnd: new Date(windowStartMs + windowMs),
  };
}

function getHeaderValue(headers: Headers, name: string) {
  const value = headers.get(name);
  return value?.trim() || null;
}

export function getClientIpFromRequest(request: Request) {
  const forwardedFor = getHeaderValue(request.headers, "x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    getHeaderValue(request.headers, "x-real-ip") ??
    getHeaderValue(request.headers, "cf-connecting-ip") ??
    "unknown"
  );
}

async function consumeWindowLimit(
  options: AuthRateLimitOptions
): Promise<AuthRateLimitResult> {
  const { nowMs, windowStart, windowEnd } = resolveWindowBounds(options.windowMs);

  const rows = await prisma.$queryRaw<
    Array<{
      requestCount: number;
      windowEnd: Date;
    }>
  >(Prisma.sql`
    INSERT INTO "PriceRefreshBudgetWindow" (
      "id",
      "scope",
      "windowType",
      "windowStart",
      "windowEnd",
      "requestCount",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${options.scope},
      ${options.windowType},
      ${windowStart},
      ${windowEnd},
      1,
      NOW(),
      NOW()
    )
    ON CONFLICT ("scope", "windowType", "windowStart")
    DO UPDATE
    SET
      "requestCount" = "PriceRefreshBudgetWindow"."requestCount" + 1,
      "updatedAt" = NOW()
    RETURNING "requestCount", "windowEnd"
  `);

  const row = rows[0];
  const used = row?.requestCount ?? 1;
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(((row?.windowEnd?.getTime() ?? windowEnd.getTime()) - nowMs) / 1000)
  );

  return {
    allowed: used <= options.limit,
    remaining: Math.max(0, options.limit - used),
    retryAfterSeconds,
  };
}

export async function assertAuthRateLimit(params: {
  request: Request;
  action:
    | "login"
    | "register"
    | "forgot_password"
    | "resend_verification"
    | "reset_password";
  email?: string | null;
}) {
  const ip = getClientIpFromRequest(params.request);
  const email = sanitizeEmail(params.email);

  const checks: AuthRateLimitOptions[] = [];

  if (params.action === "login") {
    checks.push({
      scope: `auth:login:ip:${hashScopeKey(ip)}`,
      windowType: "auth_login_ip_10m",
      limit: 12,
      windowMs: 10 * 60 * 1000,
    });

    if (email) {
      checks.push({
        scope: `auth:login:email_ip:${hashScopeKey(`${email}:${ip}`)}`,
        windowType: "auth_login_email_ip_10m",
        limit: 6,
        windowMs: 10 * 60 * 1000,
      });
    }
  }

  if (params.action === "register") {
    checks.push({
      scope: `auth:register:ip:${hashScopeKey(ip)}`,
      windowType: "auth_register_ip_30m",
      limit: 5,
      windowMs: 30 * 60 * 1000,
    });
  }

  if (params.action === "forgot_password" || params.action === "resend_verification") {
    checks.push({
      scope: `auth:recovery:ip:${hashScopeKey(ip)}`,
      windowType: "auth_recovery_ip_30m",
      limit: 8,
      windowMs: 30 * 60 * 1000,
    });

    if (email) {
      checks.push({
        scope: `auth:recovery:email:${hashScopeKey(email)}`,
        windowType: "auth_recovery_email_30m",
        limit: 4,
        windowMs: 30 * 60 * 1000,
      });
    }
  }

  if (params.action === "reset_password") {
    checks.push({
      scope: `auth:reset:ip:${hashScopeKey(ip)}`,
      windowType: "auth_reset_ip_30m",
      limit: 10,
      windowMs: 30 * 60 * 1000,
    });
  }

  const results = await Promise.all(checks.map((check) => consumeWindowLimit(check)));
  const blocked = results.find((result) => !result.allowed);

  if (!blocked) {
    return null;
  }

  return NextResponse.json(
    {
      ok: false,
      error: "rate_limited",
      message: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(blocked.retryAfterSeconds),
      },
    }
  );
}

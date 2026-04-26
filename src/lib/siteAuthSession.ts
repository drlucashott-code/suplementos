import { createHash } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const AUTH_COOKIE_NAME = "amazonpicks_session";

export type SiteSessionUser = {
  id: string;
  email: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
};

type SiteSessionRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
  user: SiteSessionUser;
};

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export const getCurrentSiteSession = cache(async (): Promise<SiteSessionRecord | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) return null;

  const sessions = await prisma.$queryRaw<SiteSessionRecord[]>`
    SELECT
      s."id",
      s."userId",
      s."expiresAt",
      json_build_object(
        'id', u."id",
        'email', u."email",
        'displayName', u."displayName",
        'username', u."username",
        'avatarUrl', u."avatarUrl",
        'bio', u."bio",
        'role', u."role"
      ) AS "user"
    FROM "SiteSession" s
    INNER JOIN "SiteUser" u ON u."id" = s."userId"
    WHERE s."tokenHash" = ${hashSessionToken(token)}
      AND s."expiresAt" > NOW()
    LIMIT 1
  `;

  return sessions[0] ?? null;
});

export async function getCurrentSiteUser(): Promise<SiteSessionUser | null> {
  const session = await getCurrentSiteSession();
  return session?.user ?? null;
}

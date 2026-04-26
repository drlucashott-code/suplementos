'use server';

import { randomBytes, scryptSync, timingSafeEqual, createHash, randomUUID } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getEmailVerificationTokenHash,
  makeEmailVerificationToken,
  makePasswordResetToken,
  getPasswordResetTokenHash,
  sendPasswordResetEmail,
  sendSiteVerificationEmail,
} from "@/lib/siteAuthEmail";

const AUTH_COOKIE_NAME = "amazonpicks_session";
const SESSION_DURATION_DAYS = 30;
const PASSWORD_SALT_BYTES = 16;
const SESSION_TOKEN_BYTES = 32;

export type AuthenticatedSiteUser = {
  id: string;
  email: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeDisplayName(displayName: string) {
  return displayName.trim().replace(/\s+/g, " ");
}

function normalizeUsername(username: string) {
  return username
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/_{2,}/g, "_")
    .replace(/^[._]+|[._]+$/g, "");
}

async function isUsernameTaken(username: string, excludeUserId?: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "SiteUser"
    WHERE "username" = ${username}
      ${excludeUserId ? Prisma.sql`AND "id" <> ${excludeUserId}` : Prisma.empty}
    LIMIT 1
  `);

  return Boolean(rows[0]);
}

async function generateAvailableUsername(baseInput: string, excludeUserId?: string) {
  const base = normalizeUsername(baseInput) || `usuario${Math.floor(Math.random() * 100000)}`;
  const trimmedBase = base.slice(0, 24);

  if (!(await isUsernameTaken(trimmedBase, excludeUserId))) {
    return trimmedBase;
  }

  for (let attempt = 1; attempt <= 50; attempt += 1) {
    const suffix = `${Math.floor(100 + Math.random() * 900)}`;
    const candidate = `${trimmedBase.slice(0, Math.max(3, 24 - suffix.length))}${suffix}`;
    if (!(await isUsernameTaken(candidate, excludeUserId))) {
      return candidate;
    }
  }

  return `${trimmedBase.slice(0, 18)}${Date.now().toString().slice(-6)}`;
}

function makePasswordHash(password: string) {
  const salt = randomBytes(PASSWORD_SALT_BYTES).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPasswordHash(password: string, storedHash: string) {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;

  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(password, salt, expected.length);

  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createId() {
  return randomUUID();
}

function sanitizeIpAddress(value: string | null) {
  if (!value) return null;
  return value.split(",")[0]?.trim().slice(0, 120) || null;
}

function sanitizeUserAgent(value: string | null) {
  return value?.trim().slice(0, 500) || null;
}

function createExpiryDate(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function setAuthCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function registerSiteUser(input: {
  email: string;
  password: string;
  displayName: string;
  username: string;
}) {
  const email = normalizeEmail(input.email);
  const displayName = normalizeDisplayName(input.displayName);
  const username = normalizeUsername(input.username);
  const password = input.password.trim();

  if (!email || !email.includes("@")) {
    return { ok: false as const, error: "Informe um email válido." };
  }

  if (displayName.length < 2) {
    return { ok: false as const, error: "Informe um nome com pelo menos 2 caracteres." };
  }

  if (username.length < 3) {
    return { ok: false as const, error: "Escolha um username com pelo menos 3 caracteres." };
  }

  if (password.length < 6) {
    return { ok: false as const, error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const existingUser = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "SiteUser"
    WHERE "email" = ${email}
    LIMIT 1
  `);

  if (existingUser[0]) {
    return { ok: false as const, error: "Já existe uma conta com este email." };
  }

  if (await isUsernameTaken(username)) {
    return { ok: false as const, error: "Esse username já está em uso." };
  }

  const verification = makeEmailVerificationToken();
  const userRows = await prisma.$queryRaw<Array<AuthenticatedSiteUser>>(Prisma.sql`
    INSERT INTO "SiteUser" (
      "id",
      "email",
      "passwordHash",
      "displayName",
      "username",
      "role",
      "googleId",
      "emailVerificationTokenHash",
      "emailVerificationExpiresAt",
      "passwordResetTokenHash",
      "passwordResetExpiresAt",
      "lastLoginAt",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${createId()},
      ${email},
      ${makePasswordHash(password)},
      ${displayName},
      ${username},
      'user',
      NULL,
      ${verification.tokenHash},
      ${createExpiryDate(24)},
      NULL,
      NULL,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING "id", "email", "displayName", "username", "avatarUrl", "bio", "role"
  `);

  const user = userRows[0]!;
  const emailSent = await sendSiteVerificationEmail({
    email,
    displayName,
    token: verification.rawToken,
  });

  return { ok: true as const, user, pendingVerification: true as const, emailSent };
}

export async function loginSiteUser(input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);
  const password = input.password.trim();

  if (!email || !password) {
    return { ok: false as const, error: "Preencha email e senha." };
  }

  const users = await prisma.$queryRaw<
    Array<
      AuthenticatedSiteUser & {
        passwordHash: string;
        emailVerifiedAt: Date | null;
      }
    >
  >(Prisma.sql`
    SELECT "id", "email", "displayName", "username", "avatarUrl", "bio", "role", "passwordHash", "emailVerifiedAt"
    FROM "SiteUser"
    WHERE "email" = ${email}
    LIMIT 1
  `);

  const user = users[0];

  if (!user || !verifyPasswordHash(password, user.passwordHash)) {
    return { ok: false as const, error: "Email ou senha inválidos." };
  }

  if (!user.emailVerifiedAt) {
    return {
      ok: false as const,
      error: "Confirme seu email antes de entrar na conta.",
      needsVerification: true as const,
    };
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "SiteUser"
    SET "lastLoginAt" = NOW(), "updatedAt" = NOW()
    WHERE "id" = ${user.id}
  `);

  await createSiteSession(user.id);

  return {
    ok: true as const,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
    },
  };
}

export async function verifySiteUserEmail(token: string) {
  const trimmedToken = token.trim();
  if (!trimmedToken) {
    return { ok: false as const, error: "invalid_token" };
  }

  const rows = await prisma.$queryRaw<Array<{ id: string; emailVerifiedAt: Date | null }>>(Prisma.sql`
    SELECT "id", "emailVerifiedAt"
    FROM "SiteUser"
    WHERE "emailVerificationTokenHash" = ${getEmailVerificationTokenHash(trimmedToken)}
      AND "emailVerificationExpiresAt" > NOW()
    LIMIT 1
  `);

  const user = rows[0];
  if (!user) {
    return { ok: false as const, error: "invalid_or_expired_token" };
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "SiteUser"
    SET
      "emailVerifiedAt" = COALESCE("emailVerifiedAt", NOW()),
      "emailVerificationTokenHash" = NULL,
      "emailVerificationExpiresAt" = NULL,
      "updatedAt" = NOW()
    WHERE "id" = ${user.id}
  `);

  return { ok: true as const };
}

export async function resendSiteVerificationEmail(emailInput: string) {
  const email = normalizeEmail(emailInput);
  if (!email || !email.includes("@")) {
    return { ok: false as const, error: "Informe um email válido." };
  }

  const rows = await prisma.$queryRaw<
    Array<{ id: string; email: string; displayName: string; emailVerifiedAt: Date | null }>
  >(Prisma.sql`
    SELECT "id", "email", "displayName", "emailVerifiedAt"
    FROM "SiteUser"
    WHERE "email" = ${email}
    LIMIT 1
  `);

  const user = rows[0];
  if (!user) {
    return { ok: true as const, sent: false as const };
  }

  if (user.emailVerifiedAt) {
    return { ok: true as const, sent: false as const, alreadyVerified: true as const };
  }

  const verification = makeEmailVerificationToken();
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "SiteUser"
    SET
      "emailVerificationTokenHash" = ${verification.tokenHash},
      "emailVerificationExpiresAt" = ${createExpiryDate(24)},
      "updatedAt" = NOW()
    WHERE "id" = ${user.id}
  `);

  const emailSent = await sendSiteVerificationEmail({
    email: user.email,
    displayName: user.displayName,
    token: verification.rawToken,
  });

  return { ok: true as const, sent: emailSent };
}

export async function sendSitePasswordReset(emailInput: string) {
  const email = normalizeEmail(emailInput);
  if (!email || !email.includes("@")) {
    return { ok: false as const, error: "Informe um email válido." };
  }

  const rows = await prisma.$queryRaw<
    Array<{ id: string; email: string; displayName: string }>
  >(Prisma.sql`
    SELECT "id", "email", "displayName"
    FROM "SiteUser"
    WHERE "email" = ${email}
    LIMIT 1
  `);

  const user = rows[0];
  if (!user) {
    return { ok: true as const, sent: true as const };
  }

  const reset = makePasswordResetToken();
  await prisma.$executeRaw(Prisma.sql`
    UPDATE "SiteUser"
    SET
      "passwordResetTokenHash" = ${reset.tokenHash},
      "passwordResetExpiresAt" = ${createExpiryDate(2)},
      "updatedAt" = NOW()
    WHERE "id" = ${user.id}
  `);

  const emailSent = await sendPasswordResetEmail({
    email: user.email,
    displayName: user.displayName,
    token: reset.rawToken,
  });

  return { ok: true as const, sent: emailSent };
}

export async function resetSitePassword(input: { token: string; password: string }) {
  const token = input.token.trim();
  const password = input.password.trim();

  if (!token) {
    return { ok: false as const, error: "invalid_token" };
  }

  if (password.length < 6) {
    return { ok: false as const, error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "SiteUser"
    WHERE "passwordResetTokenHash" = ${getPasswordResetTokenHash(token)}
      AND "passwordResetExpiresAt" > NOW()
    LIMIT 1
  `);

  const user = rows[0];
  if (!user) {
    return { ok: false as const, error: "invalid_or_expired_token" };
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE "SiteUser"
    SET
      "passwordHash" = ${makePasswordHash(password)},
      "passwordResetTokenHash" = NULL,
      "passwordResetExpiresAt" = NULL,
      "updatedAt" = NOW()
    WHERE "id" = ${user.id}
  `);

  return { ok: true as const };
}

export async function loginOrCreateGoogleUser(input: {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  emailVerified?: boolean;
}) {
  const email = normalizeEmail(input.email);
  const displayName = normalizeDisplayName(input.displayName) || "Usuário";
  const generatedUsername = await generateAvailableUsername(
    input.email.split("@")[0] || displayName
  );

  const existing = await prisma.$queryRaw<
    Array<AuthenticatedSiteUser & { googleId: string | null; emailVerifiedAt: Date | null }>
  >(Prisma.sql`
    SELECT "id", "email", "displayName", "username", "avatarUrl", "bio", "role", "googleId", "emailVerifiedAt"
    FROM "SiteUser"
    WHERE "googleId" = ${input.googleId}
       OR "email" = ${email}
    LIMIT 1
  `);

  const user = existing[0];

  if (user) {
    await prisma.$executeRaw(Prisma.sql`
      UPDATE "SiteUser"
      SET
        "googleId" = COALESCE("googleId", ${input.googleId}),
        "displayName" = COALESCE(NULLIF(${displayName}, ''), "displayName"),
        "username" = COALESCE("username", ${generatedUsername}),
        "avatarUrl" = COALESCE(${input.avatarUrl ?? null}, "avatarUrl"),
        "emailVerifiedAt" = CASE
          WHEN ${input.emailVerified === true} THEN COALESCE("emailVerifiedAt", NOW())
          ELSE "emailVerifiedAt"
        END,
        "lastLoginAt" = NOW(),
        "updatedAt" = NOW()
      WHERE "id" = ${user.id}
    `);

    await createSiteSession(user.id);
    return { ok: true as const };
  }

  const newUserId = createId();
  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "SiteUser" (
      "id",
      "email",
      "passwordHash",
      "displayName",
      "username",
      "avatarUrl",
      "role",
      "googleId",
      "emailVerifiedAt",
      "lastLoginAt",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${newUserId},
      ${email},
      ${makePasswordHash(randomUUID())},
      ${displayName},
      ${generatedUsername},
      ${input.avatarUrl ?? null},
      'user',
      ${input.googleId},
      ${input.emailVerified === true ? new Date() : null},
      NOW(),
      NOW(),
      NOW()
    )
  `);

  await createSiteSession(newUserId);
  return { ok: true as const };
}

export async function updateSiteUserProfile(input: {
  userId: string;
  displayName: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
}) {
  const email = normalizeEmail(input.email);
  const displayName = normalizeDisplayName(input.displayName);
  const username = normalizeUsername(input.username);
  const avatarUrl = input.avatarUrl?.trim() ? input.avatarUrl.trim() : null;

  if (!email || !email.includes("@")) {
    return { ok: false as const, error: "Informe um email válido." };
  }

  if (displayName.length < 2) {
    return { ok: false as const, error: "Informe um nome com pelo menos 2 caracteres." };
  }

  if (username.length < 3) {
    return { ok: false as const, error: "Escolha um username com pelo menos 3 caracteres." };
  }

  const emailRows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "SiteUser"
    WHERE "email" = ${email}
      AND "id" <> ${input.userId}
    LIMIT 1
  `);

  if (emailRows[0]) {
    return { ok: false as const, error: "Já existe uma conta com este email." };
  }

  if (await isUsernameTaken(username, input.userId)) {
    return { ok: false as const, error: "Esse username já está em uso." };
  }

  const rows = await prisma.$queryRaw<Array<AuthenticatedSiteUser>>(Prisma.sql`
    UPDATE "SiteUser"
    SET
      "displayName" = ${displayName},
      "username" = ${username},
      "email" = ${email},
      "avatarUrl" = ${avatarUrl},
      "updatedAt" = NOW()
    WHERE "id" = ${input.userId}
    RETURNING "id", "email", "displayName", "username", "avatarUrl", "bio", "role"
  `);

  return { ok: true as const, user: rows[0]! };
}

export async function createSiteSession(userId: string) {
  const token = randomBytes(SESSION_TOKEN_BYTES).toString("hex");
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  const headersStore = await headers();

  await prisma.$executeRaw(Prisma.sql`
    INSERT INTO "SiteSession" (
      "id",
      "userId",
      "tokenHash",
      "userAgent",
      "ipAddress",
      "expiresAt",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${createId()},
      ${userId},
      ${tokenHash},
      ${sanitizeUserAgent(headersStore.get("user-agent"))},
      ${sanitizeIpAddress(headersStore.get("x-forwarded-for"))},
      ${expiresAt},
      NOW(),
      NOW()
    )
  `);

  await setAuthCookie(token, expiresAt);
}

export async function logoutSiteUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (token) {
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM "SiteSession"
      WHERE "tokenHash" = ${hashSessionToken(token)}
    `);
  }

  await clearAuthCookie();
}

export const getCurrentSiteSession = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) return null;

  const sessions = await prisma.$queryRaw<
    Array<{
      id: string;
      userId: string;
      expiresAt: Date;
      user: AuthenticatedSiteUser;
    }>
  >(Prisma.sql`
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
  `);

  const session = sessions[0] ?? null;

  if (!session) {
    return null;
  }

  return session;
});

export async function getCurrentSiteUser(): Promise<AuthenticatedSiteUser | null> {
  const session = await getCurrentSiteSession();
  return session?.user ?? null;
}

export async function requireCurrentSiteUser() {
  const user = await getCurrentSiteUser();
  if (!user) redirect("/entrar");
  return user;
}

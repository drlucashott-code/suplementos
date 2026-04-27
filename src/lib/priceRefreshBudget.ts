import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type BudgetExecutor = {
  $queryRaw: typeof prisma.$queryRaw;
};

function getWindowRange(now: Date, windowType: "hour" | "day") {
  const date = new Date(now);

  if (windowType === "hour") {
    date.setMinutes(0, 0, 0);
    return {
      start: date,
      end: new Date(date.getTime() + HOUR_MS),
    };
  }

  date.setHours(0, 0, 0, 0);
  return {
    start: date,
    end: new Date(date.getTime() + DAY_MS),
  };
}

async function getOrCreateBudgetWindow(params: {
  scope: string;
  windowType: "hour" | "day";
  now?: Date;
  tx?: BudgetExecutor;
}) {
  const now = params.now ?? new Date();
  const { start, end } = getWindowRange(now, params.windowType);
  const tx = params.tx ?? prisma;

  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      requestCount: number;
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
      ${crypto.randomUUID()},
      ${params.scope},
      ${params.windowType},
      ${start},
      ${end},
      0,
      NOW(),
      NOW()
    )
    ON CONFLICT ("scope", "windowType", "windowStart")
    DO UPDATE SET "updatedAt" = NOW()
    RETURNING "id", "requestCount"
  `);

  return {
    id: rows[0]!.id,
    requestCount: rows[0]!.requestCount ?? 0,
    start,
    end,
  };
}

export async function reservePriceRefreshBudget(params: {
  scope: string;
  amount: number;
  hourlyLimit: number;
  dailyLimit: number;
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const amount = Math.max(0, params.amount);

  if (amount === 0) {
    return {
      granted: 0,
      blockedBy: null as null | "hour" | "day",
      hourlyRemaining: params.hourlyLimit,
      dailyRemaining: params.dailyLimit,
    };
  }

  return prisma.$transaction(async (tx) => {
    const hourWindow = await getOrCreateBudgetWindow({
      scope: params.scope,
      windowType: "hour",
      now,
      tx,
    });
    const dayWindow = await getOrCreateBudgetWindow({
      scope: params.scope,
      windowType: "day",
      now,
      tx,
    });

    const lockedHourRows = await tx.$queryRaw<Array<{ requestCount: number }>>(Prisma.sql`
      SELECT "requestCount"
      FROM "PriceRefreshBudgetWindow"
      WHERE "id" = ${hourWindow.id}
      FOR UPDATE
    `);
    const lockedDayRows = await tx.$queryRaw<Array<{ requestCount: number }>>(Prisma.sql`
      SELECT "requestCount"
      FROM "PriceRefreshBudgetWindow"
      WHERE "id" = ${dayWindow.id}
      FOR UPDATE
    `);

    const hourCount = lockedHourRows[0]?.requestCount ?? 0;
    const dayCount = lockedDayRows[0]?.requestCount ?? 0;
    const hourlyRemaining = Math.max(0, params.hourlyLimit - hourCount);
    const dailyRemaining = Math.max(0, params.dailyLimit - dayCount);
    const granted = Math.max(0, Math.min(amount, hourlyRemaining, dailyRemaining));

    if (granted > 0) {
      await tx.$executeRaw(Prisma.sql`
        UPDATE "PriceRefreshBudgetWindow"
        SET
          "requestCount" = "requestCount" + ${granted},
          "updatedAt" = NOW()
        WHERE "id" = ${hourWindow.id}
      `);
      await tx.$executeRaw(Prisma.sql`
        UPDATE "PriceRefreshBudgetWindow"
        SET
          "requestCount" = "requestCount" + ${granted},
          "updatedAt" = NOW()
        WHERE "id" = ${dayWindow.id}
      `);
    }

    return {
      granted,
      blockedBy:
        granted < amount
          ? hourlyRemaining <= dailyRemaining
            ? ("hour" as const)
            : ("day" as const)
          : null,
      hourlyRemaining: Math.max(0, hourlyRemaining - granted),
      dailyRemaining: Math.max(0, dailyRemaining - granted),
    };
  });
}

export async function getPriceRefreshBudgetSnapshot(params: {
  scopes: string[];
  now?: Date;
}) {
  const now = params.now ?? new Date();
  const hourRange = getWindowRange(now, "hour");
  const dayRange = getWindowRange(now, "day");

  const rows = await prisma.priceRefreshBudgetWindow.findMany({
    where: {
      scope: { in: params.scopes },
      OR: [
        {
          windowType: "hour",
          windowStart: hourRange.start,
        },
        {
          windowType: "day",
          windowStart: dayRange.start,
        },
      ],
    },
    select: {
      scope: true,
      windowType: true,
      requestCount: true,
    },
  });

  return params.scopes.map((scope) => {
    const hour = rows.find((row) => row.scope === scope && row.windowType === "hour");
    const day = rows.find((row) => row.scope === scope && row.windowType === "day");

    return {
      scope,
      hourRequestCount: hour?.requestCount ?? 0,
      dayRequestCount: day?.requestCount ?? 0,
      hourWindowStart: hourRange.start,
      dayWindowStart: dayRange.start,
    };
  });
}

import { prisma } from "@/lib/prisma";
import {
  buildBlockedMerchantMatcher,
  DEFAULT_BLOCKED_MERCHANTS,
} from "@/lib/blockedMerchants";
import { Prisma } from "@prisma/client";

const DYNAMIC_SITE_CONFIG_KEY = "global";

function normalizeMerchantList(values: readonly string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const trimmed = String(value ?? "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
}

async function ensureDynamicSiteConfigRow() {
  await prisma.dynamicSiteConfig.upsert({
    where: { key: DYNAMIC_SITE_CONFIG_KEY },
    update: {},
    create: {
      key: DYNAMIC_SITE_CONFIG_KEY,
      blockedMerchants: [...DEFAULT_BLOCKED_MERCHANTS],
    },
  });

  const row = await prisma.dynamicSiteConfig.findUnique({
    where: { key: DYNAMIC_SITE_CONFIG_KEY },
    select: { blockedMerchants: true },
  });

  const normalizedBlockedMerchants = normalizeMerchantList(row?.blockedMerchants ?? []);
  const mergedBlockedMerchants = normalizeMerchantList([
    ...DEFAULT_BLOCKED_MERCHANTS,
    ...normalizedBlockedMerchants,
  ]);

  if (mergedBlockedMerchants.length !== normalizedBlockedMerchants.length) {
    await prisma.dynamicSiteConfig.update({
      where: { key: DYNAMIC_SITE_CONFIG_KEY },
      data: {
        blockedMerchants: mergedBlockedMerchants,
      },
    });
  }
}

async function getBlockedMerchantStats(blockedMerchants: readonly string[]) {
  if (blockedMerchants.length === 0) {
    return [] as Array<{ merchant: string; productCount: number }>;
  }

  const normalizedBlockedNames = blockedMerchants.map((value) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase()
  );

  const rows = await prisma.$queryRaw<Array<{ merchant: string; productCount: number }>>(Prisma.sql`
    SELECT
      p."attributes"->>'seller' AS merchant,
      COUNT(*)::int AS "productCount"
    FROM "DynamicProduct" p
    WHERE LOWER(BTRIM(COALESCE(p."attributes"->>'seller', ''))) IN (${Prisma.join(
      normalizedBlockedNames.map((value) => Prisma.sql`${value}`)
    )})
    GROUP BY p."attributes"->>'seller'
    ORDER BY COUNT(*) DESC, merchant ASC
  `);

  return rows;
}

export async function getBlockedMerchantsConfig() {
  await ensureDynamicSiteConfigRow();

  const row = await prisma.dynamicSiteConfig.findUnique({
    where: { key: DYNAMIC_SITE_CONFIG_KEY },
    select: { blockedMerchants: true },
  });

  const blockedMerchants = normalizeMerchantList(row?.blockedMerchants ?? []);
  const blockedMerchantStats = await getBlockedMerchantStats(blockedMerchants);

  return {
    blockedMerchants,
    blockedMerchantStats,
    allBlockedMerchants: blockedMerchants,
  };
}

export async function setCustomBlockedMerchants(input: string[]) {
  await ensureDynamicSiteConfigRow();

  const blockedMerchants = normalizeMerchantList(input);

  await prisma.dynamicSiteConfig.update({
    where: { key: DYNAMIC_SITE_CONFIG_KEY },
    data: {
      blockedMerchants,
    },
  });

  return getBlockedMerchantsConfig();
}

export async function getBlockedMerchantMatcher() {
  const config = await getBlockedMerchantsConfig();
  return buildBlockedMerchantMatcher(config.allBlockedMerchants);
}

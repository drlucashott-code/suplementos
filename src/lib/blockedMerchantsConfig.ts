import { prisma } from "@/lib/prisma";
import {
  buildBlockedMerchantMatcher,
  DEFAULT_BLOCKED_MERCHANTS,
} from "@/lib/blockedMerchants";

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
      blockedMerchants: [],
    },
  });
}

export async function getBlockedMerchantsConfig() {
  await ensureDynamicSiteConfigRow();

  const row = await prisma.dynamicSiteConfig.findUnique({
    where: { key: DYNAMIC_SITE_CONFIG_KEY },
    select: { blockedMerchants: true },
  });

  const customBlockedMerchants = normalizeMerchantList(row?.blockedMerchants ?? []);
  const allBlockedMerchants = normalizeMerchantList([
    ...DEFAULT_BLOCKED_MERCHANTS,
    ...customBlockedMerchants,
  ]);

  return {
    defaultBlockedMerchants: [...DEFAULT_BLOCKED_MERCHANTS],
    customBlockedMerchants,
    allBlockedMerchants,
  };
}

export async function setCustomBlockedMerchants(input: string[]) {
  await ensureDynamicSiteConfigRow();

  const customBlockedMerchants = normalizeMerchantList(input).filter(
    (value) =>
      !DEFAULT_BLOCKED_MERCHANTS.some(
        (defaultValue) => defaultValue.toLowerCase() === value.toLowerCase()
      )
  );

  await prisma.dynamicSiteConfig.update({
    where: { key: DYNAMIC_SITE_CONFIG_KEY },
    data: {
      blockedMerchants: customBlockedMerchants,
    },
  });

  return getBlockedMerchantsConfig();
}

export async function getBlockedMerchantMatcher() {
  const config = await getBlockedMerchantsConfig();
  return buildBlockedMerchantMatcher(config.allBlockedMerchants);
}

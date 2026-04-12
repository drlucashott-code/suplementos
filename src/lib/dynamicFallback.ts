import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DYNAMIC_SITE_CONFIG_KEY = "global";
const DEFAULT_MAX_AGE_HOURS = 24;
const DEFAULT_AUTO_FAILED_PRODUCTS_THRESHOLD = 20;
const AUTO_FAILURE_RATE_THRESHOLD = (() => {
  const parsed = Number(
    process.env.DYNAMIC_FALLBACK_AUTO_FAILURE_RATE_THRESHOLD ?? "0.6"
  );
  if (!Number.isFinite(parsed)) return 0.6;
  return Math.min(Math.max(parsed, 0.1), 1);
})();

type DynamicSiteConfigRow = {
  fallbackEnabled: boolean;
  fallbackManualEnabled: boolean;
  fallbackAutoEnabled: boolean;
  fallbackAutoFailedProductsThreshold: number;
  fallbackSource: string | null;
  fallbackMaxAgeHours: number;
  fallbackReason: string | null;
  fallbackActivatedAt: Date | null;
};

type GlobalRefreshRunRow = {
  status: string;
  totalOffers: number;
  updatedOffers: number;
  failedOffers: number;
  outOfStockOffers: number;
  maxConsecutiveFailedOffers: number;
};

export type DynamicFallbackConfig = {
  fallbackEnabled: boolean;
  fallbackManualEnabled: boolean;
  fallbackAutoEnabled: boolean;
  fallbackAutoFailedProductsThreshold: number;
  fallbackSource: string | null;
  fallbackMaxAgeHours: number;
  fallbackReason: string | null;
  fallbackActivatedAt: Date | null;
};

export type DynamicProductFallbackState = {
  lastValidPrice: number | null;
  lastValidPriceAt: Date | null;
  availabilityStatus: string | null;
};

function getDefaultConfig(): DynamicFallbackConfig {
  return {
    fallbackEnabled: false,
    fallbackManualEnabled: false,
    fallbackAutoEnabled: true,
    fallbackAutoFailedProductsThreshold:
      DEFAULT_AUTO_FAILED_PRODUCTS_THRESHOLD,
    fallbackSource: null,
    fallbackMaxAgeHours: DEFAULT_MAX_AGE_HOURS,
    fallbackReason: null,
    fallbackActivatedAt: null,
  };
}

async function ensureDynamicFallbackConfigRow() {
  await prisma.$executeRaw`
    INSERT INTO "DynamicSiteConfig" (
      "key",
      "fallbackEnabled",
      "fallbackManualEnabled",
      "fallbackAutoEnabled",
      "fallbackAutoFailedProductsThreshold",
      "fallbackSource",
      "fallbackMaxAgeHours",
      "fallbackReason",
      "fallbackActivatedAt",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${DYNAMIC_SITE_CONFIG_KEY},
      false,
      false,
      true,
      ${DEFAULT_AUTO_FAILED_PRODUCTS_THRESHOLD},
      NULL,
      ${DEFAULT_MAX_AGE_HOURS},
      NULL,
      NULL,
      NOW(),
      NOW()
    )
    ON CONFLICT ("key") DO NOTHING
  `;
}

export async function getDynamicFallbackConfig(): Promise<DynamicFallbackConfig> {
  const rows = await prisma.$queryRaw<DynamicSiteConfigRow[]>(Prisma.sql`
    SELECT
      "fallbackEnabled",
      "fallbackManualEnabled",
      "fallbackAutoEnabled",
      "fallbackAutoFailedProductsThreshold",
      "fallbackSource",
      "fallbackMaxAgeHours",
      "fallbackReason",
      "fallbackActivatedAt"
    FROM "DynamicSiteConfig"
    WHERE "key" = ${DYNAMIC_SITE_CONFIG_KEY}
    LIMIT 1
  `);

  const row = rows[0];
  const defaults = getDefaultConfig();

  return {
    fallbackEnabled: row?.fallbackEnabled ?? defaults.fallbackEnabled,
    fallbackManualEnabled:
      row?.fallbackManualEnabled ?? defaults.fallbackManualEnabled,
    fallbackAutoEnabled: row?.fallbackAutoEnabled ?? defaults.fallbackAutoEnabled,
    fallbackAutoFailedProductsThreshold:
      row?.fallbackAutoFailedProductsThreshold ??
      defaults.fallbackAutoFailedProductsThreshold,
    fallbackSource: row?.fallbackSource ?? defaults.fallbackSource,
    fallbackMaxAgeHours:
      row?.fallbackMaxAgeHours ?? defaults.fallbackMaxAgeHours,
    fallbackReason: row?.fallbackReason ?? defaults.fallbackReason,
    fallbackActivatedAt:
      row?.fallbackActivatedAt ?? defaults.fallbackActivatedAt,
  };
}

async function sendDynamicFallbackAlert(params: {
  enabled: boolean;
  source: string | null;
  reason: string | null;
  threshold: number;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FALLBACK_ALERT_EMAIL_TO;
  if (!apiKey || !to) {
    return;
  }

  const from =
    process.env.FALLBACK_ALERT_EMAIL_FROM ?? "onboarding@resend.dev";
  const subject = params.enabled
    ? "[amazonpicks] Fallback ativado"
    : "[amazonpicks] Fallback desativado";
  const bodyLines = [
    `Status: ${params.enabled ? "ativado" : "desativado"}`,
    `Origem: ${params.source ?? "nenhuma"}`,
    `Motivo: ${params.reason ?? "nao informado"}`,
    `Horario: ${new Date().toLocaleString("pt-BR")}`,
        `Threshold automatico: ${params.threshold} falhas consecutivas no update global`,
  ];

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: to.split(",").map((value) => value.trim()).filter(Boolean),
        subject,
        text: bodyLines.join("\n"),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Falha ao enviar alerta de fallback:", errorText);
    }
  } catch (error) {
    console.error("Erro ao enviar email de fallback:", error);
  }
}

async function getAutoFallbackDecision(threshold: number) {
  const latestRuns = await prisma.$queryRaw<GlobalRefreshRunRow[]>(Prisma.sql`
    SELECT
      "status",
      "totalOffers",
      "updatedOffers",
      "failedOffers",
      "outOfStockOffers",
      "maxConsecutiveFailedOffers"
    FROM "GlobalPriceRefreshRun"
    ORDER BY "startedAt" DESC
    LIMIT 1
  `);

  const latestRun = latestRuns[0];
  const normalizedThreshold = Math.max(threshold, 1);
  if (!latestRun) {
    return { active: false, reason: null };
  }

  const totalOffers = Number(latestRun.totalOffers ?? 0);
  const updatedOffers = Number(latestRun.updatedOffers ?? 0);
  const failedOffers = Number(latestRun.failedOffers ?? 0);
  const outOfStockOffers = Number(latestRun.outOfStockOffers ?? 0);
  const maxConsecutiveFailedOffers = Number(
    latestRun.maxConsecutiveFailedOffers ?? 0
  );
  const failedRate = totalOffers > 0 ? failedOffers / totalOffers : 0;

  const activeByStatus = latestRun.status === "error";
  const activeByStreak = maxConsecutiveFailedOffers >= normalizedThreshold;
  const activeByFailureRate =
    totalOffers > 0 &&
    failedRate >= AUTO_FAILURE_RATE_THRESHOLD &&
    failedOffers >= normalizedThreshold;
  const active = activeByStatus || activeByStreak || activeByFailureRate;

  if (!active) {
    return { active: false, reason: null };
  }

  if (activeByStatus) {
    return {
      active: true,
      reason: `Falha geral detectada: update global terminou com status=error (atualizados ${updatedOffers}/${totalOffers}, falhas ${failedOffers}, sem estoque ${outOfStockOffers}).`,
    };
  }

  if (activeByStreak) {
    return {
      active: true,
      reason: `Falha geral detectada: update global registrou streak de ${maxConsecutiveFailedOffers} falhas consecutivas (atualizados ${updatedOffers}/${totalOffers}, falhas ${failedOffers}, sem estoque ${outOfStockOffers}).`,
    };
  }

  return {
    active: true,
    reason: `Falha geral detectada: taxa de falha ${Math.round(
      failedRate * 100
    )}% no update global (atualizados ${updatedOffers}/${totalOffers}, falhas ${failedOffers}, sem estoque ${outOfStockOffers}).`,
  };
}

export async function reconcileDynamicFallbackState() {
  await ensureDynamicFallbackConfigRow();

  const current = await getDynamicFallbackConfig();
  const autoDecision = current.fallbackAutoEnabled
    ? await getAutoFallbackDecision(
        current.fallbackAutoFailedProductsThreshold
      )
    : { active: false, reason: null };

  const nextEnabled = current.fallbackManualEnabled || autoDecision.active;
  const nextSource = current.fallbackManualEnabled
    ? "manual"
    : autoDecision.active
      ? "automatic"
      : null;
  const nextReason = current.fallbackManualEnabled
    ? current.fallbackReason || "Ativacao manual pelo admin."
    : autoDecision.reason;

  const enabledChanged = current.fallbackEnabled !== nextEnabled;

  await prisma.$executeRaw`
    UPDATE "DynamicSiteConfig"
    SET
      "fallbackEnabled" = ${nextEnabled},
      "fallbackSource" = ${nextSource},
      "fallbackReason" = ${nextReason},
      "fallbackActivatedAt" = CASE
        WHEN ${nextEnabled} = true AND "fallbackEnabled" = false THEN NOW()
        WHEN ${nextEnabled} = false THEN NULL
        ELSE "fallbackActivatedAt"
      END,
      "updatedAt" = NOW()
    WHERE "key" = ${DYNAMIC_SITE_CONFIG_KEY}
  `;

  if (enabledChanged) {
    await sendDynamicFallbackAlert({
      enabled: nextEnabled,
      source: nextSource,
      reason: nextReason,
      threshold: current.fallbackAutoFailedProductsThreshold,
    });
  }
}

export async function upsertDynamicFallbackConfig(input: {
  fallbackManualEnabled: boolean;
  fallbackAutoEnabled: boolean;
  fallbackAutoFailedProductsThreshold: number;
  fallbackMaxAgeHours: number;
  fallbackReason?: string | null;
}) {
  await ensureDynamicFallbackConfigRow();

  const fallbackReason = input.fallbackReason?.trim() || null;
  const fallbackAutoFailedProductsThreshold = Math.max(
    1,
    Math.round(input.fallbackAutoFailedProductsThreshold)
  );
  const fallbackMaxAgeHours = Math.max(1, Math.round(input.fallbackMaxAgeHours));

  await prisma.$executeRaw`
    UPDATE "DynamicSiteConfig"
    SET
      "fallbackManualEnabled" = ${input.fallbackManualEnabled},
      "fallbackAutoEnabled" = ${input.fallbackAutoEnabled},
      "fallbackAutoFailedProductsThreshold" = ${fallbackAutoFailedProductsThreshold},
      "fallbackMaxAgeHours" = ${fallbackMaxAgeHours},
      "fallbackReason" = ${fallbackReason},
      "updatedAt" = NOW()
    WHERE "key" = ${DYNAMIC_SITE_CONFIG_KEY}
  `;

  await reconcileDynamicFallbackState();
}

export function shouldUseDynamicFallbackPrice(params: {
  currentPrice: number;
  fallbackState?: DynamicProductFallbackState | null;
  config: DynamicFallbackConfig;
  now?: Date;
}) {
  const { currentPrice, fallbackState, config } = params;
  const now = params.now ?? new Date();

  if (!config.fallbackEnabled || currentPrice > 0 || !fallbackState) {
    return false;
  }

  if (
    !fallbackState.lastValidPrice ||
    fallbackState.lastValidPrice <= 0
  ) {
    return false;
  }

  if ((fallbackState.availabilityStatus ?? "UNKNOWN") === "OUT_OF_STOCK") {
    return false;
  }

  const isAutomaticCrashFallback = config.fallbackSource === "automatic";
  if (isAutomaticCrashFallback) {
    return true;
  }

  if (!fallbackState.lastValidPriceAt) {
    return false;
  }

  const ageMs =
    now.getTime() - new Date(fallbackState.lastValidPriceAt).getTime();
  const maxAgeMs = Math.max(config.fallbackMaxAgeHours, 1) * 60 * 60 * 1000;

  return ageMs <= maxAgeMs;
}

export function getDynamicDisplayPrice(params: {
  currentPrice: number;
  fallbackState?: DynamicProductFallbackState | null;
  config: DynamicFallbackConfig;
  now?: Date;
}) {
  if (shouldUseDynamicFallbackPrice(params)) {
    return params.fallbackState?.lastValidPrice ?? 0;
  }

  return params.currentPrice;
}

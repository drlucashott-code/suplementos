import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const DYNAMIC_SITE_CONFIG_KEY = "global";

type DynamicClickAlertConfigRow = {
  clickEmailAlertsEnabled: boolean;
  clickAlertEmailTo: string | null;
};

export type DynamicClickAlertConfig = {
  clickEmailAlertsEnabled: boolean;
  clickAlertEmailTo: string | null;
};

function getDefaultClickAlertConfig(): DynamicClickAlertConfig {
  return {
    clickEmailAlertsEnabled: false,
    clickAlertEmailTo: process.env.CLICK_ALERT_EMAIL_TO ?? process.env.FALLBACK_ALERT_EMAIL_TO ?? null,
  };
}

async function ensureDynamicClickAlertConfigRow() {
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
      "clickEmailAlertsEnabled",
      "clickAlertEmailTo",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${DYNAMIC_SITE_CONFIG_KEY},
      false,
      false,
      true,
      20,
      NULL,
      24,
      NULL,
      NULL,
      false,
      ${process.env.CLICK_ALERT_EMAIL_TO ?? process.env.FALLBACK_ALERT_EMAIL_TO ?? null},
      NOW(),
      NOW()
    )
    ON CONFLICT ("key") DO NOTHING
  `;
}

export async function getDynamicClickAlertConfig(): Promise<DynamicClickAlertConfig> {
  await ensureDynamicClickAlertConfigRow();

  const rows = await prisma.$queryRaw<DynamicClickAlertConfigRow[]>(Prisma.sql`
    SELECT
      "clickEmailAlertsEnabled",
      "clickAlertEmailTo"
    FROM "DynamicSiteConfig"
    WHERE "key" = ${DYNAMIC_SITE_CONFIG_KEY}
    LIMIT 1
  `);

  const row = rows[0];
  const defaults = getDefaultClickAlertConfig();

  return {
    clickEmailAlertsEnabled:
      row?.clickEmailAlertsEnabled ?? defaults.clickEmailAlertsEnabled,
    clickAlertEmailTo: row?.clickAlertEmailTo ?? defaults.clickAlertEmailTo,
  };
}

export async function updateDynamicClickAlertConfig(input: {
  clickEmailAlertsEnabled: boolean;
}) {
  await ensureDynamicClickAlertConfigRow();

  const emailTo =
    process.env.CLICK_ALERT_EMAIL_TO ?? process.env.FALLBACK_ALERT_EMAIL_TO ?? null;

  await prisma.$executeRaw`
    UPDATE "DynamicSiteConfig"
    SET
      "clickEmailAlertsEnabled" = ${input.clickEmailAlertsEnabled},
      "clickAlertEmailTo" = COALESCE("clickAlertEmailTo", ${emailTo}),
      "updatedAt" = NOW()
    WHERE "key" = ${DYNAMIC_SITE_CONFIG_KEY}
  `;
}

export async function sendDynamicClickAlertEmail(params: {
  asin: string;
  productName: string;
  categoryName?: string | null;
  pagePath?: string | null;
  source?: string | null;
  productUrl?: string | null;
}) {
  const config = await getDynamicClickAlertConfig();
  const apiKey = process.env.RESEND_API_KEY;
  const to = config.clickAlertEmailTo;

  if (!config.clickEmailAlertsEnabled || !apiKey || !to) {
    return;
  }

  const from =
    process.env.CLICK_ALERT_EMAIL_FROM ??
    process.env.FALLBACK_ALERT_EMAIL_FROM ??
    "onboarding@resend.dev";

  const subject = `[amazonpicks] Clique em produto: ${params.productName}`;
  const lines = [
    `Produto: ${params.productName}`,
    `ASIN: ${params.asin}`,
    `Categoria: ${params.categoryName ?? "nao informada"}`,
    `Origem: ${params.source ?? "direto"}`,
    `Pagina: ${params.pagePath ?? "-"}`,
    `Horario: ${new Date().toLocaleString("pt-BR")}`,
    `Link: ${params.productUrl ?? "-"}`,
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
        text: lines.join("\n"),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Falha ao enviar alerta de clique:", errorText);
    }
  } catch (error) {
    console.error("Erro ao enviar email de clique:", error);
  }
}

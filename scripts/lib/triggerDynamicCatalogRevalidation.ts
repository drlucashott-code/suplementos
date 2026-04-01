import "dotenv/config";
import {
  dedupeDynamicCatalogCategoryRefs,
  type DynamicCatalogCategoryRef,
} from "../../src/lib/dynamicCatalogCache";

function getRevalidationBaseUrl() {
  const explicit =
    process.env.APP_BASE_URL ||
    process.env.SITE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    "";

  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "";
}

function getRevalidationSecret() {
  return process.env.INTERNAL_REVALIDATE_SECRET || process.env.CRON_SECRET || "";
}

export async function triggerDynamicCatalogRevalidationFromScript(
  refs: DynamicCatalogCategoryRef[],
  source: string
) {
  const dedupedRefs = dedupeDynamicCatalogCategoryRefs(refs);
  if (dedupedRefs.length === 0) {
    return { ok: true, skipped: true, reason: "no_refs" as const };
  }

  const baseUrl = getRevalidationBaseUrl();
  const secret = getRevalidationSecret();

  if (!baseUrl || !secret) {
    return {
      ok: true,
      skipped: true,
      reason: "missing_base_url_or_secret" as const,
    };
  }

  const response = await fetch(`${baseUrl}/api/internal/revalidate-dynamic-catalog`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({
      refs: dedupedRefs,
      source,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Falha ao revalidar catalogo dinamico remotamente (${response.status}): ${body}`
    );
  }

  return { ok: true, skipped: false, count: dedupedRefs.length };
}

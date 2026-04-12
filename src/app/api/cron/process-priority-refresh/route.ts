import { NextRequest, NextResponse } from "next/server";
import { processPriorityRefreshQueue } from "@/lib/priorityRefreshProcessor";
import { revalidateDynamicCatalogCategoryRefs } from "@/lib/dynamicCatalogRevalidation";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const envSnapshot = {
      provider: process.env.AMAZON_API_PROVIDER ?? null,
      hasCreatorsId: Boolean(process.env.AMAZON_CREATORS_CREDENTIAL_ID),
      hasCreatorsSecret: Boolean(process.env.AMAZON_CREATORS_CREDENTIAL_SECRET),
      hasQueueUrl: Boolean(
        process.env.AWS_PRIORITY_QUEUE_URL || process.env.AWS_QUEUE_URL
      ),
      region: process.env.AWS_REGION ?? null,
    };
    console.log("[priority-cron] env", envSnapshot);

    const summary = await processPriorityRefreshQueue();
    revalidateDynamicCatalogCategoryRefs(summary.updatedCategoryRefs);
    const includeDebug = request.nextUrl.searchParams.get("debug") === "1";
    return NextResponse.json({
      ok: true,
      summary,
      ...(includeDebug ? { env: envSnapshot } : {}),
    });
  } catch (error) {
    console.error("Erro ao processar cron de fila prioritaria:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "priority_refresh_failed",
        detail: error instanceof Error ? error.message : "erro desconhecido",
      },
      { status: 500 }
    );
  }
}

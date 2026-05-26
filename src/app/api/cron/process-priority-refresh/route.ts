import { NextRequest, NextResponse } from "next/server";
// debug helpers removed
import { processPriorityRefreshQueueV2 } from "@/lib/priorityRefreshProcessorV2";
import { revalidateDynamicCatalogCategoryRefs } from "@/lib/dynamicCatalogRevalidation";
import { syncOfferMaxPriorityRefreshTargets } from "@/lib/maxPriorityRefresh";
import { getPriorityRefreshQueueSnapshot } from "@/lib/priorityRefreshQueue";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const PRIORITY_CRON_MIN_INTERVAL_MINUTES = Math.max(
  5,
  Number(process.env.PRIORITY_CRON_MIN_INTERVAL_MINUTES ?? 5)
);
const MAX_PRIORITY_SYNC_INTERVAL_MINUTES = Math.max(
  PRIORITY_CRON_MIN_INTERVAL_MINUTES,
  Number(process.env.MAX_PRIORITY_SYNC_INTERVAL_MINUTES ?? 60)
);

function shouldRunWindow(now: Date, everyMinutes: number) {
  const forceRun = process.env.PRIORITY_CRON_FORCE_EVERY_RUN === "1";
  if (forceRun) return true;

  const minute = now.getUTCMinutes();
  return minute % everyMinutes === 0;
}

function shouldRunPriorityCron(now: Date) {
  return shouldRunWindow(now, PRIORITY_CRON_MIN_INTERVAL_MINUTES);
}

function shouldRunMaxPrioritySync(now: Date) {
  return shouldRunWindow(now, MAX_PRIORITY_SYNC_INTERVAL_MINUTES);
}

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

  if (!shouldRunPriorityCron(new Date())) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "outside_processing_window",
      minIntervalMinutes: PRIORITY_CRON_MIN_INTERVAL_MINUTES,
    });
  }

  try {
    const now = new Date();
    const queueSnapshot = await getPriorityRefreshQueueSnapshot();
    const hasQueuedWork = queueSnapshot.visibleMessages + queueSnapshot.delayedMessages > 0;
    const shouldSyncOfferMaxPriority = shouldRunMaxPrioritySync(now);

    if (!hasQueuedWork && !shouldSyncOfferMaxPriority) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "no_queued_work",
        minIntervalMinutes: PRIORITY_CRON_MIN_INTERVAL_MINUTES,
        offerMaxPrioritySyncIntervalMinutes: MAX_PRIORITY_SYNC_INTERVAL_MINUTES,
        queueSnapshot,
      });
    }

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

    const includeDebug = request.nextUrl.searchParams.get("debug") === "1";
    const offerMaxPrioritySummary = shouldSyncOfferMaxPriority
      ? await syncOfferMaxPriorityRefreshTargets()
      : null;

    if (!hasQueuedWork) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "priority_sync_completed_without_queue_work",
        offerMaxPrioritySummary,
        queueSnapshot,
        ...(includeDebug ? { env: envSnapshot } : {}),
      });
    }

    const summary = await processPriorityRefreshQueueV2({ debug: includeDebug });
    revalidateDynamicCatalogCategoryRefs(summary.updatedCategoryRefs);
    return NextResponse.json({
      ok: true,
      offerMaxPrioritySummary,
      queueSnapshot,
      summary,
      ...(includeDebug ? { env: envSnapshot, debug: summary.debug ?? null } : {}),
    });
  } catch (error) {
    console.error("Erro ao processar cron de fila prioritaria:", error);
    const includeDebug = request.nextUrl.searchParams.get("debug") === "1";

    return NextResponse.json(
      {
        ok: false,
        error: "priority_refresh_failed",
        detail:
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : JSON.stringify(error),
        ...(includeDebug
          ? {
              env: {
                provider: process.env.AMAZON_API_PROVIDER ?? null,
                hasCreatorsId: Boolean(process.env.AMAZON_CREATORS_CREDENTIAL_ID),
                hasCreatorsSecret: Boolean(process.env.AMAZON_CREATORS_CREDENTIAL_SECRET),
                hasQueueUrl: Boolean(
                  process.env.AWS_PRIORITY_QUEUE_URL || process.env.AWS_QUEUE_URL
                ),
                region: process.env.AWS_REGION ?? null,
              },
            }
          : {}),
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { syncMaxPriorityRefreshTargets } from "@/lib/maxPriorityRefresh";

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
    const summary = await syncMaxPriorityRefreshTargets();
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    console.error("Erro ao sincronizar prioridade maxima:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "max_priority_sync_failed",
        detail:
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : JSON.stringify(error),
      },
      { status: 500 }
    );
  }
}

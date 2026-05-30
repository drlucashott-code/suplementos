import { NextRequest, NextResponse } from "next/server";
import { syncMaxPriorityRefreshTargets } from "@/lib/maxPriorityRefresh";
import { isAuthorizedCronRequest } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: NextRequest) {
  return isAuthorizedCronRequest(request, process.env.CRON_SECRET);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const scopeParam = request.nextUrl.searchParams.get("scope");
    const scope = scopeParam === "offers" || scopeParam === "all" ? scopeParam : "all";
    const summary = await syncMaxPriorityRefreshTargets(scope);
    return NextResponse.json({ ok: true, scope, summary });
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

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
    const summary = await processPriorityRefreshQueue();
    revalidateDynamicCatalogCategoryRefs(summary.updatedCategoryRefs);
    return NextResponse.json({
      ok: true,
      summary,
    });
  } catch (error) {
    console.error("Erro ao processar cron de fila prioritaria:", error);

    return NextResponse.json(
      { ok: false, error: "priority_refresh_failed" },
      { status: 500 }
    );
  }
}

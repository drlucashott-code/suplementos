import { NextRequest, NextResponse } from "next/server";
import { enqueuePriorityRefresh } from "@/lib/priorityRefreshQueue";

const ASIN_PATTERN = /^[A-Z0-9]{10}$/;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      asin?: string;
      reason?: "click" | "admin" | "system";
    };

    const asin = body.asin?.trim().toUpperCase() || "";

    if (!ASIN_PATTERN.test(asin)) {
      return NextResponse.json(
        { ok: false, error: "invalid_asin" },
        { status: 400 }
      );
    }

    const result = await enqueuePriorityRefresh({
      asin,
      reason: body.reason ?? "click",
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Erro ao enfileirar atualizacao prioritaria:", error);

    return NextResponse.json(
      { ok: false, error: "queue_failed" },
      { status: 500 }
    );
  }
}

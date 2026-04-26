import { NextResponse } from "next/server";
import { verifySiteUserEmail } from "@/lib/siteAuth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const result = await verifySiteUserEmail(body.token ?? "");

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("verify_email_failed", error);
    return NextResponse.json({ ok: false, error: "verify_email_failed" }, { status: 500 });
  }
}

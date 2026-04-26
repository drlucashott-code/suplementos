import { NextResponse } from "next/server";
import { sendSitePasswordReset } from "@/lib/siteAuth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const result = await sendSitePasswordReset(body.email ?? "");

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("forgot_password_failed", error);
    return NextResponse.json({ ok: false, error: "forgot_password_failed" }, { status: 500 });
  }
}

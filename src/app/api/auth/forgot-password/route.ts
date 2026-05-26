import { NextResponse } from "next/server";
import { sendSitePasswordReset } from "@/lib/siteAuth";
import { assertAuthRateLimit } from "@/lib/authRateLimit";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };

    const rateLimited = await assertAuthRateLimit({
      request,
      action: "forgot_password",
      email: body.email ?? "",
    });

    if (rateLimited) {
      return rateLimited;
    }

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

import { NextResponse } from "next/server";
import { resendSiteVerificationEmail } from "@/lib/siteAuth";
import { assertAuthRateLimit } from "@/lib/authRateLimit";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };

    const rateLimited = await assertAuthRateLimit({
      request,
      action: "resend_verification",
      email: body.email ?? "",
    });

    if (rateLimited) {
      return rateLimited;
    }

    const result = await resendSiteVerificationEmail(body.email ?? "");

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("resend_verification_failed", error);
    return NextResponse.json(
      { ok: false, error: "resend_verification_failed" },
      { status: 500 }
    );
  }
}

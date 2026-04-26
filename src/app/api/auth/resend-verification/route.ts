import { NextResponse } from "next/server";
import { resendSiteVerificationEmail } from "@/lib/siteAuth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
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

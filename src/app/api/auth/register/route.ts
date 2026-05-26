import { NextResponse } from "next/server";
import { registerSiteUser } from "@/lib/siteAuth";
import { assertAuthRateLimit } from "@/lib/authRateLimit";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
      username?: string;
    };

    const rateLimited = await assertAuthRateLimit({
      request,
      action: "register",
      email: body.email ?? "",
    });

    if (rateLimited) {
      return rateLimited;
    }

    const result = await registerSiteUser({
      email: body.email ?? "",
      password: body.password ?? "",
      displayName: body.displayName ?? "",
      username: body.username ?? "",
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      user: result.user,
      pendingVerification: result.pendingVerification,
      emailSent: result.emailSent,
    });
  } catch (error) {
    console.error("register_failed", error);
    return NextResponse.json({ ok: false, error: "register_failed" }, { status: 500 });
  }
}

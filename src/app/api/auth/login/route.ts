import { NextResponse } from "next/server";
import { loginSiteUser } from "@/lib/siteAuth";
import { assertAuthRateLimit } from "@/lib/authRateLimit";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const rateLimited = await assertAuthRateLimit({
      request,
      action: "login",
      email: body.email ?? "",
    });

    if (rateLimited) {
      return rateLimited;
    }

    const result = await loginSiteUser({
      email: body.email ?? "",
      password: body.password ?? "",
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      user: result.user,
      pendingVerification: result.pendingVerification ?? false,
    });
  } catch (error) {
    console.error("login_failed", error);
    return NextResponse.json({ ok: false, error: "login_failed" }, { status: 500 });
  }
}

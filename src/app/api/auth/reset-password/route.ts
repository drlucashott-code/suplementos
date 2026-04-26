import { NextResponse } from "next/server";
import { resetSitePassword } from "@/lib/siteAuth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string; password?: string };
    const result = await resetSitePassword({
      token: body.token ?? "",
      password: body.password ?? "",
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("reset_password_failed", error);
    return NextResponse.json({ ok: false, error: "reset_password_failed" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { registerSiteUser } from "@/lib/siteAuth";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
    };

    const result = await registerSiteUser({
      email: body.email ?? "",
      password: body.password ?? "",
      displayName: body.displayName ?? "",
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, user: result.user });
  } catch (error) {
    console.error("register_failed", error);
    return NextResponse.json({ ok: false, error: "register_failed" }, { status: 500 });
  }
}

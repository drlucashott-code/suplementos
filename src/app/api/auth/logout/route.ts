import { NextResponse } from "next/server";
import { logoutSiteUser } from "@/lib/siteAuth";

export async function POST() {
  try {
    await logoutSiteUser();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("logout_failed", error);
    return NextResponse.json({ ok: false, error: "logout_failed" }, { status: 500 });
  }
}

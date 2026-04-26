import { NextResponse } from "next/server";
import { getCurrentSiteUser, updateSiteUserProfile } from "@/lib/siteAuth";

export async function PATCH(request: Request) {
  const user = await getCurrentSiteUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      displayName?: string;
      username?: string;
      email?: string;
      avatarUrl?: string | null;
    };

    const result = await updateSiteUserProfile({
      userId: user.id,
      displayName: body.displayName ?? "",
      username: body.username ?? "",
      email: body.email ?? "",
      avatarUrl: body.avatarUrl ?? null,
    });

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, user: result.user });
  } catch (error) {
    console.error("account_profile_update_failed", error);
    return NextResponse.json(
      { ok: false, error: "account_profile_update_failed" },
      { status: 500 }
    );
  }
}

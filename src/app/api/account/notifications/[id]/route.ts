import { NextResponse } from "next/server";
import { getCurrentSiteUser } from "@/lib/siteAuth";
import { markNotificationClicked, markNotificationRead } from "@/lib/siteNotifications";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  await Promise.all([markNotificationClicked(user.id, id), markNotificationRead(user.id, id)]);

  return NextResponse.json({ ok: true });
}

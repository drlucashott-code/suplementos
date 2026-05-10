import { NextResponse } from "next/server";
import { getCurrentSiteUser } from "@/lib/siteAuth";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notifications/preferences";
import type { NotificationPreferencesState } from "@/lib/notifications/types";

export async function GET() {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const preferences = await getNotificationPreferences(user.id);
  return NextResponse.json({ ok: true, preferences });
}

export async function PUT(request: Request) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<NotificationPreferencesState>;

  const preferences = await updateNotificationPreferences(user.id, body);

  return NextResponse.json({ ok: true, preferences });
}

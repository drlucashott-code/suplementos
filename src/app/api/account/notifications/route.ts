import { NextResponse } from "next/server";
import { getCurrentSiteUser } from "@/lib/siteAuth";
import {
  getSiteNotifications,
  markAllNotificationsRead,
  syncFavoriteNotifications,
} from "@/lib/siteNotifications";

export async function GET() {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  await syncFavoriteNotifications(user.id);
  const notifications = await getSiteNotifications(user.id);
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return NextResponse.json({ ok: true, notifications, unreadCount });
}

export async function PATCH() {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  await markAllNotificationsRead(user.id);
  return NextResponse.json({ ok: true });
}

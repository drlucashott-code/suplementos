import { NextResponse } from "next/server";
import { getCurrentSiteUser } from "@/lib/siteAuth";
import {
  clearNotifications,
  countUnreadNotifications,
  listSiteNotifications,
  markAllNotificationsRead,
} from "@/lib/siteNotifications";

export async function GET() {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const [page, unreadCount] = await Promise.all([
    listSiteNotifications({
      userId: user.id,
      limit: 20,
    }),
    countUnreadNotifications(user.id),
  ]);

  return NextResponse.json({
    ok: true,
    notifications: page.items,
    unreadCount,
    hasMore: page.hasMore,
    nextCursor: page.nextCursor,
  });
}

export async function PATCH() {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  await markAllNotificationsRead(user.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  await clearNotifications(user.id);
  return NextResponse.json({ ok: true });
}

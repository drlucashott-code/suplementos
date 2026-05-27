import { NextResponse } from "next/server";
import { getCurrentSiteUser } from "@/lib/siteAuth";
import {
  clearNotifications,
  countUnreadNotifications,
  listSiteNotifications,
  markAllNotificationsRead,
} from "@/lib/siteNotifications";

export async function GET(request: Request) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const summaryOnly = searchParams.get("summary") === "1";

  const unreadCount = await countUnreadNotifications(user.id);
  if (summaryOnly) {
    return NextResponse.json({
      ok: true,
      unreadCount,
    });
  }

  const page = await listSiteNotifications({
    userId: user.id,
    limit: 20,
  });

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

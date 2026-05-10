import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentSiteUser } from "@/lib/siteAuth";
import {
  canUseWebPush,
  deletePushSubscription,
  getPublicWebPushKey,
  savePushSubscription,
} from "@/lib/notifications/push";

export async function GET() {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const subscription = await prisma.siteUserPushSubscription.findFirst({
    where: {
      userId: user.id,
      revokedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return NextResponse.json({
    ok: true,
    publicKey: getPublicWebPushKey(),
    enabled: canUseWebPush(),
    hasSubscription: Boolean(subscription),
  });
}

export async function POST(request: Request) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    subscription?: {
      endpoint?: string;
      keys?: {
        p256dh?: string;
        auth?: string;
      };
    };
    userAgent?: string;
  };

  const endpoint = body.subscription?.endpoint?.trim() ?? "";
  const p256dh = body.subscription?.keys?.p256dh?.trim() ?? "";
  const auth = body.subscription?.keys?.auth?.trim() ?? "";

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ ok: false, error: "invalid_subscription" }, { status: 400 });
  }

  await savePushSubscription({
    userId: user.id,
    endpoint,
    p256dh,
    auth,
    userAgent: body.userAgent ?? request.headers.get("user-agent") ?? null,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentSiteUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { endpoint?: string };
  const endpoint = body.endpoint?.trim() ?? "";
  if (!endpoint) {
    return NextResponse.json({ ok: false, error: "invalid_endpoint" }, { status: 400 });
  }

  await deletePushSubscription({
    userId: user.id,
    endpoint,
  });

  return NextResponse.json({ ok: true });
}

import webpush from "web-push";
import { prisma } from "@/lib/prisma";

const publicKey =
  process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY ??
  process.env.WEB_PUSH_PUBLIC_KEY ??
  "";

const privateKey = process.env.WEB_PUSH_PRIVATE_KEY ?? "";
const subject =
  process.env.WEB_PUSH_SUBJECT ?? "mailto:notifications@amazonpicks.com.br";

let pushConfigured = false;

function ensurePushConfigured() {
  if (pushConfigured) return;
  if (!publicKey || !privateKey) return;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  pushConfigured = true;
}

export function getPublicWebPushKey() {
  return publicKey || null;
}

export function canUseWebPush() {
  return Boolean(publicKey && privateKey);
}

export async function savePushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}) {
  ensurePushConfigured();

  return prisma.siteUserPushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId: input.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent ?? null,
    },
    update: {
      userId: input.userId,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent ?? null,
      revokedAt: null,
    },
  });
}

export async function deletePushSubscription(input: {
  userId: string;
  endpoint: string;
}) {
  await prisma.siteUserPushSubscription.deleteMany({
    where: {
      userId: input.userId,
      endpoint: input.endpoint,
    },
  });
}

export async function sendPushToUser(input: {
  userId: string;
  title: string;
  body: string;
  href: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}) {
  ensurePushConfigured();

  if (!canUseWebPush()) {
    return { sent: false, reason: "push_not_configured" as const };
  }

  const subscriptions = await prisma.siteUserPushSubscription.findMany({
    where: {
      userId: input.userId,
      revokedAt: null,
    },
  });

  if (subscriptions.length === 0) {
    return { sent: false, reason: "no_subscriptions" as const };
  }

  const payload = JSON.stringify({
    title: input.title,
    body: input.body,
    href: input.href,
    icon: input.icon ?? "/icon-192.png",
    badge: input.badge ?? "/icon-192.png",
    tag: input.tag ?? input.href,
    data: input.data ?? {},
  });

  let sentCount = 0;
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload,
        { TTL: 60 }
      );
      sentCount += 1;
    } catch (error) {
      const statusCode = typeof error === "object" && error && "statusCode" in error
        ? Number((error as { statusCode?: unknown }).statusCode)
        : null;

      if (statusCode === 404 || statusCode === 410) {
        await prisma.siteUserPushSubscription.deleteMany({
          where: { endpoint: subscription.endpoint },
        });
      } else {
        console.error("notification_push_send_failed", error);
      }
    }
  }

  return { sent: sentCount > 0, sentCount };
}

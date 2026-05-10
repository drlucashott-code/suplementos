import type { Prisma } from "@prisma/client";

export type NotificationChannel = "central" | "push" | "email";

export type NotificationCategory = "social" | "product" | "list" | "system";

export type PriceAlertMode = "any" | "custom";

export type NotificationPreferenceKey =
  | "commentReplies"
  | "commentReactions"
  | "listComments"
  | "listFollows"
  | "mentions"
  | "priceDrops"
  | "backInStock";

export type NotificationPreferenceDeliveryState = {
  central: boolean;
  push: boolean;
  email: boolean;
};

export type NotificationPreferencesState = {
  activity: Record<NotificationPreferenceKey, NotificationPreferenceDeliveryState>;
  priceDropMode: PriceAlertMode;
  priceDropThreshold: number;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesState = {
  activity: {
    commentReplies: { central: true, push: false, email: false },
    commentReactions: { central: true, push: false, email: false },
    listComments: { central: true, push: false, email: false },
    listFollows: { central: true, push: false, email: false },
    mentions: { central: true, push: false, email: false },
    priceDrops: { central: true, push: false, email: false },
    backInStock: { central: true, push: false, email: false },
  },
  priceDropMode: "any",
  priceDropThreshold: 10,
};

export type SiteNotificationItem = {
  id: string;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string | null;
  href: string | null;
  isRead: boolean;
  createdAt: string;
  priority: number;
  groupedKey: string | null;
  clickedAt: string | null;
  actorUserId: string | null;
  targetUserId: string | null;
  targetProductId: string | null;
  targetListId: string | null;
  targetCommentId: string | null;
};

export type CreateSiteNotificationInput = {
  userId: string;
  type: string;
  category?: NotificationCategory;
  title: string;
  body?: string | null;
  href?: string | null;
  metadata?: Prisma.InputJsonValue;
  priority?: number;
  groupedKey?: string | null;
  actorUserId?: string | null;
  targetUserId?: string | null;
  targetProductId?: string | null;
  targetListId?: string | null;
  targetCommentId?: string | null;
};

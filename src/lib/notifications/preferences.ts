import { prisma } from "@/lib/prisma";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationChannel,
  type NotificationPreferenceKey,
  type NotificationPreferencesState,
} from "@/lib/notifications/types";

const NOTIFICATION_TYPE_TO_KEY: Record<string, NotificationPreferenceKey> = {
  comment_replied: "commentReplies",
  list_comment_replied: "listComments",
  comment_liked: "commentReactions",
  list_comment_liked: "commentReactions",
  list_comment: "listComments",
  list_followed: "listFollows",
  mention: "mentions",
  comment_mentioned: "mentions",
  favorite_price_drop: "priceDrops",
  monitored_price_drop: "priceDrops",
  composite_price_stock: "backInStock",
  favorite_back_in_stock: "backInStock",
  monitored_back_in_stock: "backInStock",
};

const NOTIFICATION_TYPE_TO_KEYS: Record<string, NotificationPreferenceKey[]> = {
  comment_replied: ["commentReplies"],
  list_comment_replied: ["listComments"],
  comment_liked: ["commentReactions"],
  list_comment_liked: ["commentReactions"],
  list_comment: ["listComments"],
  list_followed: ["listFollows"],
  mention: ["mentions"],
  comment_mentioned: ["mentions"],
  favorite_price_drop: ["priceDrops"],
  monitored_price_drop: ["priceDrops"],
  composite_price_stock: ["priceDrops", "backInStock"],
  favorite_back_in_stock: ["backInStock"],
  monitored_back_in_stock: ["backInStock"],
};

function normalizePriceAlertMode(value: unknown): "any" | "custom" {
  return value === "custom" ? "custom" : "any";
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function buildLegacyPreferenceFlags(state: NotificationPreferencesState) {
  const anyCentral = Object.values(state.activity).some((entry) => entry.central);
  const anyPush = Object.values(state.activity).some((entry) => entry.push);
  const anyEmail = Object.values(state.activity).some((entry) => entry.email);

  return {
    commentsEnabled:
      state.activity.commentReplies.central ||
      state.activity.commentReactions.central ||
      state.activity.listComments.central,
    mentionsEnabled: state.activity.mentions.central,
    reactionsEnabled:
      state.activity.commentReactions.central || state.activity.listComments.central,
    followersEnabled: state.activity.listFollows.central,
    priceDropEnabled: state.activity.priceDrops.central,
    stockReturnEnabled: state.activity.backInStock.central,
    centralEnabled: anyCentral,
    pushEnabled: anyPush,
    emailEnabled: anyEmail,
  };
}

function buildPreferenceRowData(userId: string, state: NotificationPreferencesState) {
  return {
    userId,
    ...buildLegacyPreferenceFlags(state),
    commentRepliesCentralEnabled: state.activity.commentReplies.central,
    commentRepliesPushEnabled: state.activity.commentReplies.push,
    commentRepliesEmailEnabled: state.activity.commentReplies.email,
    commentReactionsCentralEnabled: state.activity.commentReactions.central,
    commentReactionsPushEnabled: state.activity.commentReactions.push,
    commentReactionsEmailEnabled: state.activity.commentReactions.email,
    listCommentsCentralEnabled: state.activity.listComments.central,
    listCommentsPushEnabled: state.activity.listComments.push,
    listCommentsEmailEnabled: state.activity.listComments.email,
    listFollowsCentralEnabled: state.activity.listFollows.central,
    listFollowsPushEnabled: state.activity.listFollows.push,
    listFollowsEmailEnabled: state.activity.listFollows.email,
    mentionsCentralEnabled: state.activity.mentions.central,
    mentionsPushEnabled: state.activity.mentions.push,
    mentionsEmailEnabled: state.activity.mentions.email,
    priceDropsCentralEnabled: state.activity.priceDrops.central,
    priceDropsPushEnabled: state.activity.priceDrops.push,
    priceDropsEmailEnabled: state.activity.priceDrops.email,
    backInStockCentralEnabled: state.activity.backInStock.central,
    backInStockPushEnabled: state.activity.backInStock.push,
    backInStockEmailEnabled: state.activity.backInStock.email,
    priceAlertMode: state.priceDropMode,
    priceAlertPercentage: state.priceDropThreshold,
  };
}

function normalizePreferencesRow(
  row:
    | (Record<string, unknown> & Partial<NotificationPreferencesState>)
    | null
    | undefined
): NotificationPreferencesState {
  if (!row) {
    return DEFAULT_NOTIFICATION_PREFERENCES;
  }

  const activity = DEFAULT_NOTIFICATION_PREFERENCES.activity;
  return {
    activity: {
      commentReplies: {
        central: normalizeBoolean(
          row.commentRepliesCentralEnabled,
          activity.commentReplies.central
        ),
        push: normalizeBoolean(row.commentRepliesPushEnabled, activity.commentReplies.push),
        email: normalizeBoolean(row.commentRepliesEmailEnabled, activity.commentReplies.email),
      },
      commentReactions: {
        central: normalizeBoolean(
          row.commentReactionsCentralEnabled,
          activity.commentReactions.central
        ),
        push: normalizeBoolean(row.commentReactionsPushEnabled, activity.commentReactions.push),
        email: normalizeBoolean(row.commentReactionsEmailEnabled, activity.commentReactions.email),
      },
      listComments: {
        central: normalizeBoolean(row.listCommentsCentralEnabled, activity.listComments.central),
        push: normalizeBoolean(row.listCommentsPushEnabled, activity.listComments.push),
        email: normalizeBoolean(row.listCommentsEmailEnabled, activity.listComments.email),
      },
      listFollows: {
        central: normalizeBoolean(row.listFollowsCentralEnabled, activity.listFollows.central),
        push: normalizeBoolean(row.listFollowsPushEnabled, activity.listFollows.push),
        email: normalizeBoolean(row.listFollowsEmailEnabled, activity.listFollows.email),
      },
      mentions: {
        central: normalizeBoolean(row.mentionsCentralEnabled, activity.mentions.central),
        push: normalizeBoolean(row.mentionsPushEnabled, activity.mentions.push),
        email: normalizeBoolean(row.mentionsEmailEnabled, activity.mentions.email),
      },
      priceDrops: {
        central: normalizeBoolean(row.priceDropsCentralEnabled, activity.priceDrops.central),
        push: normalizeBoolean(row.priceDropsPushEnabled, activity.priceDrops.push),
        email: normalizeBoolean(row.priceDropsEmailEnabled, activity.priceDrops.email),
      },
      backInStock: {
        central: normalizeBoolean(row.backInStockCentralEnabled, activity.backInStock.central),
        push: normalizeBoolean(row.backInStockPushEnabled, activity.backInStock.push),
        email: normalizeBoolean(row.backInStockEmailEnabled, activity.backInStock.email),
      },
    },
    priceDropMode: normalizePriceAlertMode(row.priceAlertMode),
    priceDropThreshold: Number.isFinite(Number(row.priceAlertPercentage))
      ? Math.max(1, Math.min(100, Number(row.priceAlertPercentage)))
      : DEFAULT_NOTIFICATION_PREFERENCES.priceDropThreshold,
  };
}

export function getNotificationPreferenceKeyForType(type: string): NotificationPreferenceKey | null {
  return NOTIFICATION_TYPE_TO_KEY[type] ?? null;
}

export function getNotificationPreferenceKeysForType(type: string): NotificationPreferenceKey[] {
  return NOTIFICATION_TYPE_TO_KEYS[type] ?? [];
}

export function isNotificationChannelEnabled(
  preferences: NotificationPreferencesState,
  type: string,
  channel: NotificationChannel
) {
  const keys = getNotificationPreferenceKeysForType(type);
  if (keys.length === 0) return false;
  return keys.some((key) => preferences.activity[key][channel]);
}

export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferencesState> {
  const row = await prisma.siteUserNotificationPreference.findUnique({
    where: { userId },
  });

  if (row) {
    return normalizePreferencesRow(row as never);
  }

  const created = await prisma.siteUserNotificationPreference.create({
    data: buildPreferenceRowData(userId, DEFAULT_NOTIFICATION_PREFERENCES),
  });

  return normalizePreferencesRow(created as never);
}

export async function updateNotificationPreferences(
  userId: string,
  input: Partial<NotificationPreferencesState>
): Promise<NotificationPreferencesState> {
  const current = await getNotificationPreferences(userId);
  const next: NotificationPreferencesState = {
    activity: {
      commentReplies: {
        ...current.activity.commentReplies,
        ...(input.activity?.commentReplies ?? {}),
      },
      commentReactions: {
        ...current.activity.commentReactions,
        ...(input.activity?.commentReactions ?? {}),
      },
      listComments: {
        ...current.activity.listComments,
        ...(input.activity?.listComments ?? {}),
      },
      listFollows: {
        ...current.activity.listFollows,
        ...(input.activity?.listFollows ?? {}),
      },
      mentions: {
        ...current.activity.mentions,
        ...(input.activity?.mentions ?? {}),
      },
      priceDrops: {
        ...current.activity.priceDrops,
        ...(input.activity?.priceDrops ?? {}),
      },
      backInStock: {
        ...current.activity.backInStock,
        ...(input.activity?.backInStock ?? {}),
      },
    },
    priceDropMode:
      input.priceDropMode != null ? normalizePriceAlertMode(input.priceDropMode) : current.priceDropMode,
    priceDropThreshold:
      input.priceDropThreshold != null
        ? Math.max(1, Math.min(100, Math.round(input.priceDropThreshold)))
        : current.priceDropThreshold,
  };

  const row = await prisma.siteUserNotificationPreference.upsert({
    where: { userId },
    create: buildPreferenceRowData(userId, next),
    update: buildPreferenceRowData(userId, next),
  });

  return normalizePreferencesRow(row as never);
}

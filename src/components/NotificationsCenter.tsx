"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, CircleDot, MessageCircle, Package, TrendingDown, User } from "lucide-react";
import type { SiteNotificationItem } from "@/lib/siteNotifications";
import {
  accountBodyClass,
  accountKickerClass,
  accountSecondaryButtonClass,
  accountSectionClass,
} from "@/components/account/accountUi";

type NotificationsCenterProps = {
  notifications: SiteNotificationItem[];
};

function formatDateGroup(dateIso: string) {
  const date = new Date(dateIso);
  const today = new Date();
  const diffDays = Math.floor(
    (Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) -
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())) /
      (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays <= 7) return "Esta semana";
  return "Mais antigas";
}

function formatRelativeTime(dateIso: string) {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

function getNotificationIcon(type: string) {
  const className = "h-4 w-4";
  switch (type) {
    case "favorite_price_drop":
    case "monitored_price_drop":
      return <TrendingDown className={className} />;
    case "favorite_back_in_stock":
    case "monitored_back_in_stock":
      return <Package className={className} />;
    case "list_comment":
    case "comment_reply":
      return <MessageCircle className={className} />;
    case "new_follower":
      return <User className={className} />;
    default:
      return <CircleDot className={className} />;
  }
}

export default function NotificationsCenter({ notifications }: NotificationsCenterProps) {
  const router = useRouter();
  const [items, setItems] = useState(notifications);
  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, SiteNotificationItem[]>();
    for (const item of items) {
      const group = formatDateGroup(item.createdAt);
      const bucket = buckets.get(group) ?? [];
      bucket.push(item);
      buckets.set(group, bucket);
    }
    return Array.from(buckets.entries());
  }, [items]);

  async function markAllRead() {
    if (unreadCount === 0) return;
    await fetch("/api/account/notifications", { method: "PATCH" });
    setItems((current) => current.map((item) => ({ ...item, isRead: true })));
    router.refresh();
  }

  async function clearAll() {
    if (items.length === 0) return;
    await fetch("/api/account/notifications", { method: "DELETE" });
    setItems([]);
    router.refresh();
  }

  async function markClicked(notificationId: string) {
    await fetch(`/api/account/notifications/${notificationId}`, {
      method: "PATCH",
      keepalive: true,
    });
  }

  return (
    <div className="space-y-6">
      <section className={`${accountSectionClass} p-4 sm:p-5 md:p-6`}>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className={accountKickerClass}>Notificações</p>
            <h1 className="mt-2 text-[28px] font-black leading-tight text-[#0F1111] sm:text-[32px]">
              Central de notificações
            </h1>
            <p className={`${accountBodyClass} mt-2 max-w-2xl`}>
              Acompanhe respostas, reações, menções e alertas dos produtos em um só lugar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void markAllRead()}
              className={`${accountSecondaryButtonClass} gap-2`}
            >
              <CheckCheck className="h-4 w-4 text-[#2162A1]" />
              Marcar todas como lidas
            </button>
            <button
              type="button"
              onClick={() => void clearAll()}
              className={`${accountSecondaryButtonClass} gap-2`}
            >
              Limpar
            </button>
            <Link href="/minha-conta" className="inline-flex h-10 items-center rounded-md border border-transparent px-4 text-[13px] font-semibold text-[#2162A1] transition hover:bg-[#F8FAFA]">
              Voltar para minha conta
            </Link>
          </div>
        </div>
      </section>

      {items.length === 0 ? (
        <section className={`${accountSectionClass} border-dashed bg-[#F8FAFA] px-4 py-14 text-center text-[13px] text-[#565959]`}>
          Nenhuma notificação por enquanto.
        </section>
      ) : (
        grouped.map(([groupName, groupItems]) => (
          <section key={groupName} className={`${accountSectionClass} p-4 md:p-5`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className={accountKickerClass}>{groupName}</h2>
              <span className="text-[11px] font-semibold text-[#667085]">{groupItems.length} itens</span>
            </div>

            <div className="divide-y divide-[#EAECF0]">
              {groupItems.map((notification) =>
                notification.href ? (
                  <Link
                    key={notification.id}
                    href={notification.href}
                    onClick={() => void markClicked(notification.id)}
                    className={`flex gap-3 px-1 py-4 transition hover:bg-[#F8FAFA] ${
                      notification.isRead ? "" : "rounded-[10px] bg-[#FFF8E7]"
                    }`}
                  >
                    <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-[#344054]">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-[#0F1111]">{notification.title}</p>
                          {notification.body ? (
                            <p className="mt-1 line-clamp-2 text-[13px] text-[#565959]">{notification.body}</p>
                          ) : null}
                        </div>
                        <span className="whitespace-nowrap text-[11px] font-semibold text-[#667085]">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div
                    key={notification.id}
                    className={`flex gap-3 px-1 py-4 ${notification.isRead ? "" : "rounded-[10px] bg-[#FFF8E7]"}`}
                  >
                    <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-[#344054]">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-[#0F1111]">{notification.title}</p>
                          {notification.body ? (
                            <p className="mt-1 line-clamp-2 text-[13px] text-[#565959]">{notification.body}</p>
                          ) : null}
                        </div>
                        <span className="whitespace-nowrap text-[11px] font-semibold text-[#667085]">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

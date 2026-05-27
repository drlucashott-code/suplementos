"use client";

import Link from "next/link";
import { Bell, CheckCheck, CircleDot, List, MessageCircle, Package, TrendingDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  href: string | null;
  isRead: boolean;
  createdAt: string;
};

function getNotificationIcon(type: string) {
  const baseClass = "h-4 w-4";
  switch (type) {
    case "favorite_price_drop":
    case "monitored_price_drop":
      return <TrendingDown className={baseClass} />;
    case "favorite_back_in_stock":
    case "monitored_back_in_stock":
      return <Package className={baseClass} />;
    case "list_comment":
    case "comment_reply":
      return <MessageCircle className={baseClass} />;
    case "list_saved":
      return <List className={baseClass} />;
    default:
      return <CircleDot className={baseClass} />;
  }
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

export default function SiteNotificationsBell() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notificationsLoaded, setNotificationsLoaded] = useState(false);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadUnreadCount() {
      try {
        const response = await fetch("/api/account/notifications?summary=1", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as {
          ok?: boolean;
          unreadCount?: number;
        };
        if (!active || !data.ok) return;
        setUnreadCount(data.unreadCount ?? 0);
      } catch (error) {
        console.error("notifications_load_failed", error);
      }
    }

    void loadUnreadCount();

    return () => {
      active = false;
    };
  }, []);

  async function loadNotifications() {
    if (notificationsLoaded) return;

    try {
      const response = await fetch("/api/account/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as {
        ok?: boolean;
        notifications?: NotificationItem[];
        unreadCount?: number;
      };
      if (!data.ok) return;
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
      setNotificationsLoaded(true);
    } catch (error) {
      console.error("notifications_load_failed", error);
    }
  }

  async function handleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);

    if (nextOpen) {
      void loadNotifications();
    }

    if (!nextOpen || unreadCount === 0) return;

    setLoading(true);
    try {
      await fetch("/api/account/notifications", { method: "PATCH" });
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("notifications_mark_read_failed", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return;

    setLoading(true);
    try {
      await fetch("/api/account/notifications", { method: "PATCH" });
      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("notifications_mark_read_failed", error);
    } finally {
      setLoading(false);
    }
  }

  async function markClicked(notificationId: string) {
    await fetch(`/api/account/notifications/${notificationId}`, {
      method: "PATCH",
      keepalive: true,
    });
  }

  return (
    <div className="relative shrink-0" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => void handleOpen()}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/10 text-white transition hover:bg-white/15"
        aria-label="Abrir notificações"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#CC0C39] px-1 text-[10px] font-black text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[110] w-[320px] overflow-hidden rounded-[10px] border border-[#D5D9D9] bg-white text-[#0F1111] shadow-lg">
          <div className="border-b border-[#EAECF0] px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[13px] font-black">Notificações</p>
                <p className="mt-0.5 text-[12px] text-[#667085]">
                  {loading ? "Atualizando..." : "Curtidas, respostas e alertas dos favoritos"}
                </p>
              </div>
              <Link
                href="/notificacoes"
                onClick={() => setOpen(false)}
                className="text-[12px] font-semibold text-[#2162A1] transition hover:underline"
              >
                Ver todas
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-[#EAECF0] px-4 py-2.5">
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#2162A1] transition hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas como lidas
            </button>
            <span className="text-[11px] font-semibold text-[#667085]">
              {unreadCount > 0 ? `${unreadCount} não lidas` : "Tudo em dia"}
            </span>
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="rounded-[10px] px-3 py-6 text-center text-[13px] text-[#667085]">
                Nenhuma notificação por enquanto.
              </div>
            ) : (
              notifications.map((notification) =>
                notification.href ? (
                  <Link
                    key={notification.id}
                    href={notification.href}
                    onClick={() => {
                      void markClicked(notification.id);
                      setOpen(false);
                    }}
                    className={`block rounded-[10px] px-3 py-3 transition hover:bg-[#F8FAFA] ${
                      notification.isRead ? "" : "bg-[#FFF8E7]"
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-[#344054]">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#0F1111]">{notification.title}</p>
                        {notification.body ? (
                          <p className="mt-1 line-clamp-2 text-[12px] text-[#667085]">{notification.body}</p>
                        ) : null}
                        <p className="mt-2 text-[11px] font-semibold text-[#667085]">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div
                    key={notification.id}
                    className={`rounded-[10px] px-3 py-3 ${notification.isRead ? "" : "bg-[#FFF8E7]"}`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3F4F6] text-[#344054]">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold text-[#0F1111]">{notification.title}</p>
                        {notification.body ? (
                          <p className="mt-1 line-clamp-2 text-[12px] text-[#667085]">{notification.body}</p>
                        ) : null}
                        <p className="mt-2 text-[11px] font-semibold text-[#667085]">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

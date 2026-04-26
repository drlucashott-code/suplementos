"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  isRead: boolean;
  createdAt: string;
};

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

    async function loadNotifications() {
      try {
        const response = await fetch("/api/account/notifications", { cache: "no-store" });
        if (!response.ok) return;
        const data = (await response.json()) as {
          ok?: boolean;
          notifications?: NotificationItem[];
          unreadCount?: number;
        };
        if (!active || !data.ok) return;
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      } catch (error) {
        console.error("notifications_load_failed", error);
      }
    }

    void loadNotifications();

    return () => {
      active = false;
    };
  }, []);

  async function handleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);

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

  return (
    <div className="relative shrink-0" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => void handleOpen()}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/10 text-white transition hover:bg-white/15"
        aria-label="Abrir notificacoes"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 inline-flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#CC0C39] px-1 text-[10px] font-black text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[110] w-[320px] overflow-hidden rounded-2xl border border-white/15 bg-white text-[#0F1111] shadow-2xl">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-black">Notificacoes</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {loading ? "Atualizando..." : "Curtidas, respostas e alertas dos favoritos"}
            </p>
          </div>

          <div className="max-h-[360px] overflow-y-auto p-2">
            {notifications.length === 0 ? (
              <div className="rounded-xl px-3 py-6 text-center text-sm text-gray-500">
                Nenhuma notificacao por enquanto.
              </div>
            ) : (
              notifications.map((notification) =>
                notification.href ? (
                  <Link
                    key={notification.id}
                    href={notification.href}
                    onClick={() => setOpen(false)}
                    className={`block rounded-xl px-3 py-3 transition hover:bg-gray-50 ${
                      notification.isRead ? "" : "bg-[#FFF8E7]"
                    }`}
                  >
                    <p className="text-sm font-bold text-[#0F1111]">{notification.title}</p>
                    {notification.body ? (
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">{notification.body}</p>
                    ) : null}
                    <p className="mt-2 text-[11px] font-semibold text-[#667085]">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </Link>
                ) : (
                  <div
                    key={notification.id}
                    className={`rounded-xl px-3 py-3 ${notification.isRead ? "" : "bg-[#FFF8E7]"}`}
                  >
                    <p className="text-sm font-bold text-[#0F1111]">{notification.title}</p>
                    {notification.body ? (
                      <p className="mt-1 line-clamp-2 text-xs text-gray-500">{notification.body}</p>
                    ) : null}
                    <p className="mt-2 text-[11px] font-semibold text-[#667085]">
                      {formatRelativeTime(notification.createdAt)}
                    </p>
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

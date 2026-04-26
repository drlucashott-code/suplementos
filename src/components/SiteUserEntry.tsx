"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
};

type SiteUserEntryProps = {
  compact?: boolean;
  initialUser?: SessionUser | null;
};

export function SiteUserEntry({
  compact = false,
  initialUser,
}: SiteUserEntryProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hasResolvedInitialUser = initialUser !== undefined;
  const [user, setUser] = useState<SessionUser | null>(initialUser ?? null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(!hasResolvedInitialUser);

  useEffect(() => {
    if (hasResolvedInitialUser) {
      setLoading(false);
      return;
    }

    let active = true;

    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store" });
        const data = (await response.json()) as { authenticated: boolean; user?: SessionUser | null };
        if (!active) return;
        setUser(data.authenticated ? (data.user ?? null) : null);
      } catch (error) {
        console.error("site_session_load_failed", error);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, [hasResolvedInitialUser]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("site_logout_failed", error);
    }
  }

  const sharedButtonClass = compact
    ? "inline-flex h-11 w-11 items-center justify-center rounded-md bg-white/10 text-white transition hover:bg-white/15"
    : "inline-flex h-11 items-center gap-2 rounded-md bg-white/10 px-3 text-white transition hover:bg-white/15";

  return (
    <div className="relative shrink-0" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={sharedButtonClass}
        aria-expanded={open}
        aria-label={user ? "Abrir menu da conta" : "Abrir menu de entrada"}
      >
        <User className="h-5 w-5" />
        {!compact ? (
          <span className="max-w-[120px] truncate text-sm font-semibold">
            {loading ? "Conta" : user ? user.displayName : "Entrar"}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-[110] w-64 overflow-hidden rounded-2xl border border-white/15 bg-white text-[#0F1111] shadow-2xl">
          {user ? (
            <>
              <div className="border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-black">{user.displayName}</p>
                <p className="mt-0.5 truncate text-xs text-gray-500">{user.email}</p>
              </div>
              <div className="p-2">
                <Link
                  href="/minha-conta"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <User className="h-4 w-4" />
                  Minha conta
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-semibold text-[#B42318] transition hover:bg-[#FEF3F2]"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </>
          ) : (
            <div className="p-2">
              <Link
                href="/entrar"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <User className="h-4 w-4" />
                Entrar
              </Link>
              <Link
                href="/cadastro"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                <UserPlus className="h-4 w-4" />
                Criar conta
              </Link>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default SiteUserEntry;

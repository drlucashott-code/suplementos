"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { Bell, Check, LogOut, MoreHorizontal, Shield, User, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import AccountSettingsPanel from "@/components/AccountSettingsPanel";
import {
  accountBodyClass,
  accountPrimaryButtonClass,
  accountSecondaryButtonClass,
  accountSectionClass,
} from "@/components/account/accountUi";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferenceKey,
  type NotificationPreferencesState,
} from "@/lib/notifications/types";
import {
  ensureBrowserPushSubscription,
  isPushSupported,
  removeBrowserPushSubscription,
} from "@/lib/client/pushNotifications";

type AccountSettingsWorkspaceProps = {
  user: {
    id: string;
    email: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
    isEmailVerified: boolean;
  };
};

type SettingsSectionId = "account" | "notifications" | "security";

const SETTINGS_TABS: Array<{ id: SettingsSectionId; title: string }> = [
  { id: "account", title: "Minha conta" },
  { id: "notifications", title: "Notificações" },
  { id: "security", title: "Segurança" },
];

const NOTIFICATION_ROWS: Array<{
  key: NotificationPreferenceKey;
  title: string;
  description: string;
}> = [
  {
    key: "commentReplies",
    title: "Resposta ao meu comentário",
    description: "Quando alguém responde ao que eu escrevi.",
  },
  {
    key: "commentReactions",
    title: "Reações ao meu comentário",
    description: "Quando uma pessoa curte ou reage a um comentário meu.",
  },
  {
    key: "listComments",
    title: "Comentários em minhas listas",
    description: "Quando uma lista pública recebe conversa nova.",
  },
  {
    key: "listFollows",
    title: "Novo seguidor de listas",
    description: "Quando alguém passa a acompanhar o que eu salvo.",
  },
  {
    key: "mentions",
    title: "Menções ao meu usuário",
    description: "Quando meu @usuario aparece em comentários ou listas.",
  },
  {
    key: "priceDrops",
    title: "Queda de preço",
    description: "Alertas de redução para produtos monitorados.",
  },
  {
    key: "backInStock",
    title: "Produto voltou ao estoque",
    description: "Quando um item salvo fica disponível de novo.",
  },
];

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className={`${accountSectionClass} p-4 sm:p-5 md:p-6`}>
      <div className="flex items-start gap-3">
        <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#F3F4F6] text-[#2162A1]">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-[16px] font-bold leading-tight text-[#0F1111]">{title}</h2>
          <p className="mt-1 text-[13px] leading-5 text-[#667085]">{description}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

type PriceMenuAnchor = {
  left: number;
  top: number;
};

function SwitchCell({
  checked,
  onClick,
  label,
}: {
  checked: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={checked}
      className={`inline-flex h-8 w-14 items-center rounded-full border px-1 transition ${
        checked
          ? "border-[#2162A1] bg-[#2162A1]"
          : "border-[#D0D5DD] bg-[#E5E7EB] hover:bg-[#DADFE4]"
      }`}
    >
      <span
        className={`inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-black text-[#2162A1] shadow-sm transition ${
          checked ? "translate-x-6" : "translate-x-0"
        }`}
      >
        {checked ? <Check className="h-3.5 w-3.5" /> : null}
      </span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

function NotificationPreferencesSection({ userId }: { userId: string }) {
  const [state, setState] = useState<NotificationPreferencesState>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [priceMenuOpen, setPriceMenuOpen] = useState(false);
  const [priceMenuAnchor, setPriceMenuAnchor] = useState<PriceMenuAnchor | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const productRows = useMemo(
    () => NOTIFICATION_ROWS.filter((row) => row.key === "priceDrops" || row.key === "backInStock"),
    [],
  );
  const socialRows = useMemo(
    () => NOTIFICATION_ROWS.filter((row) => row.key !== "priceDrops" && row.key !== "backInStock"),
    [],
  );

  function clearPushPreferences(base: NotificationPreferencesState) {
    return {
      ...base,
      activity: Object.fromEntries(
        Object.entries(base.activity).map(([key, entry]) => [key, { ...entry, push: false }]),
      ) as NotificationPreferencesState["activity"],
    };
  }

  function hasAnyPushPreference(next: NotificationPreferencesState) {
    return Object.values(next.activity).some((entry) => entry.push);
  }

  async function loadPreferences() {
    const response = await fetch("/api/account/notification-preferences", { cache: "no-store" });
    if (!response.ok) return null;

    const data = (await response.json()) as {
      ok?: boolean;
      preferences?: NotificationPreferencesState;
    };

    if (!data.ok || !data.preferences) return null;
    return data.preferences;
  }

  async function loadPushStatus() {
    try {
      const response = await fetch("/api/account/push-subscriptions", { cache: "no-store" });
      if (!response.ok) {
        return { enabled: false, hasSubscription: false };
      }

      const data = (await response.json()) as {
        ok?: boolean;
        enabled?: boolean;
        hasSubscription?: boolean;
      };

      if (!data.ok) {
        return { enabled: false, hasSubscription: false };
      }

      return {
        enabled: Boolean(data.enabled),
        hasSubscription: Boolean(data.hasSubscription),
      };
    } catch (error) {
      console.error("push_status_load_failed", error);
      return { enabled: false, hasSubscription: false };
    }
  }

  async function persistPreferences(next: NotificationPreferencesState) {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/notification-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        preferences?: NotificationPreferencesState;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.preferences) {
        throw new Error(data.error ?? "notification_preferences_save_failed");
      }

      setState(data.preferences);
    } catch (error) {
      console.error("notification_preferences_save_failed", error);
      setMessage("N?o foi poss?vel salvar agora.");
      void (async () => {
        const preferences = await loadPreferences();
        if (preferences) setState(preferences);
      })();
    } finally {
      setSaving(false);
    }
  }

  async function syncPushAvailability(basePreferences: NotificationPreferencesState) {
    const pushStatus = await loadPushStatus();
    setPushSupported(pushStatus.enabled);
    setPushSubscribed(pushStatus.hasSubscription);

    if (!pushStatus.enabled || !pushStatus.hasSubscription) {
      const next = clearPushPreferences(basePreferences);
      if (hasAnyPushPreference(basePreferences)) {
        setState(next);
        await persistPreferences(next);
      } else {
        setState(next);
      }
    }
  }

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const preferences = (await loadPreferences()) ?? DEFAULT_NOTIFICATION_PREFERENCES;
      if (!active) return;

      setState(preferences);
      await syncPushAvailability(preferences);
      if (active) {
        setHydrated(true);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    function handleFocusSync() {
      void (async () => {
        const pushStatus = await loadPushStatus();
        setPushSupported(pushStatus.enabled);
        setPushSubscribed(pushStatus.hasSubscription);

        if (!pushStatus.enabled || !pushStatus.hasSubscription) {
          const next = clearPushPreferences(stateRef.current);
          if (hasAnyPushPreference(stateRef.current)) {
            setState(next);
            await persistPreferences(next);
          }
        }
      })();
    }

    window.addEventListener("focus", handleFocusSync);
    document.addEventListener("visibilitychange", handleFocusSync);
    return () => {
      window.removeEventListener("focus", handleFocusSync);
      document.removeEventListener("visibilitychange", handleFocusSync);
    };
  }, []);

  async function enablePush(): Promise<boolean> {
    if (!isPushSupported()) {
      setPushSubscribed(false);
      setPushSupported(false);
      setMessage("Push n?o est? dispon?vel neste navegador.");
      return false;
    }

    setPushLoading(true);
    setMessage(null);
    try {
      const subscription = await ensureBrowserPushSubscription();
      const response = await fetch("/api/account/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "push_subscription_save_failed");
      }

      setPushSupported(true);
      setPushSubscribed(true);
      setMessage("Push do navegador ativado.");
      return true;
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "push_not_supported") {
          setPushSupported(false);
          setPushSubscribed(false);
          const next = clearPushPreferences(stateRef.current);
          setState(next);
          void persistPreferences(next);
          setMessage("Push n?o est? dispon?vel neste navegador.");
          return false;
        }

        if (error.message === "push_denied") {
          setPushSupported(false);
          setPushSubscribed(false);
          const next = clearPushPreferences(stateRef.current);
          setState(next);
          void persistPreferences(next);
          setMessage("Permiss?o de push bloqueada no navegador.");
          return false;
        }

        if (error.message === "push_permission_denied") {
          setPushSubscribed(false);
          setMessage("Permiss?o de push n?o foi concedida.");
          return false;
        }
      }

      console.error("push_subscription_enable_failed", error);
      setMessage("N?o foi poss?vel ativar o push agora.");
      return false;
    } finally {
      setPushLoading(false);
    }
  }

  async function disablePush(silent = false): Promise<void> {
    setPushLoading(true);
    setMessage(null);
    try {
      const subscription = await removeBrowserPushSubscription();
      if (subscription) {
        await fetch("/api/account/push-subscriptions", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }
      setPushSubscribed(false);
      const next = clearPushPreferences(stateRef.current);
      setState(next);
      await persistPreferences(next);
      if (!silent) {
        setMessage("Push do navegador desativado.");
      }
    } catch (error) {
      console.error("push_subscription_disable_failed", error);
      setMessage("N?o foi poss?vel desativar o push agora.");
    } finally {
      setPushLoading(false);
    }
  }

  async function toggleRow(key: NotificationPreferenceKey, channel: "central" | "push" | "email") {
    if (saving || pushLoading) {
      return;
    }

    const nextValue = !state.activity[key][channel];

    if (channel === "push" && nextValue) {
      const enabled = pushSubscribed ? true : await enablePush();
      if (!enabled) {
        return;
      }
    }

    const next: NotificationPreferencesState = {
      ...state,
      activity: {
        ...state.activity,
        [key]: {
          ...state.activity[key],
          [channel]: nextValue,
        },
      },
    };

    setState(next);
    void persistPreferences(next);

    if (channel === "push" && !nextValue && !hasAnyPushPreference(next) && pushSubscribed) {
      void disablePush(true);
    }
  }

  function updatePriceMode(mode: "any" | "custom") {
    const next: NotificationPreferencesState = {
      ...state,
      priceDropMode: mode,
    };
    setState(next);
    void persistPreferences(next);
  }

  function updatePriceThreshold(value: number) {
    const next: NotificationPreferencesState = {
      ...state,
      priceDropThreshold: value,
      priceDropMode: "custom",
    };
    setState(next);
    void persistPreferences(next);
  }

  function openPriceMenu(event: ReactMouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setPriceMenuAnchor({ left: rect.left, top: rect.bottom + 10 });
    setPriceMenuOpen(true);
  }

  function closePriceMenu() {
    setPriceMenuOpen(false);
    setPriceMenuAnchor(null);
  }

  const priceMenu =
    priceMenuOpen && priceMenuAnchor && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Fechar configurações de queda de preço"
              onClick={closePriceMenu}
              className="fixed inset-0 z-40 cursor-default bg-black/10"
            />
            <div
              className="fixed z-50 w-[min(100vw-2rem,360px)] rounded-[6px] border border-[#D9DEE3] bg-[#FCFCFD] p-3 shadow-[0_10px_22px_rgba(15,17,17,0.12)] sm:w-[360px] sm:p-3.5"
              style={{
                left: Math.max(16, Math.min(priceMenuAnchor.left - 12, window.innerWidth - 376)),
                top: priceMenuAnchor.top,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => updatePriceMode("any")}
                  className={`inline-flex h-8 items-center rounded-[6px] border px-3 text-[12px] font-semibold transition ${
                    state.priceDropMode === "any"
                      ? "border-[#2162A1] bg-[#EEF5FB] text-[#2162A1]"
                      : "border-[#D9DEE3] bg-white text-[#0F1111] hover:bg-[#F8FAFA]"
                  }`}
                >
                  Qualquer queda
                </button>
                <button
                  type="button"
                  onClick={() => updatePriceMode("custom")}
                  className={`inline-flex h-8 items-center rounded-[6px] border px-3 text-[12px] font-semibold transition ${
                    state.priceDropMode === "custom"
                      ? "border-[#2162A1] bg-[#EEF5FB] text-[#2162A1]"
                      : "border-[#D9DEE3] bg-white text-[#0F1111] hover:bg-[#F8FAFA]"
                  }`}
                >
                  Personalizado
                </button>
              </div>

              {state.priceDropMode === "custom" ? (
                <div className="mt-3.5 grid gap-3 sm:grid-cols-2">
                  <label className="block space-y-1.5">
                    <span className="text-[13px] font-bold text-[#0F1111]">Queda mínima (%)</span>
                    <input
                      type="range"
                      min={1}
                      max={80}
                      value={state.priceDropThreshold}
                      onChange={(event) => updatePriceThreshold(Number(event.target.value))}
                      className="h-2 w-full accent-[#2162A1]"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[13px] font-bold text-[#0F1111]">Valor exato</span>
                    <input
                      type="number"
                      min={1}
                      max={80}
                      value={state.priceDropThreshold}
                      onChange={(event) => updatePriceThreshold(Number(event.target.value))}
                      className="h-8 w-full rounded-[6px] border border-[#D9DEE3] px-2.5 text-[13px] text-[#0F1111] outline-none transition focus:border-[#2162A1]"
                    />
                  </label>
                </div>
              ) : null}
            </div>
          </>,
          document.body,
        )
      : null;

  if (!hydrated) {
    return (
      <SectionCard
        icon={Bell}
        title="Notificações"
        description="Central, email e push organizados por categoria."
      >
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[6px] border border-dashed border-[#D9DEE3] bg-[#F8FAFA] px-4 py-6 text-[13px] text-[#565959]">
            Carregando preferências...
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      icon={Bell}
      title="Notificações"
      description="Central, email e push organizados por categoria."
    >
      {priceMenu}

      <div className="mx-auto max-w-4xl space-y-3">
        <div className={`${accountSectionClass} overflow-hidden p-0`}>
          <div className="border-b border-[#EAECF0] px-4 py-2.5 sm:px-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2162A1]">Produtos</p>
          </div>
          <div className="divide-y divide-[#EAECF0]">
            {productRows.map((row) => (
              <div key={row.key} className="px-4 py-2.5 sm:px-5">
                <div className="flex flex-col gap-2.5 md:flex-row md:items-start md:justify-between md:gap-3">
                  <div className={`min-w-0 md:max-w-[48%] ${row.key === "priceDrops" ? "relative" : ""}`}>
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-bold leading-5 text-[#0F1111]">{row.title}</p>
                      {row.key === "priceDrops" ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            if (priceMenuOpen) {
                              closePriceMenu();
                              return;
                            }
                            openPriceMenu(event);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#D9DEE3] bg-white text-[#0F1111] transition hover:bg-[#F8FAFA]"
                          aria-expanded={priceMenuOpen}
                          aria-label="Abrir configurações de queda de preço"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    {row.key === "priceDrops" ? priceMenu : null}
                  </div>
                  <div className="flex flex-col gap-2 md:shrink-0 md:items-end">
                    <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#667085]">
                      <span className="text-center">Central</span>
                      <span className="text-center">Email</span>
                      <span className="text-center">Push</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <SwitchCell
                        checked={state.activity[row.key].central}
                        onClick={() => void toggleRow(row.key, "central")}
                        label={`${row.title} na central`}
                      />
                      <SwitchCell
                        checked={state.activity[row.key].email}
                        onClick={() => void toggleRow(row.key, "email")}
                        label={`${row.title} por email`}
                      />
                      <SwitchCell
                        checked={state.activity[row.key].push}
                        onClick={() => void toggleRow(row.key, "push")}
                        label={`${row.title} por push`}
                      />
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>

        <div className={`${accountSectionClass} overflow-hidden p-0`}>
          <div className="border-b border-[#EAECF0] px-4 py-2.5 sm:px-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2162A1]">Atividade social</p>
          </div>
          <div className="divide-y divide-[#EAECF0]">
            {socialRows.map((row) => (
              <div
                key={row.key}
                className="flex flex-col gap-2.5 px-4 py-2.5 sm:px-5 md:flex-row md:items-center md:justify-between md:gap-3"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-bold leading-5 text-[#0F1111]">{row.title}</p>
                </div>
                <div className="flex flex-col gap-2 md:shrink-0 md:items-end">
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#667085]">
                    <span className="text-center">Central</span>
                    <span className="text-center">Email</span>
                    <span className="text-center">Push</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <SwitchCell
                      checked={state.activity[row.key].central}
                      onClick={() => void toggleRow(row.key, "central")}
                      label={`${row.title} na central`}
                    />
                    <SwitchCell
                      checked={state.activity[row.key].email}
                      onClick={() => void toggleRow(row.key, "email")}
                      label={`${row.title} por email`}
                    />
                    <SwitchCell
                      checked={state.activity[row.key].push}
                      onClick={() => void toggleRow(row.key, "push")}
                      label={`${row.title} por push`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {hydrated && message ? (
          <div className="rounded-[6px] border border-[#D0D5DD] bg-[#F8FAFA] px-3.5 py-2 text-[13px] font-medium text-[#0F1111]">
            {message}
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

function SecuritySection({ user }: { user: AccountSettingsWorkspaceProps["user"] }) {
  const router = useRouter();
  const [resendingVerification, setResendingVerification] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resendVerification() {
    setMessage(null);
    setResendingVerification(true);
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email }),
      });
      const data = (await response.json()) as { ok?: boolean; sent?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setMessage("Não foi possível reenviar a confirmação.");
        return;
      }
      setMessage(data.sent ? "Confirmação enviada para o email atual." : "Email já estava verificado.");
    } finally {
      setResendingVerification(false);
    }
  }

  async function logoutCurrentSession() {
    setLogoutPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/entrar");
      router.refresh();
    } finally {
      setLogoutPending(false);
    }
  }

  return (
    <SectionCard
      icon={Shield}
      title="Segurança"
      description="Email, senha e sessão atual em um bloco direto e funcional."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[6px] border border-[#D9DEE3] bg-[#FCFCFD] p-3.5">
          <p className="text-[13px] font-bold text-[#0F1111]">Email atual</p>
          <p className="mt-1 text-[13px] leading-5 text-[#667085]">{user.email}</p>
          <p className="mt-3 text-[13px] font-semibold text-[#0F1111]">
            {user.isEmailVerified ? "Email verificado" : "Confirmação pendente"}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-[#667085]">
            {user.isEmailVerified
              ? "Sua conta está liberada para uso completo."
              : "Ainda vale confirmar o email para liberar interações completas."}
          </p>
          {!user.isEmailVerified ? (
            <button
              type="button"
              onClick={() => void resendVerification()}
              disabled={resendingVerification}
              className="mt-3 inline-flex h-8 items-center rounded-[6px] border border-[#D9DEE3] bg-white px-3.5 text-[13px] font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA] disabled:opacity-60"
            >
              {resendingVerification ? "Reenviando..." : "Reenviar confirmação"}
            </button>
          ) : null}
        </div>

        <div className="rounded-[6px] border border-[#D9DEE3] bg-[#FCFCFD] p-3.5">
          <p className="text-[13px] font-bold text-[#0F1111]">Senha e sessão</p>
          <p className="mt-1 text-[12px] leading-5 text-[#667085]">
            Troque sua senha quando quiser ou encerre a sessão atual.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/esqueci-senha"
              className="inline-flex h-8 items-center rounded-[6px] bg-[#FFD814] px-3.5 text-[13px] font-bold text-[#111111] transition hover:bg-[#F7CA00]"
            >
              Alterar senha
            </Link>
            <button
              type="button"
              onClick={() => void logoutCurrentSession()}
              disabled={logoutPending}
              className="inline-flex h-8 items-center rounded-[6px] border border-[#D9DEE3] bg-white px-3.5 text-[13px] font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA] disabled:opacity-60"
            >
              {logoutPending ? "Saindo..." : "Sair desta sessão"}
            </button>
          </div>
        </div>
      </div>

      {message ? (
        <div className="mt-3 rounded-[6px] border border-[#D0D5DD] bg-[#F8FAFA] px-3.5 py-2.5 text-[13px] font-medium text-[#0F1111]">
          {message}
        </div>
      ) : null}
    </SectionCard>
  );
}

export default function AccountSettingsWorkspace({ user }: AccountSettingsWorkspaceProps) {
  const [section, setSection] = useState<SettingsSectionId>("account");

  return (
    <div className="space-y-4">
      <section className={`${accountSectionClass} p-4 sm:p-5 md:p-6`}>
        <div className="border-b border-[#D9DEE3]">
          <div className="-mb-px flex gap-4 overflow-x-auto">
            {SETTINGS_TABS.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`border-b-2 px-0 pb-2.5 text-[13px] font-semibold transition ${
                    active
                      ? "border-[#2162A1] text-[#0F1111]"
                      : "border-transparent text-[#667085] hover:text-[#0F1111]"
                  }`}
                >
                  {item.title}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {section === "account" ? <AccountSettingsPanel user={user} /> : null}
        {section === "notifications" ? <NotificationPreferencesSection userId={user.id} /> : null}
        {section === "security" ? <SecuritySection user={user} /> : null}
      </div>
    </div>
  );
}

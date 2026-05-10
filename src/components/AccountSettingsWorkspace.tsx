"use client";

import Link from "next/link";
import { Bell, ChevronRight, LogOut, Shield, User, type LucideIcon } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import AccountSettingsPanel from "@/components/AccountSettingsPanel";

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
type NotificationChannelKey = "central" | "push" | "email";
type PriceDropMode = "any" | "custom";

type NotificationMatrix = Record<
  | "commentReplies"
  | "commentReactions"
  | "listComments"
  | "listFollows"
  | "mentions"
  | "priceDrops"
  | "backInStock",
  Record<NotificationChannelKey, boolean>
>;

type NotificationPreferencesState = {
  activity: NotificationMatrix;
  priceDropMode: PriceDropMode;
  priceDropThreshold: number;
};

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferencesState = {
  activity: {
    commentReplies: { central: true, push: false, email: false },
    commentReactions: { central: true, push: false, email: false },
    listComments: { central: true, push: false, email: false },
    listFollows: { central: true, push: false, email: false },
    mentions: { central: true, push: true, email: false },
    priceDrops: { central: true, push: true, email: false },
    backInStock: { central: true, push: true, email: false },
  },
  priceDropMode: "any",
  priceDropThreshold: 10,
};

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-[#D5D9D9] bg-white p-5 shadow-none md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#F3F4F6] text-[#2162A1]">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#0F1111]">{title}</h2>
            <p className="mt-1 text-sm text-[#667085]">{description}</p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ToggleCell({
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
      aria-pressed={checked}
      className={`inline-flex h-10 items-center justify-center rounded-full border px-3 text-xs font-bold transition ${
        checked
          ? "border-[#2162A1] bg-[#EEF5FC] text-[#0F1111]"
          : "border-[#D0D5DD] bg-white text-[#667085] hover:bg-[#F8FAFA]"
      }`}
    >
      {label}
    </button>
  );
}

function NotificationPreferencesSection({ userId }: { userId: string }) {
  const storageKey = useMemo(
    () => `amazonpicks-notification-prefs:${userId}`,
    [userId]
  );
  const [state, setState] = useState<NotificationPreferencesState>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as NotificationPreferencesState;
        setState(parsed);
      }
    } catch {
      // keep defaults
    } finally {
      setHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // ignore storage failures
    }
  }, [hydrated, state, storageKey]);

  function toggleRow(
    key: keyof NotificationMatrix,
    channel: NotificationChannelKey
  ) {
    setState((current) => ({
      ...current,
      activity: {
        ...current.activity,
        [key]: {
          ...current.activity[key],
          [channel]: !current.activity[key][channel],
        },
      },
    }));
  }

  const rows: Array<{
    key: keyof NotificationMatrix;
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

  return (
    <div className="space-y-6">
      <SectionCard
        icon={Bell}
        title="Notificações"
        description="Escolha quais eventos chegam na central, por push ou por email."
        action={
          <Link
            href="/notificacoes"
            className="inline-flex h-10 items-center rounded-full border border-[#D5D9D9] bg-white px-4 text-sm font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA]"
          >
            Abrir central
          </Link>
        }
      >
        <div className="hidden grid-cols-[minmax(0,1fr)_110px_110px_110px] gap-3 md:grid">
          <div />
          <div className="text-right text-xs font-bold uppercase tracking-[0.18em] text-[#2162A1]">
            Central
          </div>
          <div className="text-right text-xs font-bold uppercase tracking-[0.18em] text-[#2162A1]">
            Push
          </div>
          <div className="text-right text-xs font-bold uppercase tracking-[0.18em] text-[#2162A1]">
            Email
          </div>
        </div>

        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.key}
              className="rounded-2xl border border-[#EAECF0] bg-[#FCFCFD] p-4 md:grid md:grid-cols-[minmax(0,1fr)_110px_110px_110px] md:items-center md:gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-black text-[#0F1111]">{row.title}</p>
                <p className="mt-1 text-sm text-[#667085]">{row.description}</p>
              </div>

              <div className="mt-4 flex items-center gap-2 md:mt-0 md:justify-end">
                <span className="md:hidden text-xs font-bold uppercase tracking-[0.18em] text-[#2162A1]">
                  Central
                </span>
                <ToggleCell
                  label={state.activity[row.key].central ? "Ativo" : "Off"}
                  checked={state.activity[row.key].central}
                  onClick={() => toggleRow(row.key, "central")}
                />
              </div>

              <div className="mt-3 flex items-center gap-2 md:mt-0 md:justify-end">
                <span className="md:hidden text-xs font-bold uppercase tracking-[0.18em] text-[#2162A1]">
                  Push
                </span>
                <ToggleCell
                  label={state.activity[row.key].push ? "Ativo" : "Off"}
                  checked={state.activity[row.key].push}
                  onClick={() => toggleRow(row.key, "push")}
                />
              </div>

              <div className="mt-3 flex items-center gap-2 md:mt-0 md:justify-end">
                <span className="md:hidden text-xs font-bold uppercase tracking-[0.18em] text-[#2162A1]">
                  Email
                </span>
                <ToggleCell
                  label={state.activity[row.key].email ? "Ativo" : "Off"}
                  checked={state.activity[row.key].email}
                  onClick={() => toggleRow(row.key, "email")}
                />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        icon={Bell}
        title="Queda de preço"
        description="Defina se qualquer queda gera alerta ou se só uma faixa personalizada deve avisar."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#EAECF0] bg-white p-4 transition hover:bg-[#F8FAFA]">
              <input
                type="radio"
                name="price-drop-mode"
                checked={state.priceDropMode === "any"}
                onChange={() => setState((current) => ({ ...current, priceDropMode: "any" }))}
                className="mt-1 h-4 w-4 accent-[#2162A1]"
              />
              <div>
                <p className="text-sm font-black text-[#0F1111]">Qualquer queda</p>
                <p className="mt-1 text-sm text-[#667085]">
                  Receba avisos sempre que o preço baixar.
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#EAECF0] bg-white p-4 transition hover:bg-[#F8FAFA]">
              <input
                type="radio"
                name="price-drop-mode"
                checked={state.priceDropMode === "custom"}
                onChange={() => setState((current) => ({ ...current, priceDropMode: "custom" }))}
                className="mt-1 h-4 w-4 accent-[#2162A1]"
              />
              <div>
                <p className="text-sm font-black text-[#0F1111]">Personalizado</p>
                <p className="mt-1 text-sm text-[#667085]">
                  Escolha um percentual mínimo para receber alertas.
                </p>
              </div>
            </label>
          </div>

          <div
            className={`rounded-2xl border border-[#EAECF0] bg-[#FCFCFD] p-4 transition ${
              state.priceDropMode === "custom" ? "opacity-100" : "opacity-70"
            }`}
          >
            <p className="text-sm font-black text-[#0F1111]">Limite de alerta</p>
            <p className="mt-1 text-sm text-[#667085]">
              Notificar apenas quando a queda atingir pelo menos {state.priceDropThreshold}%.
            </p>

            <div className="mt-4 space-y-4">
              <input
                type="range"
                min={1}
                max={50}
                value={state.priceDropThreshold}
                onChange={(event) =>
                  setState((current) => ({
                    ...current,
                    priceDropThreshold: Number(event.target.value),
                    priceDropMode: "custom",
                  }))
                }
                className="w-full accent-[#2162A1]"
              />

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-[#2162A1]">
                  Percentual mínimo
                </span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={state.priceDropThreshold}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      priceDropThreshold: Math.max(1, Math.min(50, Number(event.target.value) || 1)),
                      priceDropMode: "custom",
                    }))
                  }
                  className="h-11 w-full rounded-2xl border border-[#D0D5DD] bg-white px-4 text-sm outline-none transition focus:border-[#F3A847]"
                />
              </label>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
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
    <div className="space-y-6">
      <SectionCard
        icon={Shield}
        title="Segurança"
        description="Senha, email verificado e saídas de sessão em um só lugar."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#EAECF0] bg-[#FCFCFD] p-4">
            <p className="text-sm font-black text-[#0F1111]">Email atual</p>
            <p className="mt-1 text-sm text-[#667085]">{user.email}</p>
            <p className="mt-3 text-sm font-semibold text-[#0F1111]">
              {user.isEmailVerified ? "Email verificado" : "Confirmação pendente"}
            </p>
            <p className="mt-1 text-sm text-[#667085]">
              {user.isEmailVerified
                ? "Sua conta já está liberada para interações completas."
                : "Ainda vale confirmar o email para destravar o fluxo social completo."}
            </p>
            {!user.isEmailVerified ? (
              <button
                type="button"
                onClick={() => void resendVerification()}
                disabled={resendingVerification}
                className="mt-4 inline-flex h-10 items-center rounded-full border border-[#D5D9D9] bg-white px-4 text-sm font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA] disabled:opacity-60"
              >
                {resendingVerification ? "Reenviando..." : "Reenviar confirmação"}
              </button>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#EAECF0] bg-[#FCFCFD] p-4">
            <p className="text-sm font-black text-[#0F1111]">Senha e sessão</p>
            <p className="mt-1 text-sm text-[#667085]">
              Troque sua senha quando quiser ou encerre a sessão atual.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/esqueci-senha"
                className="inline-flex h-10 items-center rounded-full bg-[#FFD814] px-4 text-sm font-black text-[#111111] transition hover:bg-[#F7CA00]"
              >
                Alterar senha
              </Link>
              <button
                type="button"
                onClick={() => void logoutCurrentSession()}
                disabled={logoutPending}
                className="inline-flex h-10 items-center rounded-full border border-[#D5D9D9] bg-white px-4 text-sm font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA] disabled:opacity-60"
              >
                {logoutPending ? "Saindo..." : "Sair desta sessão"}
              </button>
            </div>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-2xl border border-[#D0D5DD] bg-[#F8FAFA] px-4 py-3 text-sm font-medium text-[#0F1111]">
            {message}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        icon={User}
        title="Conta pronta para crescer"
        description="Espaço preparado para sessões, dispositivos e controles futuros."
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
            "Sessões e dispositivos",
            "Histórico de login",
            "Recuperação avançada",
          ].map((label) => (
            <div key={label} className="rounded-2xl border border-dashed border-[#D5D9D9] bg-[#F8FAFA] p-4">
              <p className="text-sm font-black text-[#0F1111]">{label}</p>
              <p className="mt-1 text-sm text-[#667085]">Arquitetura reservada para expansão futura.</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

export default function AccountSettingsWorkspace({ user }: AccountSettingsWorkspaceProps) {
  const [section, setSection] = useState<SettingsSectionId>("account");

  const sections: Array<{
    id: SettingsSectionId;
    title: string;
    description: string;
    icon: LucideIcon;
  }> = [
    { id: "account", title: "Minha conta", description: "Identidade e acesso.", icon: User },
    { id: "notifications", title: "Notificações", description: "Central e alertas.", icon: Bell },
    { id: "security", title: "Segurança", description: "Senha e sessões.", icon: Shield },
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-[18px] border border-[#D5D9D9] bg-white p-4 shadow-none">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#2162A1]">Configurações</p>
        <h1 className="mt-2 text-2xl font-black text-[#0F1111]">Conta</h1>
        <p className="mt-2 text-sm leading-6 text-[#667085]">
          Navegue entre identidade, notificações e segurança.
        </p>

        <nav className="mt-5 space-y-2">
          {sections.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  active
                    ? "border-[#D0D5DD] bg-[#F3F4F6]"
                    : "border-transparent bg-transparent hover:border-[#E5E7EB] hover:bg-[#FCFCFD]"
                }`}
              >
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#2162A1] shadow-[0_1px_3px_rgba(15,17,17,0.08)]">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-[#0F1111]">{item.title}</span>
                  <span className="mt-1 block text-xs text-[#667085]">{item.description}</span>
                </span>
                <ChevronRight className={`mt-2 h-4 w-4 shrink-0 ${active ? "text-[#2162A1]" : "text-[#C0C4CC]"}`} />
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="space-y-6">
        {section === "account" ? <AccountSettingsPanel user={user} /> : null}
        {section === "notifications" ? <NotificationPreferencesSection userId={user.id} /> : null}
        {section === "security" ? <SecuritySection user={user} /> : null}
      </div>
    </div>
  );
}

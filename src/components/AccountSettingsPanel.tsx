"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  accountBodyClass,
  accountKickerClass,
  accountPrimaryButtonClass,
  accountSecondaryButtonClass,
  accountSectionClass,
} from "@/components/account/accountUi";

type AccountSettingsPanelProps = {
  user: {
    displayName: string;
    username: string | null;
    email: string;
    avatarUrl: string | null;
    isEmailVerified: boolean;
  };
};

export default function AccountSettingsPanel({ user }: AccountSettingsPanelProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username ?? "");
  const [email, setEmail] = useState(user.email);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsPending(true);

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          username,
          email,
          avatarUrl: avatarUrl.trim() || null,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Não foi possível salvar as alterações.");
        return;
      }

      setMessage("Alterações salvas com sucesso.");
      router.refresh();
    } catch (submitError) {
      console.error("account_settings_save_failed", submitError);
      setError("Não foi possível salvar as alterações.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className={`${accountSectionClass} p-4 sm:p-5 md:p-6`}>
      <div>
        <p className={accountKickerClass}>Minha conta</p>
        <h1 className="mt-2 text-[28px] font-black leading-tight text-[#0F1111] sm:text-[34px]">
          Perfil público
        </h1>
        <p className={`${accountBodyClass} mt-2 max-w-2xl`}>
          Ajuste nome, username, email e avatar sem misturar isso com notificações ou segurança.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-[13px] font-bold text-[#0F1111]">Nome</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="h-10 w-full rounded-md border border-[#D0D5DD] bg-white px-3 text-[13px] outline-none transition focus:border-[#F3A847]"
            />
          </label>
          <label className="space-y-2">
            <span className="text-[13px] font-bold text-[#0F1111]">Username</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-10 w-full rounded-md border border-[#D0D5DD] bg-white px-3 text-[13px] outline-none transition focus:border-[#F3A847]"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-[13px] font-bold text-[#0F1111]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-10 w-full rounded-md border border-[#D0D5DD] bg-white px-3 text-[13px] outline-none transition focus:border-[#F3A847]"
            />
          </label>
          <label className="space-y-2">
            <span className="text-[13px] font-bold text-[#0F1111]">Avatar URL</span>
            <input
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://..."
              className="h-10 w-full rounded-md border border-[#D0D5DD] bg-white px-3 text-[13px] outline-none transition focus:border-[#F3A847]"
            />
          </label>
        </div>

        <p className={accountBodyClass}>
          {user.isEmailVerified
            ? "Email verificado e conta pronta para uso completo."
            : "Seu email ainda precisa de confirmação para liberar interações completas."}
        </p>

        {message ? (
          <div className="rounded-[10px] border border-[#B7E3C0] bg-[#F0FAF4] px-4 py-3 text-[13px] font-medium text-[#1E6B3A]">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] font-medium text-[#B42318]">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className={accountPrimaryButtonClass}
          >
            {isPending ? "Salvando..." : "Salvar alterações"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDisplayName(user.displayName);
              setUsername(user.username ?? "");
              setEmail(user.email);
              setAvatarUrl(user.avatarUrl ?? "");
              setMessage(null);
              setError(null);
            }}
            className={accountSecondaryButtonClass}
          >
            Cancelar
          </button>
        </div>
      </form>
    </section>
  );
}

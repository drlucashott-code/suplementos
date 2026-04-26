"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type SiteAuthFormProps = {
  mode: "login" | "register";
};

export function SiteAuthForm({ mode }: SiteAuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);

  const isRegister = mode === "register";
  const googleError = searchParams.get("google");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    setShowResend(false);

    try {
      const response = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
          email,
          password,
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        pendingVerification?: boolean;
        emailSent?: boolean;
        needsVerification?: boolean;
      };

      if (!response.ok || !data.ok) {
        if (data.needsVerification) {
          setShowResend(true);
        }
        throw new Error(data.error || "auth_failed");
      }

      if (isRegister && data.pendingVerification) {
        setSuccess(
          data.emailSent
            ? "Conta criada. Enviamos um email de confirmação para liberar o acesso."
            : "Conta criada, mas o email de confirmação não pôde ser enviado agora."
        );
        setDisplayName("");
        setEmail("");
        setPassword("");
        setShowResend(true);
        return;
      }

      router.push("/minha-conta");
      router.refresh();
    } catch (requestError) {
      const message =
        requestError instanceof Error && requestError.message !== "auth_failed"
          ? requestError.message
          : isRegister
            ? "Não foi possível criar sua conta agora."
            : "Não foi possível entrar agora.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendVerification() {
    if (!email.trim()) {
      setError("Informe o email para reenviar a confirmação.");
      return;
    }

    setResending(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        sent?: boolean;
        alreadyVerified?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "resend_failed");
      }

      if (data.alreadyVerified) {
        setSuccess("Esse email já foi validado. Você já pode entrar.");
        return;
      }

      setSuccess(
        data.sent
          ? "Enviamos um novo email de confirmação."
          : "Não foi possível reenviar a confirmação agora."
      );
    } catch (resendError) {
      setError(
        resendError instanceof Error && resendError.message !== "resend_failed"
          ? resendError.message
          : "Não foi possível reenviar a confirmação."
      );
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <a
        href="/api/auth/google/start"
        className="flex h-12 w-full items-center justify-center rounded-xl border border-gray-200 bg-white text-sm font-bold text-[#0F1111] transition hover:bg-[#F8FAFA]"
      >
        {isRegister ? "Criar conta com Google" : "Entrar com Google"}
      </a>

      <div className="relative py-1 text-center text-xs uppercase tracking-[0.16em] text-gray-400">
        <span className="bg-white px-3">
          {isRegister ? "ou crie com email" : "ou use seu email"}
        </span>
        <div className="absolute left-0 right-0 top-1/2 -z-10 h-px bg-gray-200" />
      </div>

      {googleError ? (
        <div className="rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#b42318]">
          Não foi possível concluir o login com Google agora.
        </div>
      ) : null}

      {isRegister ? (
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nome</label>
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Como você quer aparecer nos comentários?"
            className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#f3a847]"
            required
          />
        </div>
      ) : null}

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Email</label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@email.com"
          className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#f3a847]"
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Senha</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mínimo de 6 caracteres"
          className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#f3a847]"
          required
        />
      </div>

      {!isRegister ? (
        <div className="text-right">
          <Link href="/esqueci-senha" className="text-sm font-semibold text-[#2162A1] hover:text-[#174e87]">
            Esqueci minha senha
          </Link>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#b42318]">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-xl border border-[#b7ebc6] bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#067647]">
          {success}
        </div>
      ) : null}

      {showResend && !isRegister ? (
        <button
          type="button"
          onClick={handleResendVerification}
          disabled={resending}
          className="w-full rounded-xl border border-[#d5d9d9] bg-white px-4 py-3 text-sm font-bold text-[#0F1111] transition hover:bg-[#F8FAFA] disabled:opacity-70"
        >
          {resending ? "Reenviando..." : "Reenviar confirmação"}
        </button>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="h-12 w-full rounded-xl bg-[#FFD814] text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting
          ? isRegister
            ? "Criando conta..."
            : "Entrando..."
          : isRegister
            ? "Criar conta"
            : "Entrar"}
      </button>

      <p className="text-center text-sm text-gray-500">
        {isRegister ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
        <Link
          href={isRegister ? "/entrar" : "/cadastro"}
          className="font-semibold text-[#2162A1] hover:text-[#174e87]"
        >
          {isRegister ? "Entrar" : "Criar conta"}
        </Link>
      </p>
    </form>
  );
}

export default SiteAuthForm;

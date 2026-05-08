"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, AtSign, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState } from "react";

type SiteAuthFormProps = {
  mode: "login" | "register";
};

type NoticeTone = "success" | "warning" | "error";

type NoticeState = {
  tone: NoticeTone;
  text: string;
};

function GoogleMark() {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-[0_1px_2px_rgba(15,17,17,0.12)]">
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
        <path
          d="M21.35 11.1h-9.18v2.92h5.26c-.23 1.39-1.67 4.08-5.26 4.08A6.04 6.04 0 0 1 6.13 12a6.04 6.04 0 0 1 6.04-6.1c1.72 0 2.86.73 3.52 1.35l2.4-2.3C16.56 3.53 14.75 2.6 12.17 2.6 6.88 2.6 2.58 6.86 2.58 12s4.3 9.4 9.59 9.4c5.52 0 9.18-3.87 9.18-9.33 0-.63-.08-1.1-.2-1.68Z"
          fill="#4285F4"
        />
        <path
          d="m5.2 7.86 3.02 2.22c.82-2.47 3.1-3.84 3.95-4.17-1.26-.75-2.78-1.08-4.24-1.08-1.9 0-3.64.7-4.97 1.84l2.24 1.19Z"
          fill="#EA4335"
        />
        <path d="M12.17 21.4c2.45 0 4.5-.81 6-2.2l-2.76-2.2c-.8.55-1.9 1.09-3.24 1.09-2.5 0-4.63-1.63-5.39-3.86L3.7 16.4A9.48 9.48 0 0 0 12.17 21.4Z" fill="#34A853" />
        <path d="M20.8 13.2c.1-.59.15-1.13.15-1.75 0-.53-.05-1.04-.13-1.55H12.17v2.92h4.85c-.22 1.17-.82 2.14-1.67 2.78l2.76 2.2c1.6-1.48 2.69-3.7 2.69-6.6Z" fill="#FBBC05" />
      </svg>
    </span>
  );
}

function FieldIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#98A2B3]">
      {children}
    </span>
  );
}

export function SiteAuthForm({ mode }: SiteAuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isRegister = mode === "register";
  const googleError = searchParams.get("google");
  const googleErrorMap: Record<string, string> = {
    indisponivel: "O login com Google está indisponível agora.",
    cancelado: "O login com Google foi cancelado.",
    "estado-invalido": "Não foi possível validar a sessão do Google.",
    "token-failed": "Não foi possível concluir a autenticação com o Google.",
    "userinfo-failed": "Não conseguimos ler seus dados do Google agora.",
    erro: "O login com Google encontrou um problema temporário.",
  };
  const googleErrorMessage = googleError ? googleErrorMap[googleError] ?? googleErrorMap.erro : "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice(null);
    setShowResend(false);

    try {
      const response = await fetch(isRegister ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName,
          username,
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
        if (data.needsVerification || data.pendingVerification) {
          setShowResend(true);
          setNotice({
            tone: "warning",
            text: "Seu email ainda não foi confirmado. Você pode reenviar a confirmação abaixo.",
          });
          return;
        }

        throw new Error(data.error || "auth_failed");
      }

      if (data.pendingVerification) {
        setShowResend(true);
        setNotice({
          tone: isRegister ? "success" : "warning",
          text: isRegister
            ? data.emailSent
              ? "Conta criada com sucesso. Enviamos um link de confirmação para o seu email."
              : "Conta criada com sucesso, mas não foi possível enviar o email de confirmação agora."
            : "Seu email ainda não foi confirmado. Enviamos um novo link de confirmação.",
        });
        setPassword("");
        if (isRegister) {
          setDisplayName("");
          setUsername("");
        }
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
    setNotice(null);

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
        setNotice({
          tone: "success",
          text: "Esse email já foi validado. Você já pode entrar normalmente.",
        });
        return;
      }

      setNotice({
        tone: data.sent ? "success" : "warning",
        text: data.sent
          ? "Enviamos um novo email de confirmação."
          : "Não foi possível reenviar a confirmação agora.",
      });
    } catch (resendError) {
      setNotice({
        tone: "error",
        text:
          resendError instanceof Error && resendError.message !== "resend_failed"
            ? resendError.message
            : "Não foi possível reenviar a confirmação.",
      });
    } finally {
      setResending(false);
    }
  }

  const noticeStyles: Record<NoticeTone, string> = {
    success: "border-[#b7ebc6] bg-[#ecfdf3] text-[#067647]",
    warning: "border-[#FEDF89] bg-[#FFFAEB] text-[#B54708]",
    error: "border-[#fecdca] bg-[#fef3f2] text-[#B42318]",
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <a
        href="/api/auth/google/start"
        className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#D0D5DD] bg-white px-4 text-sm font-bold text-[#0F1111] shadow-sm transition hover:bg-[#F8FAFA]"
      >
        <GoogleMark />
        {isRegister ? "Continuar com Google" : "Entrar com Google"}
      </a>

      <div className="relative py-1 text-center text-[11px] uppercase tracking-[0.18em] text-[#98A2B3]">
        <span className="bg-white px-3">{isRegister ? "ou criar com email" : "ou usar email"}</span>
        <div className="absolute left-0 right-0 top-1/2 -z-10 h-px bg-[#EAECF0]" />
      </div>

      {googleErrorMessage ? (
        <div className="rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#B42318]">
          {googleErrorMessage}
        </div>
      ) : null}

      {isRegister ? (
        <>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#344054]">Nome</label>
            <div className="relative">
              <FieldIcon>
                <UserRound className="h-4 w-4" />
              </FieldIcon>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Como você quer aparecer?"
                autoComplete="name"
                className="h-12 w-full rounded-2xl border border-[#D0D5DD] bg-white px-4 pl-11 text-sm text-[#0F1111] outline-none transition focus:border-[#F3A847]"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-[#344054]">Username</label>
            <div className="relative">
              <FieldIcon>
                <AtSign className="h-4 w-4" />
              </FieldIcon>
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="@seuusername"
                autoComplete="username"
                spellCheck={false}
                autoCapitalize="none"
                className="h-12 w-full rounded-2xl border border-[#D0D5DD] bg-white px-4 pl-11 text-sm text-[#0F1111] outline-none transition focus:border-[#F3A847]"
                required
              />
            </div>
          </div>
        </>
      ) : null}

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-[#344054]">Email</label>
        <div className="relative">
          <FieldIcon>
            <Mail className="h-4 w-4" />
          </FieldIcon>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@email.com"
            autoComplete="email"
            inputMode="email"
            className="h-12 w-full rounded-2xl border border-[#D0D5DD] bg-white px-4 pl-11 text-sm text-[#0F1111] outline-none transition focus:border-[#F3A847]"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-[#344054]">Senha</label>
        <div className="relative">
          <FieldIcon>
            <LockKeyhole className="h-4 w-4" />
          </FieldIcon>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={isRegister ? "Mínimo de 6 caracteres" : "Sua senha"}
            autoComplete={isRegister ? "new-password" : "current-password"}
            className="h-12 w-full rounded-2xl border border-[#D0D5DD] bg-white px-4 pl-11 pr-12 text-sm text-[#0F1111] outline-none transition focus:border-[#F3A847]"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#667085] transition hover:bg-[#F8FAFA] hover:text-[#0F1111]"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {!isRegister ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[#667085]">
            Acesse com sua conta Amazonpicks e continue de onde parou.
          </p>
          <Link href="/esqueci-senha" className="text-sm font-semibold text-[#2162A1] hover:text-[#174e87]">
            Esqueci minha senha
          </Link>
        </div>
      ) : (
        <p className="text-sm text-[#667085]">
          A senha precisa ter pelo menos 6 caracteres. A confirmação do email libera favoritos, comentários e listas.
        </p>
      )}

      {notice ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${noticeStyles[notice.tone]}`}>
          {notice.text}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#B42318]">
          {error}
        </div>
      ) : null}

      {showResend ? (
        <button
          type="button"
          onClick={handleResendVerification}
          disabled={resending}
          className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-[#D0D5DD] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#F8FAFA] disabled:opacity-70"
        >
          {resending ? (
            <span className="inline-flex items-center gap-2">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Reenviando...
            </span>
          ) : (
            "Reenviar confirmação"
          )}
        </button>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFD814] px-4 text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            {isRegister ? "Criando conta..." : "Entrando..."}
          </span>
        ) : (
          <>
            {isRegister ? "Criar conta" : "Entrar"}
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="text-center text-sm text-[#667085]">
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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole } from "lucide-react";
import { useMemo, useState } from "react";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const passwordsMatch = useMemo(() => {
    if (!password || !confirmPassword) return null;
    return password === confirmPassword;
  }, [confirmPassword, password]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setSubmitting(false);
      setError("As senhas não coincidem.");
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "reset_failed");
      }

      setSuccess("Senha atualizada com sucesso. Você já pode entrar.");
      setPassword("");
      setConfirmPassword("");
      window.setTimeout(() => {
        router.push("/entrar");
      }, 1200);
    } catch (requestError) {
      setError(
        requestError instanceof Error && requestError.message !== "reset_failed"
          ? requestError.message
          : "Não foi possível redefinir a senha."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-[#344054]">Nova senha</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#98A2B3]">
            <LockKeyhole className="h-4 w-4" />
          </span>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Mínimo de 6 caracteres"
            autoComplete="new-password"
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

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-[#344054]">
          Confirmar senha
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#98A2B3]">
            <LockKeyhole className="h-4 w-4" />
          </span>
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Repita a senha"
            autoComplete="new-password"
            className="h-12 w-full rounded-2xl border border-[#D0D5DD] bg-white px-4 pl-11 pr-12 text-sm text-[#0F1111] outline-none transition focus:border-[#F3A847]"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((current) => !current)}
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#667085] transition hover:bg-[#F8FAFA] hover:text-[#0F1111]"
            aria-label={showConfirmPassword ? "Ocultar confirmação" : "Mostrar confirmação"}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {passwordsMatch === false ? (
          <p className="mt-2 text-sm font-medium text-[#B42318]">As senhas não coincidem.</p>
        ) : passwordsMatch === true ? (
          <p className="mt-2 text-sm font-medium text-[#067647]">As senhas conferem.</p>
        ) : (
          <p className="mt-2 text-sm text-[#667085]">Use uma senha segura e fácil de lembrar.</p>
        )}
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#fecdca] bg-[#fef3f2] px-4 py-3 text-sm font-medium text-[#B42318]">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-2xl border border-[#b7ebc6] bg-[#ecfdf3] px-4 py-3 text-sm font-medium text-[#067647]">
          {success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting || passwordsMatch === false}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFD814] px-4 text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00] disabled:opacity-70"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Atualizando...
          </span>
        ) : (
          <>
            Salvar nova senha
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>

      <p className="text-center text-sm text-[#667085]">
        <Link href="/entrar" className="font-semibold text-[#2162A1] hover:text-[#174e87]">
          Voltar para login
        </Link>
      </p>
    </form>
  );
}

export default ResetPasswordForm;

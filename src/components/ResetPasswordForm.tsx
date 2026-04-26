"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nova senha</label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mínimo de 6 caracteres"
          className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#f3a847]"
          required
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Confirmar senha</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Repita a senha"
          className="h-12 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#f3a847]"
          required
        />
      </div>

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

      <button
        type="submit"
        disabled={submitting}
        className="h-12 w-full rounded-xl bg-[#FFD814] text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00] disabled:opacity-70"
      >
        {submitting ? "Atualizando..." : "Salvar nova senha"}
      </button>

      <p className="text-center text-sm text-gray-500">
        <Link href="/entrar" className="font-semibold text-[#2162A1] hover:text-[#174e87]">
          Voltar para login
        </Link>
      </p>
    </form>
  );
}

export default ResetPasswordForm;

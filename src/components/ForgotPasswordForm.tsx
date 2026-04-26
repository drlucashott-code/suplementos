"use client";

import Link from "next/link";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      setMessage("Se existir uma conta com esse email, enviamos um link para redefinir a senha.");
    } catch (error) {
      console.error("forgot_password_submit_failed", error);
      setMessage("Não foi possível processar o pedido agora.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      {message ? (
        <div className="rounded-xl border border-[#d5d9d9] bg-[#F8FAFA] px-4 py-3 text-sm font-medium text-[#344054]">
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="h-12 w-full rounded-xl bg-[#FFD814] text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00] disabled:opacity-70"
      >
        {submitting ? "Enviando..." : "Enviar link de recuperação"}
      </button>

      <p className="text-center text-sm text-gray-500">
        <Link href="/entrar" className="font-semibold text-[#2162A1] hover:text-[#174e87]">
          Voltar para login
        </Link>
      </p>
    </form>
  );
}

export default ForgotPasswordForm;

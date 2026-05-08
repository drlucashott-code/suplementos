"use client";

import Link from "next/link";
import { ArrowRight, LoaderCircle, Mail } from "lucide-react";
import { useState } from "react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"success" | "error" | "neutral">("neutral");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "forgot_failed");
      }

      setMessageTone("success");
      setMessage("Se existir uma conta com esse email, enviamos um link para redefinir a senha.");
    } catch (error) {
      console.error("forgot_password_submit_failed", error);
      setMessageTone("error");
      setMessage("Não foi possível processar o pedido agora.");
    } finally {
      setSubmitting(false);
    }
  }

  const messageClass =
    messageTone === "success"
      ? "border-[#b7ebc6] bg-[#ecfdf3] text-[#067647]"
      : messageTone === "error"
        ? "border-[#fecdca] bg-[#fef3f2] text-[#B42318]"
        : "border-[#d5d9d9] bg-[#F8FAFA] text-[#344054]";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-[#344054]">Email</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#98A2B3]">
            <Mail className="h-4 w-4" />
          </span>
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

      {message ? (
        <div className={`rounded-2xl border px-4 py-3 text-sm font-medium ${messageClass}`}>
          {message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#FFD814] px-4 text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00] disabled:opacity-70"
      >
        {submitting ? (
          <span className="inline-flex items-center gap-2">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Enviando...
          </span>
        ) : (
          <>
            Enviar link de recuperação
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

export default ForgotPasswordForm;

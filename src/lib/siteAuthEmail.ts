import { createHash, randomUUID } from "node:crypto";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

function getEmailFrom() {
  return (
    process.env.SITE_AUTH_EMAIL_FROM ??
    process.env.CLICK_ALERT_EMAIL_FROM ??
    process.env.FALLBACK_ALERT_EMAIL_FROM ??
    "onboarding@resend.dev"
  );
}

async function sendSiteEmail(params: {
  to: string;
  subject: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY não configurada. Email não enviado.");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getEmailFrom(),
        to: [params.to],
        subject: params.subject,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Falha ao enviar email do site:", errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erro ao enviar email do site:", error);
    return false;
  }
}

export function makeEmailVerificationToken() {
  const rawToken = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  return {
    rawToken,
    tokenHash: hashToken(rawToken),
  };
}

export function getEmailVerificationTokenHash(token: string) {
  return hashToken(token);
}

export function makePasswordResetToken() {
  const rawToken = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  return {
    rawToken,
    tokenHash: hashToken(rawToken),
  };
}

export function getPasswordResetTokenHash(token: string) {
  return hashToken(token);
}

export async function sendSiteVerificationEmail(params: {
  email: string;
  displayName: string;
  token: string;
}) {
  const verifyUrl = `${getBaseUrl()}/verificar-email?token=${encodeURIComponent(params.token)}`;
  const subject = "[amazonpicks] Confirme seu cadastro";
  const text = [
    `Olá, ${params.displayName}.`,
    "",
    "Recebemos seu cadastro no amazonpicks.",
    "Para liberar favoritos, comentários e listas, confirme seu email no link abaixo:",
    verifyUrl,
    "",
    "Se você não pediu esta conta, pode ignorar esta mensagem.",
  ].join("\n");

  return sendSiteEmail({
    to: params.email,
    subject,
    text,
  });
}

export async function sendPasswordResetEmail(params: {
  email: string;
  displayName: string;
  token: string;
}) {
  const resetUrl = `${getBaseUrl()}/redefinir-senha?token=${encodeURIComponent(params.token)}`;
  const subject = "[amazonpicks] Redefinir senha";
  const text = [
    `Olá, ${params.displayName}.`,
    "",
    "Recebemos um pedido para redefinir a senha da sua conta no amazonpicks.",
    "Use o link abaixo para cadastrar uma nova senha:",
    resetUrl,
    "",
    "Se você não pediu essa redefinição, pode ignorar esta mensagem.",
  ].join("\n");

  return sendSiteEmail({
    to: params.email,
    subject,
    text,
  });
}

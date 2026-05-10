const SITE_BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

function getEmailFrom() {
  return (
    process.env.NOTIFICATION_EMAIL_FROM ??
    process.env.SITE_AUTH_EMAIL_FROM ??
    process.env.FALLBACK_ALERT_EMAIL_FROM ??
    "onboarding@resend.dev"
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoney(value?: number | null) {
  if (value == null || Number.isNaN(value)) return null;
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function renderDetails(details?: Array<{ label: string; value: string }>) {
  if (!details || details.length === 0) return "";

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border-collapse:collapse;">
      ${details
        .map(
          (item) => `
            <tr>
              <td style="padding:8px 0;font-size:13px;color:#667085;font-family:Arial,sans-serif;">${escapeHtml(
                item.label
              )}</td>
              <td style="padding:8px 0;font-size:13px;font-weight:700;color:#0F1111;font-family:Arial,sans-serif;text-align:right;">${escapeHtml(
                item.value
              )}</td>
            </tr>
          `
        )
        .join("")}
    </table>
  `;
}

export type NotificationEmailInput = {
  to: string;
  subject: string;
  headline: string;
  body: string;
  href: string;
  ctaLabel: string;
  eyebrow?: string;
  details?: Array<{ label: string; value: string }>;
  footerNote?: string;
};

export async function sendTransactionalEmail(input: NotificationEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY nao configurada. Email de notificacao nao enviado.");
    return false;
  }

  const plainLines = [
    input.eyebrow ? `[${input.eyebrow}]` : null,
    input.headline,
    "",
    input.body,
    "",
    `Acesse: ${input.href}`,
    input.details?.length
      ? ""
      : null,
    ...(input.details ?? []).map((detail) => `${detail.label}: ${detail.value}`),
    "",
    input.footerNote ?? "Você pode ajustar suas preferências de notificações na conta.",
  ].filter((line): line is string => line != null);

  const html = `
    <div style="margin:0;background:#E3E6E6;padding:24px 0;font-family:Arial,sans-serif;color:#0F1111;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #D5D9D9;border-radius:12px;overflow:hidden;">
        <div style="padding:20px 24px;border-bottom:1px solid #EAECF0;background:#0F1111;color:#ffffff;">
          <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#FDBB4B;font-weight:700;">amazonpicks</div>
          <div style="font-size:22px;line-height:1.2;font-weight:800;margin-top:8px;">${escapeHtml(
            input.headline
          )}</div>
        </div>
        <div style="padding:24px;">
          ${input.eyebrow ? `<div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#2162A1;font-weight:700;margin-bottom:10px;">${escapeHtml(
            input.eyebrow
          )}</div>` : ""}
          <div style="font-size:15px;line-height:1.6;color:#0F1111;">${escapeHtml(input.body)}</div>
          ${renderDetails(input.details)}
          <div style="margin-top:24px;">
            <a href="${escapeHtml(input.href)}" style="display:inline-block;background:#FFD814;color:#111111;text-decoration:none;font-size:14px;font-weight:700;padding:12px 18px;border-radius:8px;border:1px solid #FCD200;">${escapeHtml(
              input.ctaLabel
            )}</a>
          </div>
          <div style="margin-top:20px;font-size:12px;line-height:1.5;color:#667085;">${escapeHtml(
            input.footerNote ?? "Você pode ajustar suas preferências de notificações na conta."
          )}</div>
        </div>
      </div>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: getEmailFrom(),
        to: [input.to],
        subject: input.subject,
        text: plainLines.join("\n"),
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("notification_email_send_failed", errorText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("notification_email_send_error", error);
    return false;
  }
}

export function buildNotificationEmailPayload(params: {
  kind: "price_drop" | "back_in_stock" | "composite_price_stock" | "comment" | "mention" | "interaction" | "list_follow";
  to: string;
  actorName?: string | null;
  title: string;
  body: string;
  href: string;
  productName?: string | null;
  listName?: string | null;
  oldPrice?: number | null;
  newPrice?: number | null;
  priceDropPercent?: number | null;
}) {
  switch (params.kind) {
    case "price_drop":
      return {
        to: params.to,
        subject: "Um produto monitorado ficou mais barato",
        headline: "Preço caiu no produto que você acompanha",
        body: params.body,
        href: params.href,
        ctaLabel: "Ver produto",
        eyebrow: "Produtos e monitoramento",
        details: [
          params.productName ? { label: "Produto", value: params.productName } : null,
          params.oldPrice != null ? { label: "Preço anterior", value: formatMoney(params.oldPrice) ?? "" } : null,
          params.newPrice != null ? { label: "Preço atual", value: formatMoney(params.newPrice) ?? "" } : null,
          params.priceDropPercent != null ? { label: "Queda", value: `${params.priceDropPercent}%` } : null,
        ].filter((item): item is { label: string; value: string } => item != null),
      };
    case "back_in_stock":
      return {
        to: params.to,
        subject: "Produto monitorado voltou ao estoque",
        headline: "Produto voltou ao estoque",
        body: params.body,
        href: params.href,
        ctaLabel: "Ver produto",
        eyebrow: "Produtos e monitoramento",
        details: params.productName ? [{ label: "Produto", value: params.productName }] : [],
      };
    case "composite_price_stock":
      return {
        to: params.to,
        subject: "Produto voltou ao estoque com preço reduzido",
        headline: "Produto voltou ao estoque com preço reduzido",
        body: params.body,
        href: params.href,
        ctaLabel: "Ver produto",
        eyebrow: "Produtos e monitoramento",
        details: [
          params.productName ? { label: "Produto", value: params.productName } : null,
          params.oldPrice != null ? { label: "Preço anterior", value: formatMoney(params.oldPrice) ?? "" } : null,
          params.newPrice != null ? { label: "Preço atual", value: formatMoney(params.newPrice) ?? "" } : null,
          params.priceDropPercent != null ? { label: "Queda", value: `${params.priceDropPercent}%` } : null,
        ].filter((item): item is { label: string; value: string } => item != null),
      };
    case "comment":
      return {
        to: params.to,
        subject: "Responderam seu comentário",
        headline: "Responderam seu comentário",
        body: params.body,
        href: params.href,
        ctaLabel: "Ver conversa",
        eyebrow: "Atividade social",
        details: [
          params.actorName ? { label: "Usuário", value: params.actorName } : null,
          params.listName ? { label: "Lista", value: params.listName } : null,
        ].filter((item): item is { label: string; value: string } => item != null),
      };
    case "mention":
      return {
        to: params.to,
        subject: "Você foi mencionado",
        headline: "Você foi mencionado",
        body: params.body,
        href: params.href,
        ctaLabel: "Ver comentário",
        eyebrow: "Atividade social",
        details: [
          params.actorName ? { label: "Usuário", value: params.actorName } : null,
          params.listName ? { label: "Contexto", value: params.listName } : null,
        ].filter((item): item is { label: string; value: string } => item != null),
      };
    case "interaction":
      return {
        to: params.to,
        subject: "Nova interação em sua lista",
        headline: "Nova interação em sua lista",
        body: params.body,
        href: params.href,
        ctaLabel: "Ver interação",
        eyebrow: "Atividade social",
        details: [
          params.actorName ? { label: "Usuário", value: params.actorName } : null,
          params.listName ? { label: "Lista", value: params.listName } : null,
        ].filter((item): item is { label: string; value: string } => item != null),
      };
    case "list_follow":
      return {
        to: params.to,
        subject: "Uma lista sua ganhou um seguidor",
        headline: "Uma lista sua ganhou um seguidor",
        body: params.body,
        href: params.href,
        ctaLabel: "Abrir lista",
        eyebrow: "Listas",
        details: [
          params.actorName ? { label: "Usuário", value: params.actorName } : null,
          params.listName ? { label: "Lista", value: params.listName } : null,
        ].filter((item): item is { label: string; value: string } => item != null),
      };
    default:
      return {
        to: params.to,
        subject: params.title,
        headline: params.title,
        body: params.body,
        href: params.href,
        ctaLabel: "Abrir",
        eyebrow: "amazonpicks",
        details: [],
      };
  }
}

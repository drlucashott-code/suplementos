/**
 * Resolve o MLB a partir de um link afiliado do Mercado Livre (/sec/...)
 * Estratégia robusta:
 * 1) tenta URL final
 * 2) fallback para HTML
 */
export async function resolveMLBFromAffiliateUrl(
  affiliateUrl: string
): Promise<string> {
  const res = await fetch(affiliateUrl, {
    method: "GET",
    redirect: "follow",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });

  const finalUrl = res.url;

  // -------------------------
  // 1️⃣ TENTA PELA URL FINAL
  // -------------------------
  const urlMatch = finalUrl.match(/MLB\d+/i);
  if (urlMatch) {
    return urlMatch[0].toUpperCase();
  }

  // -------------------------
  // 2️⃣ FALLBACK: HTML
  // -------------------------
  const html = await res.text();

  // padrão mais comum
  const htmlMatch =
    html.match(/\/p\/(MLB\d+)/i) ||
    html.match(/"id"\s*:\s*"(MLB\d+)"/i) ||
    html.match(/"product_id"\s*:\s*"(MLB\d+)"/i) ||
    html.match(/MLB\d{6,}/i);

  if (htmlMatch) {
    return htmlMatch[1]
      ? htmlMatch[1].toUpperCase()
      : htmlMatch[0].toUpperCase();
  }

  throw new Error(
    "MLB não encontrado nem na URL final nem no HTML do afiliado"
  );
}

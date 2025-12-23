/**
 * Gera link de afiliado do Mercado Livre
 * (formato correto para COMPRA)
 */
export function createMercadoLivreAffiliateUrl(
  mlb: string
): string {
  if (!mlb) {
    throw new Error("MLB inválido");
  }

  const cleanMlb = mlb.replace(/^MLB/i, "");

  // URL pública válida do produto
  const productUrl =
    `https://www.mercadolivre.com.br/p/MLB${cleanMlb}`;

  return (
    "https://www.mercadolivre.com.br/seguro/redirect-afiliado" +
    `?url=${encodeURIComponent(productUrl)}`
  );
}

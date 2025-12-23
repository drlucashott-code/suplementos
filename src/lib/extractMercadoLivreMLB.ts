/**
 * Extrai MLB a partir de:
 * - Código direto (MLB123456789)
 * - URL do Mercado Livre
 */
export function extractMercadoLivreMLB(input: string): string | null {
  if (!input) return null;

  const trimmed = input.trim();

  // Caso 1: já é um MLB válido
  if (/^MLB\d+$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // Caso 2: URL com item_id=MLB...
  const itemIdMatch = trimmed.match(/item_id=(MLB[-]?\d+)/i);
  if (itemIdMatch) {
    return itemIdMatch[1].replace("-", "").toUpperCase();
  }

  // Caso 3: URL padrão com /MLB... ou MLB-...
  const urlMatch = trimmed.match(/(MLB[-]?\d+)/i);
  if (urlMatch) {
    return urlMatch[1].replace("-", "").toUpperCase();
  }

  return null;
}

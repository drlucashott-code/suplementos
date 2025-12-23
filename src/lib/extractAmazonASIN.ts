/**
 * Extrai ASIN a partir de:
 * - ASIN puro (ex: B08XYZ1234)
 * - URL da Amazon
 */
export function extractAmazonASIN(input: string): string | null {
  if (!input) return null;

  const trimmed = input.trim();

  // Caso 1: já é um ASIN válido
  if (/^[A-Z0-9]{10}$/.test(trimmed)) {
    return trimmed;
  }

  // Caso 2: URL da Amazon
  const match = trimmed.match(
    /\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i
  );

  return match ? match[1].toUpperCase() : null;
}

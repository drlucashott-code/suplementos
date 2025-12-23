/**
 * Extrai ASIN de qualquer link da Amazon Brasil
 */
export function extractAmazonASIN(input: string): string {
  // 1️⃣ tenta direto no texto
  const directMatch = input.match(/\b([A-Z0-9]{10})\b/);
  if (directMatch) return directMatch[1];

  // 2️⃣ tenta padrões comuns da URL
  const patterns = [
    /\/dp\/([A-Z0-9]{10})/i,
    /\/gp\/product\/([A-Z0-9]{10})/i,
    /\/product\/([A-Z0-9]{10})/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }

  throw new Error("ASIN não encontrado no link da Amazon");
}

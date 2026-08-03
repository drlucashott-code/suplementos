import { createHash, randomBytes } from "node:crypto";

export const MERCADO_LIVRE_TEST_ITEM_ID = "MLB3582540395";

export function getMercadoLivreRedirectUri() {
  const baseUrl = process.env.SITE_PUBLIC_URL || process.env.NEXT_PUBLIC_SITE_URL;

  if (!baseUrl || !baseUrl.startsWith("https://")) {
    throw new Error("SITE_PUBLIC_URL precisa ser uma URL HTTPS configurada.");
  }

  return `${baseUrl.replace(/\/$/, "")}/api/mercadolivre/oauth/callback`;
}

export function createPkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  return { verifier, challenge };
}

export function createOAuthState() {
  return randomBytes(24).toString("base64url");
}

export function normalizeMercadoLivreItemId(value: string | null | undefined) {
  const normalized = (value || "").trim().toUpperCase();
  return /^MLB\d{8,12}$/.test(normalized)
    ? normalized
    : MERCADO_LIVRE_TEST_ITEM_ID;
}

export function getMercadoLivreClientId() {
  const clientId = process.env.ML_CLIENT_ID?.trim();
  if (!clientId) throw new Error("ML_CLIENT_ID não configurado.");
  return clientId;
}

export function getMercadoLivreClientSecret() {
  const clientSecret = process.env.ML_CLIENT_SECRET?.trim();
  if (!clientSecret) throw new Error("ML_CLIENT_SECRET não configurado.");
  return clientSecret;
}

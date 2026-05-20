const DEFAULT_PUBLIC_SITE_URL = "https://amazonpicks.com.br";

function normalizeBaseUrl(value?: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/$/, "");
}

export function getPublicSiteUrl() {
  return (
    normalizeBaseUrl(process.env.SITE_PUBLIC_URL) ??
    normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    DEFAULT_PUBLIC_SITE_URL
  );
}

export function buildAbsoluteUrl(path = "/") {
  const baseUrl = getPublicSiteUrl();

  if (!path || path === "/") return baseUrl;
  if (/^https?:\/\//i.test(path)) return path;

  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

// src/lib/utils.ts
export function getOptimizedAmazonUrl(url: string, size: number = 320) {
  if (!url || !url.includes("media-amazon.com")) return url;
  // Substitui padrões como ._SL500_ ou ._AC_UL500_ por ._SL320_
  return url.replace(/\._[A-Z0-9]+_\./, `._SL${size}_.`);
}
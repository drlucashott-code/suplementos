"use client";

import toast from "react-hot-toast";

export function buildProductShareUrl(productShareKey: string) {
  return new URL(`/produto/${productShareKey}`, window.location.origin).toString();
}

export function buildWhatsAppShareUrl(productShareKey: string, productName: string) {
  const shareUrl = buildProductShareUrl(productShareKey);
  const message = `${productName} - ${shareUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export async function shareProductViaSystem(productShareKey: string, productName: string) {
  const shareUrl = buildProductShareUrl(productShareKey);

  try {
    if (typeof navigator.share === "function") {
      await navigator.share({
        title: productName,
        url: shareUrl,
      });
      return true;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return true;
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link do produto copiado.");
      return true;
    }
  } catch {}

  toast.error("Nao foi possivel compartilhar agora.");
  return false;
}

export async function copyProductShareLink(productShareKey: string) {
  const shareUrl = buildProductShareUrl(productShareKey);
  await navigator.clipboard.writeText(shareUrl);
  toast.success("Link do produto copiado.");
}

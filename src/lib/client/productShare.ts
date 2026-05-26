"use client";

import toast from "react-hot-toast";

function buildShareUrl(productId: string) {
  const path = `/produto/${productId}`;
  return new URL(path, window.location.origin).toString();
}

export async function shareProductLink(productId: string, productName: string) {
  const shareUrl = buildShareUrl(productId);

  try {
    if (typeof navigator.share === "function") {
      await navigator.share({
        title: productName,
        url: shareUrl,
      });
      return;
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return;
    }
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link do produto copiado.");
      return;
    }
  } catch {}

  toast.error("Nao foi possivel compartilhar agora.");
}

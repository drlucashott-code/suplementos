"use client";

import { ExternalLink } from "lucide-react";
import { type MouseEvent } from "react";
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

type ProductShareInlineButtonProps = {
  productShareKey: string;
  productName: string;
  className: string;
  iconClassName?: string;
  ariaLabel?: string;
};

export function ProductShareInlineButton({
  productShareKey,
  productName,
  className,
  iconClassName = "h-4 w-4",
  ariaLabel = "Compartilhar produto",
}: ProductShareInlineButtonProps) {
  return (
    <button
      type="button"
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.stopPropagation();
        void shareProductViaSystem(productShareKey, productName);
      }}
      className={className}
      aria-label={ariaLabel}
    >
      <ExternalLink className={iconClassName} />
    </button>
  );
}

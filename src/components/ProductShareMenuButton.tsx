"use client";

import { Copy, ExternalLink, MessageCircle, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  buildProductShareUrl,
  buildWhatsAppShareUrl,
  copyProductShareLink,
  shareProductViaSystem,
} from "@/lib/client/productShare";

type ProductShareMenuButtonProps = {
  productShareKey: string;
  productName: string;
  className: string;
  iconClassName?: string;
  ariaLabel?: string;
};

export default function ProductShareMenuButton({
  productShareKey,
  productName,
  className,
  iconClassName = "h-4 w-4",
  ariaLabel = "Compartilhar produto",
}: ProductShareMenuButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const shareUrl = typeof window === "undefined" ? "" : buildProductShareUrl(productShareKey);
  const whatsappUrl =
    typeof window === "undefined" ? "" : buildWhatsAppShareUrl(productShareKey, productName);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
        className={className}
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <ExternalLink className={iconClassName} />
      </button>

      {open ? (
        <div className="absolute right-0 top-9 z-20 min-w-[190px] rounded-[10px] border border-[#D5D9D9] bg-white p-1 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
          <button
            type="button"
            onClick={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              window.open(whatsappUrl, "_blank", "noopener,noreferrer");
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-[13px] font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA]"
          >
            <MessageCircle className="h-4 w-4 text-[#25D366]" />
            WhatsApp
          </button>

          <button
            type="button"
            onClick={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              await copyProductShareLink(productShareKey);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-[13px] font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA]"
          >
            <Copy className="h-4 w-4 text-[#667085]" />
            Copiar link
          </button>

          <button
            type="button"
            onClick={async (event) => {
              event.preventDefault();
              event.stopPropagation();
              await shareProductViaSystem(productShareKey, productName);
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 rounded-[8px] px-3 py-2 text-left text-[13px] font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA]"
          >
            <Share2 className="h-4 w-4 text-[#667085]" />
            Compartilhar
          </button>
        </div>
      ) : null}
    </div>
  );
}

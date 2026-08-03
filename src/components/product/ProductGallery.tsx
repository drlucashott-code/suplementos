"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ImageOff, X, ZoomIn } from "lucide-react";
import amazonImageLoader from "@/lib/amazonImageLoader";
import { getOptimizedAmazonUrl } from "@/lib/utils";

// Galeria honesta: cada produto tem UMA imagem (vinda da Amazon). Em vez de
// fingir múltiplas miniaturas, mostramos a imagem grande com zoom em lightbox.
export function ProductGallery({
  imageUrl,
  name,
}: {
  imageUrl: string | null;
  name: string;
}) {
  const [zoomed, setZoomed] = useState(false);
  const src = imageUrl?.trim() ? getOptimizedAmazonUrl(imageUrl, 800) : null;
  const zoomSrc = imageUrl?.trim() ? getOptimizedAmazonUrl(imageUrl, 1600) : null;

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setZoomed(false);
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [zoomed]);

  if (!src) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-[10px] border border-[#D5D9D9] bg-[#F8FAFA] text-[#98A2B3]">
        <ImageOff className="h-16 w-16" />
      </div>
    );
  }

  return (
    <div className="lg:sticky lg:top-[88px]">
      <button
        type="button"
        onClick={() => setZoomed(true)}
        className="group relative block aspect-square w-full cursor-zoom-in overflow-hidden rounded-[10px] border border-[#D5D9D9] bg-white"
        aria-label="Ampliar imagem do produto"
      >
        <Image
          loader={amazonImageLoader}
          src={src}
          alt={name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 520px"
          className="object-contain p-6 mix-blend-multiply transition-transform duration-300 group-hover:scale-[1.04]"
        />
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full border border-[#D5D9D9] bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-[#565959] shadow-sm backdrop-blur">
          <ZoomIn className="h-3.5 w-3.5" />
          Ampliar
        </span>
      </button>

      {zoomed && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4"
              onClick={() => setZoomed(false)}
              role="dialog"
              aria-modal="true"
              aria-label={`Imagem ampliada de ${name}`}
            >
              <button
                type="button"
                onClick={() => setZoomed(false)}
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-[#0F1111] shadow-lg transition hover:bg-white"
                aria-label="Fechar imagem ampliada"
              >
                <X className="h-5 w-5" />
              </button>
              <div
                className="relative h-[85vh] w-[92vw] max-w-[1100px]"
                onClick={(event) => event.stopPropagation()}
              >
                <Image
                  loader={amazonImageLoader}
                  src={zoomSrc ?? src}
                  alt={name}
                  fill
                  sizes="92vw"
                  className="object-contain"
                />
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

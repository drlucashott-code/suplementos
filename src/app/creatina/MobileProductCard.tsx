"use client";

import { CreatineForm } from "@prisma/client";

type Product = {
  id: string;
  name: string;
  imageUrl: string;
  flavor: string | null;
  form?: CreatineForm;

  price: number;
  affiliateUrl: string;

  pricePerGram: number;
  doses: number;

  discountPercent?: number | null;
};

export function MobileProductCard({
  product,
  isBest,
}: {
  product: Product;
  isBest?: boolean;
}) {
  return (
    <div className="border border-gray-300 bg-white p-3 relative">
      {/* BADGES */}
      {product.discountPercent && (
        <div className="absolute top-1 left-1 bg-[#B12704] text-white text-[10px] px-2 py-0.5">
          {product.discountPercent}% OFF
        </div>
      )}

      {isBest && (
        <div className="absolute top-1 right-1 bg-green-600 text-white text-[10px] px-2 py-0.5">
          Melhor custo-benefício
        </div>
      )}

      <div className="flex gap-3 items-start">
        {/* IMAGEM — MAIOR E ALINHADA AO TOPO */}
        <div className="w-36 flex-shrink-0">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-auto object-contain block"
            loading="lazy"
          />
        </div>

        {/* TEXTO — MAIS COMPACTO */}
        <div className="flex-1 text-sm text-[#0F1111] leading-tight">
          {/* TÍTULO */}
          <h2 className="font-bold text-[14px] mb-1">
            {product.name}
          </h2>

          {/* INFO */}
          <div className="space-y-0.5">
            <p>
              Apresentação:{" "}
              {product.form === CreatineForm.CAPSULE
                ? "Cápsula"
                : product.form === CreatineForm.GUMMY
                ? "Gummy"
                : "Pó"}
            </p>

            <p>
              Sabor: {product.flavor ?? "Sem sabor"}
            </p>

            <p>Doses: {Math.floor(product.doses)}</p>

            <p>
              Preço por grama: R${" "}
              {product.pricePerGram.toFixed(2)}
            </p>
          </div>

          {/* PREÇO */}
          <div className="flex items-start gap-1 mt-1">
            <span className="text-xs mt-1">R$</span>
            <span className="text-xl font-bold">
              {product.price.toFixed(2)}
            </span>
          </div>

          {/* BOTÃO */}
          <a
            href={product.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 bg-[#FFD814] hover:bg-[#F7CA00] text-black text-sm px-4 py-2"
          >
            Comprar na Amazon
          </a>
        </div>
      </div>
    </div>
  );
}

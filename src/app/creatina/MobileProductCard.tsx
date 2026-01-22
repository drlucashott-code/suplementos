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
  avg30Price?: number | null;
};

export function MobileProductCard({
  product,
  isBest,
}: {
  product: Product;
  isBest?: boolean;
}) {
  const [int, cents] = product.price
    .toFixed(2)
    .split(".");

  return (
    <div
      className={`border p-3 relative ${
        isBest
          ? "border-green-500 bg-green-50"
          : "border-gray-300 bg-white"
      }`}
    >
      <div className="flex justify-between items-center mb-2">
        {product.discountPercent ? (
          <span className="bg-[#B12704] text-white text-[11px] px-3 py-0.5 rounded-full">
            {product.discountPercent}% OFF
          </span>
        ) : (
          <span />
        )}

        {isBest && (
          <span className="bg-green-600 text-white text-[11px] px-3 py-0.5 rounded-full">
            Melhor custo-benefício
          </span>
        )}
      </div>

      <div className="flex gap-3 items-start">
        <div className="w-36 h-36 flex items-center justify-center bg-white">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        <div className="flex-1 text-sm text-[#0F1111] leading-tight">
          <h2 className="font-bold text-[14px] mb-1">
            {product.name}
          </h2>

          <div className="space-y-0.5">
            <p>
              Apresentação:{" "}
              {product.form === CreatineForm.CAPSULE
                ? "Cápsula"
                : product.form === CreatineForm.GUMMY
                ? "Gummy"
                : "Pó"}
            </p>
            <p>Sabor: {product.flavor ?? "Sem sabor"}</p>
            <p>Doses: {Math.floor(product.doses)}</p>
            <p>
              Preço por grama: R${" "}
              {product.pricePerGram.toFixed(2)}
            </p>
          </div>

          {/* PREÇO */}
          <div className="flex items-end gap-1 mt-1">
            <span className="text-xs mb-1">R$</span>
            <span className="text-xl font-bold leading-none">
              {int}
            </span>
            <span className="text-xs mb-1">{cents}</span>

            {product.avg30Price && (
              <span className="text-xs text-gray-500 line-through ml-2 mb-1">
                R$ {product.avg30Price.toFixed(2)}
              </span>
            )}
          </div>

          {product.discountPercent && (
            <p className="text-xs text-green-700 mt-0.5">
              🔻 {product.discountPercent}% abaixo da
              média dos últimos 30 dias
            </p>
          )}

          <a
            href={product.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 bg-[#FFD814] hover:bg-[#F7CA00] text-black text-sm px-4 py-2 rounded-xl"
          >
            Comprar na Amazon
          </a>
        </div>
      </div>
    </div>
  );
}

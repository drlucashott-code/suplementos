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
    <div
      className={`border rounded-lg p-4 bg-white relative ${
        isBest ? "border-green-600" : "border-gray-200"
      }`}
    >
      {/* BADGES */}
      {product.discountPercent && (
        <div className="absolute -top-2 left-2 bg-orange-500 text-white text-[11px] font-semibold px-3 py-0.5 rounded-full">
          🔻 {product.discountPercent}% OFF
        </div>
      )}

      {isBest && (
        <div className="absolute -top-2 right-2 bg-green-600 text-white text-[11px] font-semibold px-3 py-0.5 rounded-full">
          Melhor custo-benefício
        </div>
      )}

      <div className="flex gap-4 items-start">
        {/* IMAGEM */}
        <div className="w-44 h-44 flex-shrink-0 flex items-center justify-center">
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        </div>

        {/* TEXTO */}
        <div className="flex-1 flex flex-col text-sm text-gray-800">
          {/* TÍTULO */}
          <h2 className="font-bold text-[15px] leading-snug mb-2">
            {product.name}
          </h2>

          {/* INFO LIST — ESPAÇAMENTO UNIFORME */}
          <div className="flex flex-col gap-1 leading-relaxed">
            <p>
              <span className="font-medium">Apresentação:</span>{" "}
              {product.form === CreatineForm.CAPSULE
                ? "Cápsula"
                : product.form === CreatineForm.GUMMY
                ? "Gummy"
                : "Pó"}
            </p>

            <p>
              <span className="font-medium">Sabor:</span>{" "}
              {product.flavor ?? "Sem sabor"}
            </p>

            <p>
              <span className="font-medium">Doses:</span>{" "}
              {Math.floor(product.doses)}
            </p>

            <p>
              <span className="font-medium">Preço por grama:</span>{" "}
              R$ {product.pricePerGram.toFixed(2)}
            </p>
          </div>

          {/* PREÇO */}
          <div className="flex items-start gap-1 mt-2">
            <span className="text-sm font-semibold mt-1">
              R$
            </span>
            <span className="text-2xl font-bold">
              {product.price.toFixed(2)}
            </span>
          </div>

          {product.discountPercent && (
            <p className="text-xs text-green-700 mt-1">
              🔻 {product.discountPercent}% abaixo da média dos últimos 30 dias
            </p>
          )}

          {/* BOTÃO — SEM NEGRITO */}
          <a
            href={product.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 block w-full text-center bg-yellow-400 hover:bg-yellow-500 text-black font-normal py-3 rounded-lg transition-colors"
          >
            Comprar na Amazon
          </a>
        </div>
      </div>
    </div>
  );
}

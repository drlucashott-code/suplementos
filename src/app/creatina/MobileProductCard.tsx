"use client";

import { CreatineForm } from "@prisma/client";

type Product = {
  name: string;
  imageUrl: string;
  flavor: string | null;
  form: CreatineForm;

  doses: number;
  pricePerGram: number;

  price: number;
  affiliateUrl: string;

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
      className={`rounded-xl border p-4 space-y-3 relative ${
        isBest
          ? "border-green-600 bg-green-100"
          : "border-gray-200 bg-white"
      }`}
    >
      {/* 🔻 BADGE DE DESCONTO (ESQUERDA) */}
      {product.discountPercent && (
        <div className="absolute -top-2 left-2 bg-orange-500 text-white text-[10px] font-semibold px-3 py-0.5 rounded-full shadow">
          🔻 {product.discountPercent}% OFF
        </div>
      )}

      {/* 🟢 BADGE MELHOR CUSTO-BENEFÍCIO (DIREITA) */}
      {isBest && (
        <div className="absolute -top-2 right-2 bg-green-600 text-white text-[10px] font-semibold px-3 py-0.5 rounded-full shadow">
          Melhor custo-benefício
        </div>
      )}

      <h2 className="font-semibold text-base leading-tight">
        {product.name}
      </h2>

      <div className="flex gap-3 items-start">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-24 h-24 object-contain flex-shrink-0"
          loading="lazy"
        />

        <div className="text-sm space-y-1 flex-1">
          <p>
            <strong>Apresentação:</strong>{" "}
            {product.form === CreatineForm.CAPSULE
              ? "Cápsula"
              : product.form === CreatineForm.GUMMY
              ? "Gummy"
              : "Pó"}
          </p>

          <p>
            <strong>Sabor:</strong>{" "}
            {product.flavor ?? "Sem sabor"}
          </p>

          <p>
            <strong>Doses:</strong>{" "}
            {Math.floor(product.doses)}
          </p>

          <p>
            <strong>Preço por grama:</strong>{" "}
            R$ {product.pricePerGram.toFixed(2)}
          </p>

          <p>
            <strong>Preço:</strong>{" "}
            R$ {product.price.toFixed(2)}
          </p>

          {/* TEXTO EXPLICATIVO DO DESCONTO */}
          {product.discountPercent && (
            <p className="text-xs text-green-700 mt-1">
              🔻 {product.discountPercent}% abaixo da média dos últimos 30 dias
            </p>
          )}
        </div>
      </div>

      <a
        href={product.affiliateUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center text-white text-sm font-semibold py-2 rounded-lg mt-2 bg-orange-400 hover:bg-orange-500 transition-colors"
      >
        Comprar na Amazon
      </a>
    </div>
  );
}

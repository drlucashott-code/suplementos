"use client";

import { CreatineForm } from "@prisma/client";

type Product = {
  id: string;
  name: string;
  imageUrl: string;
  flavor: string | null;
  form?: CreatineForm;
  price: number;
  pricePerDose: number;
  doses: number;
  affiliateUrl: string;
};

export function MobileProductCard({
  product,
  isBest,
}: {
  product: Product;
  isBest?: boolean;
}) {
  const centsPerDose = Math.round(product.pricePerDose * 100);

  return (
    <div className="max-w-sm mx-auto p-4">
      <div className="border-2 border-green-500 rounded-xl p-3 bg-white space-y-3">

        {/* Selo */}
        {isBest && (
          <div className="flex justify-end">
            <span className="bg-green-600 text-white text-[10px] font-semibold px-3 py-0.5 rounded-full">
              Melhor custo-benefício
            </span>
          </div>
        )}

        {/* Nome */}
        <h2 className="text-base font-semibold text-center mb-2">
          {product.name}
        </h2>

        <div className="flex gap-3 items-start">
          {/* Imagem */}
          {product.imageUrl && (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-24 h-24 object-contain flex-shrink-0"
            />
          )}

          {/* Informações */}
          <div className="text-xs space-y-1 flex-1">
            <p>
              <strong>Apresentação:</strong>{" "}
              {product.form === CreatineForm.CAPSULE
                ? "Cápsula"
                : product.form === CreatineForm.GUMMY
                ? "Gummy"
                : "Pó"}
            </p>

            <p>
              <strong>Sabor:</strong> {product.flavor ?? "Sem sabor"}
            </p>

            <p>
              <strong>Rendimento:</strong> {Math.floor(product.doses)} doses
            </p>

            <p>
              <strong>Preço:</strong> R$ {product.price.toFixed(2)}
            </p>

            {/* Preço por dose — alinhado corretamente */}
            <p className="relative inline-block mt-1">
              <span className="absolute inset-y-0 -inset-x-2 bg-green-300 rounded"></span>

              <span className="relative">
                <strong>Preço por dose (3g):</strong>{" "}
                <span className="font-semibold">
                  {centsPerDose} centavos
                </span>
              </span>
            </p>
          </div>
        </div>

        {/* Botão */}
        <a
          href={product.affiliateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold py-2 rounded-lg mt-2"
        >
          Comprar na Amazon
        </a>
      </div>
    </div>
  );
}

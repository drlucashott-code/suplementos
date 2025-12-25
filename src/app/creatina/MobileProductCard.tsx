"use client";

import { CreatineForm, Store } from "@prisma/client";

type Product = {
  id: string;
  name: string;
  imageUrl: string;
  flavor: string | null;
  form?: CreatineForm;

  price: number;
  affiliateUrl: string;
  store: Store;

  pricePerDose: number; // EM REAIS
  doses: number;

  ratingAverage?: number | null;
  hasCarbohydrate?: boolean;
};

export function MobileProductCard({
  product,
  isBest,
}: {
  product: Product;
  isBest?: boolean;
}) {
  // valor em reais, já arredondado corretamente
  const pricePerDose = Number(
    product.pricePerDose.toFixed(2)
  );

  // decide como exibir
  const pricePerDoseLabel =
    pricePerDose >= 1
      ? `${pricePerDose
          .toFixed(2)
          .replace(".", ",")} reais`
      : `${Math.round(
          pricePerDose * 100
        )} centavos`;

  const buyLabel =
    product.store === Store.AMAZON
      ? "Comprar na Amazon"
      : "Comprar no Mercado Livre";

  const buyColor =
    product.store === Store.AMAZON
      ? "bg-orange-500 hover:bg-orange-600"
      : "bg-yellow-500 hover:bg-yellow-600";

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 relative
        ${
          isBest
            ? "border-green-600 bg-green-100"
            : "border-gray-200 bg-white"
        }
      `}
    >
      {isBest && (
        <div className="absolute -top-2 right-2 bg-green-600 text-white text-[10px] font-semibold px-3 py-0.5 rounded-full shadow">
          Melhor custo-benefício
        </div>
      )}

      {/* TÍTULO + NOTA */}
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-semibold text-base leading-tight flex-1">
          {product.name}
        </h2>

        {product.ratingAverage !== null &&
          product.ratingAverage !== undefined && (
            <div className="flex items-center gap-1 text-sm font-semibold text-yellow-600 shrink-0">
              <span>⭐</span>
              <span>
                {product.ratingAverage.toFixed(1)}
              </span>
            </div>
          )}
      </div>

      <div className="flex gap-3 items-start">
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-24 h-24 object-contain flex-shrink-0"
          />
        )}

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
            <strong>Sabor:</strong>{" "}
            {product.flavor ?? "Sem sabor"}
          </p>

          <p>
            <strong>Doses:</strong>{" "}
            {Math.floor(product.doses)}
          </p>

          <p>
            <strong>Preço:</strong>{" "}
            R$ {product.price.toFixed(2)}
          </p>

          {/* PREÇO POR DOSE */}
          <p className="relative inline-block mt-1">
            <span className="absolute inset-y-0 -inset-x-2 bg-green-300 rounded" />
            <span className="relative font-semibold">
              Preço por dose: {pricePerDoseLabel}
            </span>
          </p>

          {/* TOOLTIP – CONTÉM CARBOIDRATO */}
          {product.hasCarbohydrate && (
            <div className="mt-1 text-[11px] text-amber-700 flex items-center gap-1">
              <span>Contém carboidrato</span>

              <span className="relative group cursor-help">
                ⓘ
                <span className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-black text-white text-[11px] px-2 py-1 rounded max-w-[220px] text-center z-10">
                  Este produto contém carboidratos devido a
                  excipientes, adoçantes ou outros ingredientes
                  além da creatina.
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      <a
        href={product.affiliateUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`block w-full text-center text-white text-sm font-semibold py-2 rounded-lg mt-2 ${buyColor}`}
      >
        {buyLabel}
      </a>
    </div>
  );
}

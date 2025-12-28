"use client";

import type { WheyProductPublic } from "./ProductList";

export function MobileProductCard({
  product,
  isBest,
}: {
  product: WheyProductPublic;
  isBest?: boolean;
}) {
  const pricePerGramProtein =
    product.pricePerGramProtein;

  const pricePerProteinLabel =
    Number.isFinite(pricePerGramProtein)
      ? pricePerGramProtein >= 1
        ? `R$ ${pricePerGramProtein
            .toFixed(2)
            .replace(".", ",")}`
        : `${Math.round(
            pricePerGramProtein * 100
          )} centavos`
      : "Indisponível";

  const numberOfDosesLabel = Number.isFinite(
    product.numberOfDoses
  )
    ? product.numberOfDoses.toFixed(0)
    : "—";

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 relative ${
        isBest
          ? "border-green-600 bg-green-100"
          : "border-gray-200 bg-white"
      }`}
    >
      {isBest && (
        <div className="absolute -top-2 right-2 bg-green-600 text-white text-[10px] font-semibold px-3 py-0.5 rounded-full shadow">
          Melhor custo-benefício
        </div>
      )}

      <h2 className="font-semibold text-base leading-tight">
        {product.name}
      </h2>

      <div className="flex gap-3 items-start">
        {product.imageUrl && (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-24 h-24 object-contain flex-shrink-0"
            loading="lazy"
          />
        )}

        <div className="text-xs space-y-1 flex-1">
          <p>
            <strong>Sabor:</strong>{" "}
            {product.flavor ?? "Sem sabor"}
          </p>

          <p>
            <strong>Dose:</strong> {product.dose} g
          </p>

          <p>
            <strong>Número de doses:</strong>{" "}
            {numberOfDosesLabel}
          </p>

          <p>
            <strong>Proteína por dose:</strong>{" "}
            {product.protein} g
          </p>

          <p>
            <strong>% de proteína:</strong>{" "}
            {Number.isFinite(product.proteinPercent)
              ? product.proteinPercent
                  .toFixed(1)
                  .replace(".", ",")
              : "—"}
            %
          </p>

          <p>
            <strong>Preço:</strong>{" "}
            R$ {product.price
              .toFixed(2)
              .replace(".", ",")}
          </p>

          <p className="relative inline-block mt-1">
            <span className="absolute inset-y-0 -inset-x-2 bg-green-300 rounded" />
            <span className="relative font-semibold">
              ⭐ Preço por g de proteína:{" "}
              {pricePerProteinLabel}
            </span>
          </p>
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

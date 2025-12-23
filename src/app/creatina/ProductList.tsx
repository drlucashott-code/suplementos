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

  pricePerDose: number; // em reais
  doses: number;
};

export function ProductList({
  products,
}: {
  products: Product[];
}) {
  return (
    <section className="flex-1 space-y-6">
      {products.map((product, index) => {
        const isBest = index === 0;

        const centsPerDose = Math.round(
          product.pricePerDose * 100
        );

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
            key={product.id}
            className={`relative rounded-2xl p-6 transition shadow-sm
              ${
                isBest
                  ? "border-2 border-green-600 bg-green-50"
                  : "border border-gray-200 bg-white"
              }
            `}
          >
            {/* SELO */}
            {isBest && (
              <div className="absolute -top-3 left-6 bg-green-600 text-white text-xs font-semibold px-4 py-1 rounded-full shadow">
                Melhor custo-benefício
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-6 items-center">
              {/* IMAGEM */}
              {product.imageUrl && (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-28 h-28 object-contain"
                />
              )}

              {/* CONTEÚDO */}
              <div className="flex-1 w-full">
                <h2 className="font-semibold text-xl mb-3">
                  {product.name}
                </h2>

                <p className="text-lg font-semibold text-green-700 mb-2">
                  Preço por dose (3g):{" "}
                  <span className="text-2xl font-bold">
                    {centsPerDose} centavos
                  </span>
                </p>

                <div className="text-sm text-gray-700 space-y-1">
                  <div>
                    <strong>Preço total:</strong>{" "}
                    R$ {product.price.toFixed(2)}
                  </div>

                  <div>
                    <strong>Rendimento:</strong>{" "}
                    {Math.floor(product.doses)} doses
                  </div>

                  <div>
                    <strong>Sabor:</strong>{" "}
                    {product.flavor ?? "Sem sabor"}
                  </div>

                  <div>
                    <strong>Apresentação:</strong>{" "}
                    {product.form === "POWDER"
                      ? "Pó"
                      : product.form === "CAPSULE"
                      ? "Cápsula"
                      : product.form === "GUMMY"
                      ? "Gummy"
                      : "-"}
                  </div>
                </div>

                {isBest && (
                  <p className="text-xs text-green-700 mt-2">
                    Menor custo por dose entre os produtos analisados
                  </p>
                )}
              </div>

              {/* CTA */}
              <a
                href={product.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-52 text-center text-white px-6 py-3 rounded-xl font-semibold transition shadow-sm ${buyColor}`}
              >
                {buyLabel}
              </a>
            </div>
          </div>
        );
      })}
    </section>
  );
}

"use client";

import { CreatineForm, Store } from "@prisma/client";

type Product = {
  id: string;
  name: string;
  imageUrl: string;
  flavor: string | null;
  form: CreatineForm;

  price: number;
  affiliateUrl: string;
  store: Store;

  pricePerDose: number;
  doses: number;

  hasCarbohydrate: boolean;
  isBest?: boolean;
};

export function MobileProductCard({
  product,
}: {
  product: Product;
}) {
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

  const formLabel =
    product.form === CreatineForm.POWDER
      ? "Pó"
      : product.form === CreatineForm.CAPSULE
      ? "Cápsula"
      : "Gummy";

  return (
    <div className="relative border rounded-xl p-3 bg-white shadow-sm">
      {/* SELLOS */}
      <div className="absolute top-2 left-2 flex gap-2 z-10">
        {product.isBest && (
          <span className="bg-green-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            Melhor custo
          </span>
        )}

        {product.hasCarbohydrate && (
          <span className="bg-yellow-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            Contém carbo
          </span>
        )}
      </div>

      <div className="flex gap-3">
        {/* IMAGEM */}
        <div className="w-24 h-24 flex-shrink-0">
          {product.imageUrl && (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* CONTEÚDO */}
        <div className="flex-1 flex flex-col">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2">
            {product.name}
          </h3>

          <p className="text-green-700 font-bold text-sm mt-1">
            {centsPerDose} centavos por dose
          </p>

          <div className="text-[11px] text-gray-600 mt-1 space-y-0.5">
            <div>
              {Math.floor(product.doses)} doses •{" "}
              {formLabel}
            </div>

            <div>
              Preço total: R${" "}
              {product.price.toFixed(2)}
            </div>

            {product.flavor && (
              <div>Sabor: {product.flavor}</div>
            )}
          </div>
        </div>
      </div>

      {/* CTA */}
      <a
        href={product.affiliateUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-3 block w-full text-center text-white py-2 rounded-lg text-sm font-semibold ${buyColor}`}
      >
        {buyLabel}
      </a>
    </div>
  );
}

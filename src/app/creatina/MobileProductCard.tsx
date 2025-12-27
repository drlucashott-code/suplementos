"use client";

import { CreatineForm } from "@prisma/client";

type CompositionLabel =
  | "FLAVOR_NO_CARB"
  | "HAS_CARB"
  | null;

type Product = {
  id: string;
  name: string;
  imageUrl: string;
  flavor: string | null;
  form?: CreatineForm;

  price: number;
  affiliateUrl: string;

  pricePerDose: number;
  doses: number;

  compositionLabel?: CompositionLabel;
};

export function MobileProductCard({
  product,
  isBest,
}: {
  product: Product;
  isBest?: boolean;
}) {
  const pricePerDose = Number(
    product.pricePerDose.toFixed(2)
  );

  const pricePerDoseLabel =
    pricePerDose >= 1
      ? `${pricePerDose
          .toFixed(2)
          .replace(".", ",")} reais`
      : `${Math.round(
          pricePerDose * 100
        )} centavos`;

  const isCreapure =
    product.name
      .toLowerCase()
      .includes("creapure");

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 relative
        ${
          isBest
            ? "border-green-600 bg-green-100"
            : "border-gray-200 bg-white"
        }
      `}
      onClickCapture={(e) => {
        const target = e.target as HTMLElement;
        if (target.tagName !== "SUMMARY") {
          document
            .querySelectorAll("details[open]")
            .forEach((d) =>
              d.removeAttribute("open")
            );
        }
      }}
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

          <p className="relative inline-block mt-1">
            <span className="absolute inset-y-0 -inset-x-2 bg-green-300 rounded" />
            <span className="relative font-semibold">
              Preço por dose: {pricePerDoseLabel}
            </span>
          </p>

          {/* 🟦 CREAPURE */}
          {isCreapure && (
            <div className="mt-1 text-[11px] text-blue-700 flex items-center gap-1">
              <span className="font-semibold">
                Creapure®
              </span>

              <details className="relative">
                <summary className="cursor-pointer select-none list-none inline">
                  ⓘ
                </summary>

                <div className="absolute left-0 mt-1 bg-black text-white text-[11px] px-2 py-1 rounded max-w-[240px] z-10">
                  Este produto utiliza creatina
                  Creapure®, uma matéria-prima de
                  alta pureza produzida na Alemanha,
                  reconhecida por rigorosos controles
                  de qualidade e processos de
                  fabricação padronizados.
                </div>
              </details>
            </div>
          )}

          {/* 🔶 SABOR SEM CARBO */}
          {product.compositionLabel ===
            "FLAVOR_NO_CARB" && (
            <div className="mt-1 text-[11px] text-amber-700 flex items-center gap-1">
              <span>
                Contém sabor artificial, sem adição de
                carboidratos
              </span>

              <details className="relative">
                <summary className="cursor-pointer select-none list-none inline">
                  ⓘ
                </summary>

                <div className="absolute left-0 mt-1 bg-black text-white text-[11px] px-2 py-1 rounded max-w-[240px] z-10">
                  Este produto contém aromatizantes,
                  adoçantes ou outros excipientes
                  adicionados para ajuste de sabor,
                  sem adição de carboidratos.
                </div>
              </details>
            </div>
          )}

          {/* 🔴 COM CARBO */}
          {product.compositionLabel ===
            "HAS_CARB" && (
            <div className="mt-1 text-[11px] text-amber-700 flex items-center gap-1">
              <span>Contém carboidratos</span>

              <details className="relative">
                <summary className="cursor-pointer select-none list-none inline">
                  ⓘ
                </summary>

                <div className="absolute left-0 mt-1 bg-black text-white text-[11px] px-2 py-1 rounded max-w-[240px] z-10">
                  Este produto contém carboidratos
                  devido à adição de açúcares,
                  excipientes ou outros ingredientes
                  além da creatina.
                </div>
              </details>
            </div>
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

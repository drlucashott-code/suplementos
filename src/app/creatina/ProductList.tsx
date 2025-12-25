"use client";

import { MobileProductCard } from "./MobileProductCard";
import { CreatineForm } from "@prisma/client";

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

  hasCarbohydrate?: boolean;
};

export function ProductList({
  products,
}: {
  products: Product[];
}) {
  return (
    <section className="flex-1 space-y-6">
      {products.map((product, index) => (
        <MobileProductCard
          key={product.id}
          product={product}
          isBest={index === 0}
        />
      ))}
    </section>
  );
}

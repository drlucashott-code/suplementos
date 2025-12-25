"use client";

import { MobileProductCard } from "./MobileProductCard";
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

  pricePerDose: number;
  doses: number;

  ratingAverage?: number | null;
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

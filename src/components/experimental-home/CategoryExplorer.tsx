"use client";

import Image from "next/image";
import Link from "next/link";

import amazonImageLoader from "@/lib/amazonImageLoader";
import type { ExperimentalCategory, HomeHub } from "./types";

const categoryOrder = [
  "whey",
  "creatina",
  "pre-treino",
  "cafeina",
  "barra",
  "bebidaproteica",
  "gel-de-carboidrato",
  "cafe-funcional",
  "pasta-de-amendoim",
];

function trackCategory(category: ExperimentalCategory) {
  const win = window as typeof window & { dataLayer?: object[] };
  win.dataLayer = win.dataLayer || [];
  win.dataLayer.push({
    event: "click_experimental_home_category",
    home_version: "experimental_amazon_mobile",
    category_name: category.title,
    category_group: category.group,
  });
}

export function CategoryExplorer({
  categories,
}: {
  categories: Record<HomeHub, ExperimentalCategory[]>;
}) {
  const categoriesBySlug = new Map(
    categories.suplementos.map((category) => [
      category.path.split("/").at(-1),
      category,
    ]),
  );
  const orderedCategories = categoryOrder.flatMap((slug) => {
    const category = categoriesBySlug.get(slug);
    return category ? [category] : [];
  });

  return (
    <section
      id="categorias"
      aria-labelledby="categorias-title"
      className="scroll-mt-24 border-t border-[#E3E6E6] bg-white"
    >
      <div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 lg:px-10 lg:py-11">
        <h2
          id="categorias-title"
          className="text-[25px] font-bold leading-tight tracking-[-0.02em] text-[#0F1111] sm:text-[32px]"
        >
          Comprar por categoria
        </h2>

        <div className="mt-5 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 lg:grid-cols-9 lg:gap-x-4">
          {orderedCategories.map((category) => (
            <Link
              key={category.path}
              href={category.path}
              onClick={() => trackCategory(category)}
              className="group block text-left focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007185]"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#F7F8F8]">
                <Image
                  loader={amazonImageLoader}
                  src={category.imageSrc}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 30vw, 160px"
                  className="object-contain p-2 transition duration-300 group-hover:scale-[1.04]"
                />
              </div>
              <span className="mt-2 block line-clamp-2 min-h-8 text-center text-[13px] font-semibold leading-4 text-[#0F1111] group-hover:text-[#007185]">
                {category.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

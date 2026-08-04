"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { Dumbbell, Home, PawPrint, Scale } from "lucide-react";
import amazonImageLoader from "@/lib/amazonImageLoader";
import type { ExperimentalCategory, HomeHub } from "./types";

const hubDetails: Record<HomeHub, { label: string; icon: React.ReactNode }> = {
  suplementos: {
    label: "Suplementos",
    icon: <Dumbbell className="h-4 w-4" />,
  },
  casa: {
    label: "Casa",
    icon: <Home className="h-4 w-4" />,
  },
  pets: {
    label: "Pets",
    icon: <PawPrint className="h-4 w-4" />,
  },
};

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

export function CategoryExplorer({ categories }: { categories: Record<HomeHub, ExperimentalCategory[]> }) {
  const availableHubs = (Object.keys(hubDetails) as HomeHub[]).filter(
    (hub) => categories[hub].length > 0
  );
  const [activeHub, setActiveHub] = useState<HomeHub>(availableHubs[0] || "suplementos");
  const railRef = useRef<HTMLDivElement>(null);
  const categoryColumns = Array.from(
    { length: Math.ceil(categories[activeHub].length / 2) },
    (_, index) => categories[activeHub].slice(index * 2, index * 2 + 2)
  );

  function selectHub(hub: HomeHub) {
    setActiveHub(hub);
    railRef.current?.scrollTo({ left: 0, behavior: "smooth" });
  }

  return (
    <section id="categorias" aria-labelledby="categorias-title" className="scroll-mt-24 border-t border-[#E3E6E6] bg-white">
      <div className="mx-auto max-w-[1480px] px-4 py-7 sm:px-6 lg:px-10 lg:py-11">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-[#007185]">
            <Scale className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]">Comparador inteligente</p>
          </div>
          <h2 id="categorias-title" className="mt-2 text-[25px] font-bold leading-tight tracking-[-0.02em] text-[#0F1111] sm:text-[32px]">
            Comprar por categoria
          </h2>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Grupos de categorias">
          {availableHubs.map((hub) => {
            const meta = hubDetails[hub];
            const active = activeHub === hub;
            return (
              <button
                key={hub}
                id={`home-hub-${hub}`}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls="home-category-panel"
                onClick={() => selectHub(hub)}
                className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold transition ${
                  active
                    ? "border-[#007185] bg-[#E7F4F5] text-[#005F6B]"
                    : "border-[#D5D9D9] bg-white text-[#0F1111] hover:border-[#AAB7B8]"
                }`}
              >
                {meta.icon}
                {meta.label}
              </button>
            );
          })}
        </div>

        <div
          id="home-category-panel"
          ref={railRef}
          role="tabpanel"
          aria-labelledby={`home-hub-${activeHub}`}
          className="-mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:-mx-2 lg:px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {categoryColumns.map((column, columnIndex) => (
            <div
              key={`${activeHub}-column-${columnIndex}`}
              className="w-[calc((100%-0.75rem)/2)] shrink-0 snap-start space-y-3 sm:w-[calc((100%-1.5rem)/3)] lg:w-[calc((100%-2.25rem)/4)]"
            >
              {column.map((category) => (
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
                      sizes="(max-width: 640px) 46vw, 260px"
                      className="object-contain p-2 transition duration-300 group-hover:scale-[1.04]"
                    />
                  </div>
                  <span className="mt-2 line-clamp-2 min-h-8 text-[13px] font-semibold leading-4 text-[#0F1111] group-hover:text-[#007185]">
                    {category.title}
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

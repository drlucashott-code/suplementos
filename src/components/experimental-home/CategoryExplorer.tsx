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

        <div className="mt-5 rounded-2xl border border-[#D5D9D9] bg-white p-3 shadow-[0_2px_8px_rgba(15,17,17,0.05)] sm:p-4">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Grupos de categorias">
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
            className="mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto border-t border-[#EAEEEE] pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {categories[activeHub].map((category) => (
              <Link
                key={category.path}
                href={category.path}
                onClick={() => trackCategory(category)}
                className="group w-[calc((100%-1.5rem)/4)] shrink-0 snap-start text-center focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007185] sm:w-[calc((100%-2.5rem)/6)] lg:w-[calc((100%-3.5rem)/8)]"
              >
                <div className="relative aspect-square overflow-hidden rounded-lg bg-[#F7F8F8]">
                  <Image
                    loader={amazonImageLoader}
                    src={category.imageSrc}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 22vw, 160px"
                    className="object-contain p-1.5 transition duration-300 group-hover:scale-[1.05]"
                  />
                </div>
                <span className="mt-2 line-clamp-2 min-h-8 text-[11px] font-semibold leading-4 text-[#0F1111] group-hover:text-[#007185] sm:text-[12px]">
                  {category.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

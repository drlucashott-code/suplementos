"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Dumbbell, Home, PawPrint, Scale } from "lucide-react";
import amazonImageLoader from "@/lib/amazonImageLoader";
import type { ExperimentalCategory, HomeHub } from "./types";

const hubDetails: Record<HomeHub, { label: string; helper: string; icon: React.ReactNode }> = {
  suplementos: {
    label: "Suplementos",
    helper: "Compare dose, proteína, peso e rendimento",
    icon: <Dumbbell className="h-4 w-4" />,
  },
  casa: {
    label: "Casa",
    helper: "Compare unidade, volume, metro e lavagem",
    icon: <Home className="h-4 w-4" />,
  },
  pets: {
    label: "Pets",
    helper: "Compare peso, duração e custo por uso",
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
  const detail = hubDetails[activeHub];

  return (
    <section id="categorias" aria-labelledby="categorias-title" className="scroll-mt-24 border-y border-[#E3E6E6] bg-[#F3F3F3]">
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
                onClick={() => setActiveHub(hub)}
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

        <div id="home-category-panel" role="tabpanel" aria-labelledby={`home-hub-${activeHub}`} className="mt-4 rounded-2xl bg-white p-3 shadow-[0_2px_8px_rgba(15,17,17,0.06)] sm:p-5">
          <p className="mb-3 px-1 text-[12px] font-medium text-[#565959]">{detail.helper}</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {categories[activeHub].map((category) => (
              <Link
                key={category.path}
                href={category.path}
                onClick={() => trackCategory(category)}
                className="group flex min-w-0 flex-col rounded-xl border border-[#E3E6E6] bg-white p-2.5 transition hover:border-[#AAB7B8] hover:shadow-[0_5px_15px_rgba(15,17,17,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#007185]"
              >
                <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-[#F7F8F8]">
                  <Image
                    loader={amazonImageLoader}
                    src={category.imageSrc}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 42vw, 180px"
                    className="object-contain p-2 transition duration-300 group-hover:scale-[1.04]"
                  />
                </div>
                <span className="mt-2.5 flex items-center justify-between gap-1 text-[13px] font-bold leading-4 text-[#0F1111] sm:text-[14px]">
                  <span>{category.title}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#007185]" />
                </span>
                <span className="mt-1 text-[11px] font-medium text-[#007185]">Comparar opções</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

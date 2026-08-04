"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ChevronRight,
  Dumbbell,
  Home,
  PawPrint,
  Search,
  ShieldCheck,
  Tags,
} from "lucide-react";
import BestDealProductCard from "@/components/BestDealProductCard";
import type { BestDeal } from "@/lib/bestDeals";

export type HomeV5Category = {
  title: string;
  imageSrc: string;
  path: string;
  group: "suplementos" | "casa" | "pets";
};

const groupMeta = {
  suplementos: { label: "Suplementos", icon: Dumbbell, color: "text-[#18794e]" },
  casa: { label: "Casa", icon: Home, color: "text-[#8a5600]" },
  pets: { label: "Pets", icon: PawPrint, color: "text-[#7d3c98]" },
} as const;

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function getFamilyKey(deal: BestDeal) {
  return normalize(deal.name)
    .replace(/\([^)]*\)/g, "")
    .replace(/\b\d+(?:[,.]\d+)?\s*(?:g|kg|ml|l|capsulas?|comprimidos?|unidades?)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function selectCuratedDeals(deals: BestDeal[]) {
  const seenFamilies = new Set<string>();
  const groupCounts = new Map<string, number>();
  const curated: BestDeal[] = [];

  for (const deal of deals) {
    const familyKey = getFamilyKey(deal);
    const groupCount = groupCounts.get(deal.categoryGroup) ?? 0;
    if (seenFamilies.has(familyKey) || groupCount >= 4) continue;

    seenFamilies.add(familyKey);
    groupCounts.set(deal.categoryGroup, groupCount + 1);
    curated.push(deal);
    if (curated.length === 8) break;
  }

  return curated;
}

function track(event: string, payload: Record<string, unknown> = {}) {
  const win = window as typeof window & { dataLayer?: object[] };
  win.dataLayer = win.dataLayer || [];
  win.dataLayer.push({ event, home_version: "v5", ...payload });
}

export default function HomeV5Client({
  categories,
  bestDeals,
}: {
  categories: HomeV5Category[];
  bestDeals: BestDeal[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const curatedDeals = useMemo(() => selectCuratedDeals(bestDeals), [bestDeals]);
  const quickCategories = categories.slice(0, 6);

  useEffect(() => {
    track("view_home_v5");
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;

    const category = categories.find((item) => normalize(item.title).includes(normalize(term)));
    track("home_v5_search", { query: term, destination: category ? "category" : "offers" });
    router.push(category ? `${category.path}?q=${encodeURIComponent(term)}` : `/ofertas?busca=${encodeURIComponent(term)}`);
  }

  return (
    <main className="min-h-screen bg-[#eaeded] text-[#0f1111]">
      <section className="border-b border-[#d5d9d9] bg-[#22303f] px-4 py-6 md:px-7 md:py-8">
        <div className="mx-auto max-w-[1500px]">
          <h1 className="text-[22px] font-bold text-white md:text-[28px]">Encontre boas ofertas na Amazon</h1>
          <form onSubmit={submitSearch} className="mt-4 flex max-w-4xl" role="search">
            <label className="sr-only" htmlFor="home-v5-search">Buscar produto ou categoria</label>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-l-lg bg-white px-3 ring-2 ring-transparent focus-within:ring-[#febd69]">
              <Search className="h-5 w-5 shrink-0 text-[#596773]" />
              <input
                id="home-v5-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar whey, creatina, fralda..."
                className="h-12 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#667085]"
              />
            </div>
            <button type="submit" className="inline-flex h-12 items-center gap-2 rounded-r-lg bg-[#febd69] px-4 text-sm font-bold text-[#111827] transition hover:bg-[#f3a847]">
              Buscar <Search className="h-4 w-4" />
            </button>
          </form>
          <nav aria-label="Categorias rápidas" className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
            {quickCategories.map((category) => (
              <Link
                key={category.path}
                href={category.path}
                onClick={() => track("home_v5_quick_category", { category: category.title })}
                className="font-semibold text-[#e5f2f5] hover:text-white hover:underline"
              >
                {category.title}
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-3 py-5 md:px-5 md:py-7">
        <div className="rounded-lg border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wide text-[#007185]">Ofertas em destaque</p>
              <h2 className="mt-1 text-[24px] font-bold leading-tight text-[#0f1111]">Melhores ofertas do momento</h2>
            </div>
            <Link
              href="/ofertas"
              onClick={() => track("home_v5_view_all_deals")}
              className="hidden items-center gap-1 text-[13px] font-bold text-[#007185] hover:text-[#c7511f] hover:underline sm:inline-flex"
            >
              Ver todas <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          {curatedDeals.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {curatedDeals.map((deal) => (
                <BestDealProductCard key={deal.id} item={deal} category="home_v5_best_deals" compact />
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-[#565959]">Nenhuma oferta disponível agora.</p>
          )}

          <Link
            href="/ofertas"
            onClick={() => track("home_v5_view_all_deals")}
            className="mt-5 flex items-center justify-center gap-1 border-t border-[#eaeded] pt-4 text-[13px] font-bold text-[#007185] hover:text-[#c7511f] hover:underline sm:hidden"
          >
            Ver todas as ofertas <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section id="categorias" className="mx-auto max-w-[1500px] px-3 pb-5 md:px-5 md:pb-7">
        <div className="rounded-lg border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 className="text-[24px] font-bold text-[#0f1111]">Comprar por categoria</h2>
            <span className="hidden text-[13px] text-[#565959] sm:inline">Encontre o que precisa</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => {
              const meta = groupMeta[category.group];
              const Icon = meta.icon;
              return (
                <Link
                  key={category.path}
                  href={category.path}
                  onClick={() => track("home_v5_category", { category: category.title, group: category.group })}
                  className="group flex min-h-[112px] items-end overflow-hidden rounded-lg border border-[#d5d9d9] bg-[#f7f8f8] p-3 transition hover:border-[#007185] hover:shadow-md"
                >
                  <Image
                    src={category.imageSrc}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover opacity-20 transition duration-200 group-hover:scale-105 group-hover:opacity-30"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                  <span className="relative flex w-full items-end justify-between gap-3">
                    <span>
                      <span className={`mb-1 flex items-center gap-1 text-[11px] font-bold ${meta.color}`}><Icon className="h-3.5 w-3.5" /> {meta.label}</span>
                      <span className="block text-[17px] font-bold leading-tight text-[#0f1111]">{category.title}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-[#007185]" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-3 pb-5 md:px-5 md:pb-7">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { label: "Suplementos", href: "/ofertas?grupo=suplementos", icon: Dumbbell },
            { label: "Casa", href: "/ofertas?grupo=casa", icon: Home },
            { label: "Pets", href: "/ofertas?grupo=pets", icon: PawPrint },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => track("home_v5_theme", { theme: item.label })}
                className="flex items-center justify-between rounded-lg border border-[#d5d9d9] bg-white px-4 py-4 text-[15px] font-bold transition hover:border-[#007185] hover:text-[#007185]"
              >
                <span className="flex items-center gap-2"><Icon className="h-5 w-5 text-[#007185]" /> Ver ofertas de {item.label}</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            );
          })}
        </div>
      </section>

      <section className="border-t border-[#d5d9d9] bg-white px-4 py-3 md:px-7">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-2 text-[12px] text-[#565959] sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-[#007185]" /> Preços monitorados. Compra realizada na Amazon.</span>
          <span className="flex items-center gap-1.5"><Tags className="h-4 w-4 text-[#007185]" /> Como associado da Amazon, ganhamos com compras qualificadas.</span>
        </div>
      </section>
    </main>
  );
}

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
  LayoutList,
  PawPrint,
  Search,
  ShieldCheck,
  Tags,
  TrendingUp,
} from "lucide-react";
import ProgressiveBestDealsGrid from "@/components/ProgressiveBestDealsGrid";
import type { BestDeal } from "@/lib/bestDeals";
import amazonImageLoader from "@/lib/amazonImageLoader";
import { buildPublicListPath } from "@/lib/siteSocial";

export type CategoryItem = {
  title: string;
  imageSrc: string;
  path: string;
  disabled?: boolean;
};

type HubKey = "suplementos" | "casa" | "pets";

type PublicListItem = {
  slug: string;
  title: string;
  ownerDisplayName: string;
  ownerUsername: string | null;
  itemsCount: number;
  previewImages: string[] | null;
  createdAt: string;
};

const hubMeta: Record<HubKey, { label: string; icon: React.ReactNode }> = {
  suplementos: { label: "Suplementos", icon: <Dumbbell className="h-4 w-4" /> },
  casa: { label: "Casa & bem-estar", icon: <Home className="h-4 w-4" /> },
  pets: { label: "Pets", icon: <PawPrint className="h-4 w-4" /> },
};

function track(event: string, payload: Record<string, unknown> = {}) {
  const win = window as typeof window & { dataLayer?: object[] };
  win.dataLayer = win.dataLayer || [];
  win.dataLayer.push({ event, home_version: "v5", ...payload });
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function formatListDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function SectionTitle({
  icon,
  eyebrow,
  title,
  action,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EEF6F7] text-[#007185]">
          {icon}
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#007185]">{eyebrow}</p>
          <h1 className="mt-1 text-[27px] font-bold leading-tight text-[#0F1111] md:text-[32px]">{title}</h1>
        </div>
      </div>
      {action}
    </div>
  );
}

function CompareCategoryCard({ category, onClick }: { category: CategoryItem; onClick: () => void }) {
  return (
    <Link
      href={category.path}
      onClick={onClick}
      className="group rounded-[22px] border border-[#E5EBF0] bg-[#FCFDFE] p-3 transition duration-200 hover:-translate-y-0.5 hover:border-[#D1DAE3] hover:bg-white hover:shadow-[0_12px_28px_rgba(15,17,17,0.06)]"
    >
      <div className="relative h-[150px] overflow-hidden rounded-[17px] border border-[#EEF2F6] bg-[#F8FAFC]">
        <Image
          loader={amazonImageLoader}
          src={category.imageSrc}
          alt={category.title}
          fill
          sizes="(max-width: 768px) 44vw, 280px"
          className="object-contain p-3 transition duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-[16px] font-bold leading-tight text-[#0F1111]">{category.title}</span>
        <ChevronRight className="h-5 w-5 shrink-0 text-[#007185]" />
      </div>
    </Link>
  );
}

export default function HomeV5Client({
  supplementCategories,
  houseCategories,
  petCategories,
  bestDeals,
  publicLists,
}: {
  supplementCategories: CategoryItem[];
  houseCategories: CategoryItem[];
  petCategories: CategoryItem[];
  bestDeals: BestDeal[];
  publicLists: PublicListItem[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedHub, setSelectedHub] = useState<HubKey>("suplementos");
  const categoryGroups = useMemo<Record<HubKey, CategoryItem[]>>(
    () => ({ suplementos: supplementCategories, casa: houseCategories, pets: petCategories }),
    [supplementCategories, houseCategories, petCategories]
  );
  const visibleCategories = categoryGroups[selectedHub];

  useEffect(() => {
    track("view_home_v5");
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;

    const allCategories = Object.values(categoryGroups).flat();
    const category = allCategories.find((item) => normalize(item.title).includes(normalize(term)));
    track("home_v5_offer_search", { query: term, destination: category ? "category" : "offers" });
    router.push(category ? `${category.path}?q=${encodeURIComponent(term)}` : `/ofertas?busca=${encodeURIComponent(term)}`);
  }

  return (
    <main className="min-h-screen bg-[#F4F6F8] pb-12 font-sans text-[#0F1111]">
      <div className="border-b border-[#E5EBF0] bg-[#F8FAFC]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-center gap-2 px-4 py-1.5 text-center text-[12px] font-medium text-[#475467] md:px-8 md:py-1">
          <ShieldCheck className="h-3.5 w-3.5 text-[#007185]" />
          <span>Comparador verificado de ofertas Amazon.</span>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 md:px-8 md:py-8">
        <section className="rounded-[28px] border border-[#D8DEE6] bg-white px-5 py-5 shadow-[0_10px_40px_rgba(15,17,17,0.05)] md:px-7 md:py-6">
          <SectionTitle icon={<Search className="h-4 w-4" />} eyebrow="Buscador de ofertas" title="Encontre a melhor oportunidade" action={<Link href="/ofertas" className="inline-flex items-center gap-2 self-start rounded-full border border-[#D8DEE6] bg-[#F8FAFC] px-4 py-2.5 text-[13px] font-semibold text-[#0F1111] transition hover:border-[#C9D3DD] hover:bg-white">Ver todas <ArrowRight className="h-4 w-4 text-[#007185]" /></Link>} />

          <form onSubmit={submitSearch} role="search" className="mt-6 flex max-w-4xl overflow-hidden rounded-xl border border-[#B7C7D1] bg-white shadow-sm focus-within:border-[#007185] focus-within:ring-2 focus-within:ring-[#007185]/15">
            <label htmlFor="home-v5-offer-search" className="sr-only">Buscar oferta</label>
            <Search className="ml-4 h-5 w-5 shrink-0 self-center text-[#667085]" />
            <input id="home-v5-offer-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="O que você está procurando?" className="h-12 min-w-0 flex-1 px-3 text-[15px] outline-none placeholder:text-[#98A2B3]" />
            <button type="submit" className="bg-[#FFD814] px-5 text-[14px] font-bold text-[#0F1111] transition hover:bg-[#F7CA00]">Buscar</button>
          </form>

          <div className="mt-7 border-t border-[#EEF2F6] pt-6">
            <h2 className="text-[21px] font-bold text-[#0F1111]">Melhores ofertas do momento</h2>
            <ProgressiveBestDealsGrid items={bestDeals} category="home_v5_busca_ofertas" compact showActions={false} initialVisibleCount={10} step={10} mobileVisibleCount={8} desktopVisibleCount={10} className="mt-5" />
          </div>
        </section>

        <section className="rounded-[28px] border border-[#D8DEE6] bg-white px-5 py-5 shadow-[0_10px_40px_rgba(15,17,17,0.05)] md:px-7 md:py-6">
          <SectionTitle icon={<TrendingUp className="h-4 w-4" />} eyebrow="Comparador de produtos" title="Compare antes de decidir" action={<Link href="/comparar-card" className="inline-flex items-center gap-2 self-start rounded-full border border-[#D8DEE6] bg-[#F8FAFC] px-4 py-2.5 text-[13px] font-semibold text-[#0F1111] transition hover:border-[#C9D3DD] hover:bg-white">Abrir comparador <ArrowRight className="h-4 w-4 text-[#007185]" /></Link>} />

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {(Object.keys(hubMeta) as HubKey[]).map((hub) => {
              const meta = hubMeta[hub];
              const active = selectedHub === hub;
              return (
                <button key={hub} type="button" onClick={() => { setSelectedHub(hub); track("home_v5_compare_hub", { hub }); }} aria-pressed={active} className={`flex min-h-[68px] items-center gap-3 rounded-[18px] border px-4 py-3 text-left transition ${active ? "border-[#0F1111] bg-[#0F1111] text-white shadow-[0_12px_28px_rgba(15,17,17,0.12)]" : "border-[#E5EBF0] bg-[#F8FAFC] text-[#0F1111] hover:border-[#C9D3DD] hover:bg-white"}`}>
                  <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${active ? "bg-white/10 text-[#FFD814]" : "bg-white text-[#007185]"}`}>{meta.icon}</span>
                  <span className="text-[15px] font-semibold leading-tight">{meta.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {visibleCategories.map((category) => <CompareCategoryCard key={category.path} category={category} onClick={() => track("home_v5_compare_category", { category: category.title, hub: selectedHub })} />)}
          </div>
        </section>

        <section className="rounded-[28px] border border-[#D8DEE6] bg-white px-5 py-5 shadow-[0_10px_40px_rgba(15,17,17,0.05)] md:px-7 md:py-6">
          <SectionTitle icon={<LayoutList className="h-4 w-4" />} eyebrow="Comunidade" title="Listas públicas" action={<Link href="/listas" className="inline-flex items-center gap-2 self-start rounded-full border border-[#D8DEE6] bg-[#F8FAFC] px-4 py-2.5 text-[13px] font-semibold text-[#0F1111] transition hover:border-[#C9D3DD] hover:bg-white">Ver todas <ArrowRight className="h-4 w-4 text-[#007185]" /></Link>} />

          {publicLists.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-[#D8DEE6] bg-[#F8FAFC] px-6 py-12 text-center text-[14px] text-[#667085]">Ainda não existem listas públicas.</div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {publicLists.map((list) => (
                <Link key={list.slug} href={list.ownerUsername ? buildPublicListPath(list.ownerUsername, list.slug) : `/listas/${list.slug}`} onClick={() => track("home_v5_public_list", { list: list.slug })} className="group rounded-[24px] border border-[#E5EBF0] bg-[#FCFDFE] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#D1DAE3] hover:bg-white hover:shadow-[0_12px_28px_rgba(15,17,17,0.06)]">
                  <div className="flex h-[94px] items-center justify-center gap-2 overflow-hidden rounded-[20px] border border-[#EEF2F6] bg-[#F8FAFC] px-3">
                    {(list.previewImages ?? []).length > 0 ? (list.previewImages ?? []).slice(0, 3).map((imageSrc, index) => <div key={`${list.slug}-${index}`} className="relative h-16 w-16 overflow-hidden rounded-[16px] border border-[#EDF2F7] bg-white"><Image loader={amazonImageLoader} src={imageSrc} alt="" fill sizes="64px" className="object-contain p-1.5" /></div>) : <LayoutList className="h-5 w-5 text-[#98A2B3]" />}
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[16px] font-bold leading-tight text-[#0F1111]">{list.title}</p><p className="mt-1 text-[12px] leading-5 text-[#667085]">por {list.ownerDisplayName}</p></div><span className="rounded-full bg-[#EEF6F7] px-2.5 py-1 text-[11px] font-bold text-[#007185]">{list.itemsCount}</span></div>
                  <div className="mt-4 flex items-center justify-between border-t border-[#EEF2F6] pt-3 text-[12px] text-[#667085]"><span>{formatListDate(list.createdAt)}</span><span className="inline-flex items-center gap-1 font-semibold text-[#0F1111]">Abrir <ChevronRight className="h-4 w-4 text-[#007185]" /></span></div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

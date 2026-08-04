"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Clock3,
  Heart,
  Home,
  PawPrint,
  Search,
  ShieldCheck,
  Sparkles,
  Tags,
  TrendingDown,
  Dumbbell,
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
  suplementos: {
    label: "Suplementos",
    icon: Dumbbell,
    accent: "border-[#9ad6c3] bg-[#eaf8f2] text-[#075f48]",
  },
  casa: {
    label: "Casa & bem-estar",
    icon: Home,
    accent: "border-[#f1c67c] bg-[#fff6df] text-[#805400]",
  },
  pets: {
    label: "Pets",
    icon: PawPrint,
    accent: "border-[#d9b9e8] bg-[#faf0ff] text-[#6f348e]",
  },
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

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#067a8e]">{eyebrow}</p>
        <h2 className="mt-2 font-serif text-3xl font-black tracking-tight text-[#102033] md:text-4xl">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-[#526170] md:text-base">{description}</p>
      </div>
      {action}
    </div>
  );
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
  const quickCategories = categories.slice(0, 8);

  useEffect(() => {
    track("view_home_v5");
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = query.trim();
    if (!term) return;

    const normalizedTerm = normalize(term);
    const category = categories.find((item) => normalize(item.title).includes(normalizedTerm));
    track("home_v5_search", { query: term, destination: category ? "category" : "offers" });
    router.push(category ? `${category.path}?q=${encodeURIComponent(term)}` : `/ofertas?busca=${encodeURIComponent(term)}`);
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f5f3ee] text-[#102033]">
      <section className="relative overflow-hidden border-b border-[#1a3854] bg-[#102033] text-white">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="pointer-events-none absolute -right-28 top-[-9rem] h-[29rem] w-[29rem] rounded-full border-[42px] border-[#f4c64e]/20" />
        <div className="relative mx-auto grid max-w-[1440px] gap-9 px-5 py-10 md:px-8 lg:grid-cols-[1.15fr_.85fr] lg:items-end lg:py-14">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-[#d2f5ef]">
              <BadgeCheck className="h-3.5 w-3.5" />
              Curadoria de preço, não marketplace
            </div>
            <h1 className="mt-5 max-w-3xl font-serif text-[42px] font-black leading-[.98] tracking-tight md:text-6xl">
              Descubra o que vale a pena comprar agora.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#c9d4df] md:text-lg">
              Produtos da Amazon com preço atual, histórico e contexto para você decidir rápido — sem caçar promoção no escuro.
            </p>
          </div>

          <div className="rounded-[26px] border border-white/15 bg-[#f7f5ee] p-4 text-[#102033] shadow-[0_24px_70px_rgba(0,0,0,.24)] md:p-5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#067a8e]">Comece pelo seu objetivo</p>
            <form onSubmit={submitSearch} className="mt-3 flex gap-2" role="search">
              <label className="sr-only" htmlFor="home-v5-search">Buscar produto ou categoria</label>
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#bdc8cf] bg-white px-3 focus-within:border-[#067a8e] focus-within:ring-2 focus-within:ring-[#067a8e]/15">
                <Search className="h-4 w-4 shrink-0 text-[#526170]" />
                <input
                  id="home-v5-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Ex.: whey, creatina, fralda"
                  className="h-12 min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-[#7c8995]"
                />
              </div>
              <button type="submit" className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-[#f4c64e] px-4 text-sm font-black text-[#102033] transition hover:bg-[#ffd86c]">
                Buscar <ArrowRight className="h-4 w-4" />
              </button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="py-1 text-xs font-semibold text-[#526170]">ou explore:</span>
              {quickCategories.slice(0, 4).map((category) => (
                <Link
                  key={category.path}
                  href={category.path}
                  onClick={() => track("home_v5_quick_category", { category: category.title })}
                  className="rounded-full border border-[#d6dde1] bg-white px-3 py-1 text-xs font-bold text-[#264055] transition hover:border-[#067a8e] hover:text-[#067a8e]"
                >
                  {category.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-10 md:px-8 md:py-14">
        <SectionHeading
          eyebrow="Oportunidades do momento"
          title="Ofertas que merecem sua atenção"
          description="Uma seleção enxuta e variada: evitamos repetir a mesma família de produto para tornar a comparação mais rápida."
          action={
            <Link
              href="/ofertas"
              onClick={() => track("home_v5_view_all_deals")}
              className="inline-flex items-center gap-1 self-start rounded-full border border-[#9eabb3] bg-white px-4 py-2.5 text-sm font-black text-[#102033] transition hover:border-[#067a8e] hover:text-[#067a8e]"
            >
              Ver todas <ChevronRight className="h-4 w-4" />
            </Link>
          }
        />

        {curatedDeals.length > 0 ? (
          <div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {curatedDeals.map((deal) => (
              <BestDealProductCard key={deal.id} item={deal} category="home_v5_best_deals" compact />
            ))}
          </div>
        ) : (
          <div className="mt-7 rounded-[22px] border border-dashed border-[#b9c4ca] bg-white px-6 py-12 text-center text-sm font-semibold text-[#526170]">
            Estamos preparando a próxima seleção de ofertas verificadas.
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[#d9ddd9] pt-5 text-xs font-semibold text-[#526170]">
          <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-[#067a8e]" /> Preço monitorado pelo AmazonPicks</span>
          <span className="inline-flex items-center gap-1.5"><TrendingDown className="h-3.5 w-3.5 text-[#067a8e]" /> Economia comparada ao histórico disponível</span>
          <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#067a8e]" /> Você finaliza a compra na Amazon</span>
        </div>
      </section>

      <section id="categorias" className="border-y border-[#d9ddd9] bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-10 md:px-8 md:py-14">
          <SectionHeading
            eyebrow="Navegue do seu jeito"
            title="Comprar por categoria"
            description="Escolha uma área e encontre produtos comparáveis, filtros úteis e ofertas que façam sentido para o que você precisa."
          />
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {categories.map((category) => {
              const meta = groupMeta[category.group];
              const Icon = meta.icon;
              return (
                <Link
                  key={category.path}
                  href={category.path}
                  onClick={() => track("home_v5_category", { category: category.title, group: category.group })}
                  className="group relative min-h-[150px] overflow-hidden rounded-[22px] border border-[#d9e0e1] bg-[#fbfcfb] p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[#067a8e] hover:shadow-[0_16px_30px_rgba(16,32,51,.10)]"
                >
                  <Image
                    src={category.imageSrc}
                    alt=""
                    fill
                    unoptimized
                    className="object-cover opacity-[.12] transition duration-300 group-hover:scale-105 group-hover:opacity-[.18]"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                  <div className="relative flex h-full flex-col items-start justify-between gap-6">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.13em] ${meta.accent}`}>
                      <Icon className="h-3.5 w-3.5" /> {meta.label}
                    </span>
                    <span className="flex w-full items-end justify-between gap-3">
                      <span className="font-serif text-2xl font-black leading-tight text-[#102033]">{category.title}</span>
                      <ArrowRight className="h-5 w-5 shrink-0 text-[#067a8e] transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-5 py-10 md:px-8 md:py-14">
        <SectionHeading
          eyebrow="Descoberta guiada"
          title="Encontre pelo momento, não só pelo nome"
          description="Atalhos para quem ainda está explorando — sem transformar a página em um catálogo infinito."
        />
        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {[
            { title: "Para cuidar da rotina", copy: "Produtos de casa com economia relevante no uso diário.", href: "/ofertas?grupo=casa", icon: Home },
            { title: "Para treinar melhor", copy: "Suplementos para comparar dose, rendimento e preço.", href: "/ofertas?grupo=suplementos", icon: Dumbbell },
            { title: "Para quem cuida de pets", copy: "Itens de higiene e alimentação para comprar com contexto.", href: "/ofertas?grupo=pets", icon: PawPrint },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => track("home_v5_theme", { theme: item.title })}
                className="group rounded-[22px] border border-[#d9ddd9] bg-[#eaf3f1] p-5 transition hover:border-[#067a8e] hover:bg-[#e1f0ec]"
              >
                <Icon className="h-5 w-5 text-[#067a8e]" />
                <h3 className="mt-9 font-serif text-2xl font-black text-[#102033]">{item.title}</h3>
                <p className="mt-2 max-w-sm text-sm leading-6 text-[#526170]">{item.copy}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-black text-[#067a8e]">Explorar <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="bg-[#dce8e5]">
        <div className="mx-auto grid max-w-[1440px] gap-8 px-5 py-10 md:px-8 md:py-12 lg:grid-cols-[1fr_.78fr] lg:items-end">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[#067a8e]">Transparência antes do clique</p>
            <h2 className="mt-2 max-w-2xl font-serif text-3xl font-black tracking-tight text-[#102033] md:text-4xl">Uma boa oferta precisa de contexto.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#405365] md:text-base">
              Mostramos o preço atual junto do histórico disponível e levamos você diretamente para a Amazon para concluir a compra. Não prometemos o menor preço do mundo: ajudamos você a decidir com informação.
            </p>
          </div>
          <div className="rounded-[22px] border border-[#b9d2ca] bg-[#f7f5ee] p-5">
            <div className="flex items-start gap-3">
              <Tags className="mt-0.5 h-5 w-5 shrink-0 text-[#067a8e]" />
              <div>
                <p className="text-sm font-black text-[#102033]">Links de associado, claramente identificados</p>
                <p className="mt-1 text-sm leading-6 text-[#526170]">Como associado da Amazon, o AmazonPicks ganha com compras qualificadas. Isso não muda o preço pago por você.</p>
              </div>
            </div>
            <Link href="/listas" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#067a8e] hover:underline">
              Ver listas da comunidade <Heart className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#102033] px-5 py-7 text-white md:px-8">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 text-sm md:flex-row md:items-center md:justify-between">
          <span className="inline-flex items-center gap-2 font-semibold text-[#d7e5ed]"><Sparkles className="h-4 w-4 text-[#f4c64e]" /> AmazonPicks: descoberta com contexto, não só desconto.</span>
          <Link href="/ofertas" className="inline-flex items-center gap-2 font-black text-[#f4c64e] hover:text-[#ffe38b]">Explorar todas as ofertas <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>
    </main>
  );
}

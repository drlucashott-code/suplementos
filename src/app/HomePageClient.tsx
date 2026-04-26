"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Dumbbell, Home, ShieldCheck, TrendingUp, PawPrint } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import FeedbackModal from "./FeedbackModal";
import BestDealProductCard from "@/components/BestDealProductCard";
import type { BestDeal } from "@/lib/bestDeals";

function TrackHomeView() {
  useEffect(() => {
    const win = window as typeof window & { dataLayer?: object[] };
    win.dataLayer = win.dataLayer || [];
    win.dataLayer.push({
      event: "view_home",
      page_path: "/",
    });
  }, []);

  return null;
}

type HubKey = "suplementos" | "casa" | "pets";

export type CategoryItem = {
  title: string;
  imageSrc: string;
  path: string;
  disabled?: boolean;
};

type QuickCategoryItem = CategoryItem & {
  subtitle: string;
};

const supplementsCategoriesFallback: CategoryItem[] = [
  {
    title: "Barra de proteína",
    imageSrc: "https://m.media-amazon.com/images/I/61RDMRO3uCL._AC_SL1200_.jpg",
    path: "/suplementos/barra",
  },
  {
    title: "Bebida proteica",
    imageSrc: "https://m.media-amazon.com/images/I/51npzHic1NL._AC_SL1000_.jpg",
    path: "/suplementos/bebidaproteica",
  },
  {
    title: "Café funcional",
    imageSrc: "https://m.media-amazon.com/images/I/61hwrgvkjrL._AC_SL1210_.jpg",
    path: "/suplementos/cafe-funcional",
  },
  {
    title: "Creatina",
    imageSrc: "https://m.media-amazon.com/images/I/81UashXoAxL._AC_SL1500_.jpg",
    path: "/suplementos/creatina",
  },
  {
    title: "Pré-treino",
    imageSrc: "https://m.media-amazon.com/images/I/61fGbsRyDWL._AC_SL1333_.jpg",
    path: "/suplementos/pre-treino",
  },
  {
    title: "Whey Protein",
    imageSrc: "https://m.media-amazon.com/images/I/51lOuKbCawL._AC_SL1000_.jpg",
    path: "/suplementos/whey",
  },
];

const supplementQuickSubtitles: Record<string, string> = {
  "/suplementos/barra": "Preço por proteína",
  "/suplementos/bebidaproteica": "Preço por proteína",
  "/suplementos/cafe-funcional": "Preço por dose",
  "/suplementos/creatina": "Dose e pureza",
  "/suplementos/pre-treino": "Cafeína e custo por dose",
  "/suplementos/whey": "Proteína e custo real",
};

const houseQuickSubtitles: Record<string, string> = {
  "/casa/amaciante": "Preço por lavagem",
  "/casa/creme-dental": "Preço por unidade",
  "/casa/condicionador": "Preço por volume",
  "/casa/fralda": "Preço por unidade",
  "/casa/lava-roupa": "Preço por lavagem",
  "/casa/sabao-roupa": "Preço por lavagem",
  "/casa/lenco-umedecido": "Preço por unidade",
  "/casa/papel-higienico": "Preço por metro",
  "/casa/sabao-para-louca": "Preço por lavagem",
  "/casa/sabao-para-loucas": "Preço por lavagem",
  "/casa/saco-de-lixo": "Preço por unidade",
  "/casa/shampoo": "Preço por volume",
};

const quickHeroPriorityMatchers = [
  ["/suplementos/whey", "whey protein"],
  ["/casa/papel-higienico", "papel higienico"],
  ["/suplementos/creatina", "creatina"],
  ["/casa/lava-roupa", "/casa/sabao-roupa", "sabao para roupas", "sabao para roupa"],
  ["/suplementos/barra", "barra de proteina"],
  ["/casa/amaciante", "amaciante"],
  ["/suplementos/bebidaproteica", "bebida proteica"],
  ["/casa/creme-dental", "creme dental"],
  ["/suplementos/cafe-funcional", "cafe funcional"],
  ["/casa/condicionador", "condicionador"],
  ["/suplementos/pre-treino", "pre treino"],
];

function normalizeQuickCategoryValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function sortCategories(items: CategoryItem[]) {
  const active = items
    .filter((item) => !item.disabled)
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

  const disabled = items
    .filter((item) => item.disabled)
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

  return [...active, ...disabled];
}

function buildQuickHeroCategories(
  supplementCategories: CategoryItem[],
  houseCategories: CategoryItem[]
): QuickCategoryItem[] {
  const supplements = sortCategories(supplementCategories).map((item) => ({
    ...item,
    subtitle: supplementQuickSubtitles[item.path] ?? "Preço por unidade",
  }));

  const house = sortCategories(houseCategories).map((item) => ({
    ...item,
    subtitle: houseQuickSubtitles[item.path] ?? "Preço por unidade",
  }));

  const allItems = [...supplements, ...house];
  const prioritized: QuickCategoryItem[] = [];
  const remaining = [...allItems];

  quickHeroPriorityMatchers.forEach((matcherGroup) => {
    const matchIndex = remaining.findIndex((item) => {
      const normalizedPath = normalizeQuickCategoryValue(item.path);
      const normalizedTitle = normalizeQuickCategoryValue(item.title);

      return matcherGroup.some((matcher) => {
        const normalizedMatcher = normalizeQuickCategoryValue(matcher);
        return normalizedPath === normalizedMatcher || normalizedTitle === normalizedMatcher;
      });
    });

    if (matchIndex >= 0) {
      prioritized.push(remaining[matchIndex]);
      remaining.splice(matchIndex, 1);
    }
  });

  return [...prioritized, ...remaining];
}

function chunkQuickHeroCategories(items: QuickCategoryItem[], size: number) {
  const chunks: QuickCategoryItem[][] = [];

  for (let index = 0; index < items.length; index += size) {
    const chunk = items.slice(index, index + size);

    if (chunk.length > 0 && chunk.length < size) {
      const usedPaths = new Set(chunk.map((item) => item.path));
      const fillers = items.filter((item) => !usedPaths.has(item.path)).slice(0, size - chunk.length);
      chunks.push([...chunk, ...fillers]);
      continue;
    }

    chunks.push(chunk);
  }

  return chunks;
}

export default function HomePageClient({
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
  publicLists: Array<{
    slug: string;
    title: string;
    ownerDisplayName: string;
    ownerUsername: string | null;
    itemsCount: number;
    previewImages: string[] | null;
  }>;
}) {
  const router = useRouter();
  const [selectedHub, setSelectedHub] = useState<HubKey>("suplementos");

  const effectiveSupplementCategories = useMemo(
    () =>
      supplementCategories.length > 0
        ? supplementCategories
        : supplementsCategoriesFallback,
    [supplementCategories]
  );

  const categoryGroups = useMemo<Record<HubKey, CategoryItem[]>>(
    () => ({
      suplementos: sortCategories(effectiveSupplementCategories),
      casa: sortCategories(houseCategories),
      pets: sortCategories(petCategories),
    }),
    [effectiveSupplementCategories, houseCategories, petCategories]
  );

  const quickHeroCategories = useMemo(
    () => buildQuickHeroCategories(effectiveSupplementCategories, houseCategories),
    [effectiveSupplementCategories, houseCategories]
  );

  const quickHeroPages = useMemo(
    () => chunkQuickHeroCategories(quickHeroCategories, 4),
    [quickHeroCategories]
  );

  const visibleCategories = categoryGroups[selectedHub];

  const handleCategoryClick = (
    path: string,
    categoryName: string,
    hubName: string = selectedHub
  ) => {
    const win = window as typeof window & { dataLayer?: object[] };
    if (win.dataLayer) {
      win.dataLayer.push({
        event: "click_category",
        category_name: categoryName,
        hub_name: hubName,
      });
    }

    router.push(path);
  };

  const handleHubClick = (hub: HubKey) => {
    const win = window as typeof window & { dataLayer?: object[] };
    if (win.dataLayer) {
      win.dataLayer.push({
        event: "select_home_hub",
        hub_name: hub,
      });
    }

    setSelectedHub(hub);
  };

  return (
    <main className="min-h-screen bg-[#E3E6E6] pb-12 font-sans">
      <TrackHomeView />

        <div className="bg-[#37475A] px-4 py-2 text-center text-[11px] font-medium text-white">
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5 text-[#FFB84D]" />
            <span>Comparador verificado de ofertas Amazon</span>
          </div>
        </div>

      <div className="mx-auto max-w-[1560px] px-3 pb-8 pt-4 md:px-5">
        <section className="relative overflow-hidden rounded-2xl border border-[#d5d9d9] bg-[linear-gradient(90deg,#131921_0%,#1f2f46_52%,#23415d_100%)] text-white shadow-sm">
          <div className="grid gap-4 px-4 py-4 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-8">
            <div>
              <h1 className="max-w-2xl text-[20px] font-bold leading-tight md:text-[34px]">
                Escolha a categoria e compare pelo critério que realmente importa.
              </h1>
              <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-white/84 md:mt-3 md:text-[14px]">
                Preço por dose, por unidade, por grama e histórico de 30 dias para
                encontrar o melhor produto para você.
              </p>

              <div className="mt-3 flex flex-wrap justify-center gap-2 md:justify-start">
                <TrustPill icon={<BarChart3 className="h-3.5 w-3.5" />} label="Análise técnica" />
                <TrustPill icon={<TrendingUp className="h-3.5 w-3.5" />} label="Histórico de 30 dias" />
              </div>
            </div>

            <div className="-mx-4 overflow-x-auto px-4 pb-2 pt-2 md:hidden">
              <div className="flex min-w-max snap-x snap-mandatory gap-3 pr-12">
                {quickHeroPages.map((page, pageIndex) => (
                  <div
                    key={`quick-hero-page-${pageIndex}`}
                    className="grid w-[82vw] shrink-0 snap-start grid-cols-2 gap-3"
                  >
                    {page.map((category) => (
                      <QuickCategoryCard
                        key={category.path}
                        title={category.title}
                        subtitle={category.subtitle}
                        imageSrc={category.imageSrc}
                        onClick={() => router.push(category.path)}
                        compact
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden overflow-x-auto px-1 pb-2 pt-2 md:block">
              <div className="flex min-w-max snap-x snap-mandatory gap-3 px-0">
                {quickHeroCategories.map((category) => (
                  <QuickCategoryCard
                    key={category.path}
                    title={category.title}
                    subtitle={category.subtitle}
                    imageSrc={category.imageSrc}
                    onClick={() => router.push(category.path)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-4 grid gap-4">
          <div className="grid gap-4">
            <section className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
              <div className="mb-4">
                <p className="text-[20px] font-bold text-[#0F1111]">Comprar por categoria</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <HubToggleChip
                    title="Suplementos"
                    subtitle="Creatina, whey, barras e mais"
                    icon={<Dumbbell className="h-4 w-4" />}
                    active={selectedHub === "suplementos"}
                    onClick={() => handleHubClick("suplementos")}
                  />
                  <HubToggleChip
                    title="Casa & Bem-estar"
                    subtitle="Higiene, limpeza e cuidados"
                    icon={<Home className="h-4 w-4" />}
                    badge="Novo"
                    active={selectedHub === "casa"}
                    onClick={() => handleHubClick("casa")}
                  />
                  {petCategories.length > 0 ? (
                    <HubToggleChip
                      title="Pets"
                      subtitle="Antipulgas, higiene e mais"
                      icon={<PawPrint className="h-4 w-4" />}
                      badge="Novo"
                      active={selectedHub === "pets"}
                      onClick={() => handleHubClick("pets")}
                    />
                  ) : null}
                </div>
                <p className="mt-5 text-[12px] text-[#565959]">
                  Abra uma categoria para ver os produtos com ordenação e filtros próprios.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {visibleCategories.map((category) => (
                  <CategoryCard
                    key={category.title}
                    title={category.title}
                    imageSrc={category.imageSrc}
                    disabled={category.disabled}
                    onClick={() => handleCategoryClick(category.path, category.title)}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
              <div className="mb-4">
                <h3 className="text-[18px] font-bold text-[#0F1111]">
                  Melhores ofertas do momento
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
                {bestDeals.map((item) => (
                  <BestDealProductCard
                    key={item.id}
                    item={item}
                    category="home_ofertas"
                    compact
                    showActions={false}
                  />
                ))}
              </div>

              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => router.push("/ofertas")}
                  className="text-[12px] font-bold text-[#007185] hover:underline"
                >
                  Ver mais
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-[18px] font-bold text-[#0F1111]">
                    Listas públicas da comunidade
                  </h3>
                  <p className="mt-1 text-[12px] text-[#565959]">
                    Descubra listas recém-criadas por outros usuários e acompanhe seleções compartilhadas.
                  </p>
                </div>
              </div>

              {publicLists.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#d5d9d9] bg-[#F8FAFA] px-4 py-10 text-center text-sm text-[#565959]">
                  Ainda não existem listas públicas.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {publicLists.map((list) => (
                    <button
                      key={list.slug}
                      onClick={() => router.push(`/listas/${list.slug}`)}
                      className="rounded-2xl border border-[#d5d9d9] bg-[#FCFCFD] p-4 text-left transition hover:border-[#b8c3c4] hover:bg-white hover:shadow-sm"
                    >
                      <div className="mb-3 flex h-[74px] items-center justify-center gap-2 overflow-hidden rounded-2xl bg-[#F8FAFA] px-3">
                        {(list.previewImages ?? []).length > 0 ? (
                          (list.previewImages ?? []).slice(0, 3).map((imageSrc, index) => (
                            <div
                              key={`${list.slug}-preview-${index}`}
                              className="relative h-14 w-14 overflow-hidden rounded-xl bg-white shadow-sm"
                            >
                              <Image
                                src={imageSrc}
                                alt={`${list.title} preview ${index + 1}`}
                                fill
                                sizes="56px"
                                className="object-contain p-1.5"
                                unoptimized
                              />
                            </div>
                          ))
                        ) : (
                          <div className="text-[11px] font-semibold text-[#667085]">
                            Prévia dos produtos
                          </div>
                        )}
                      </div>

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-[16px] font-bold leading-tight text-[#0F1111]">
                            {list.title}
                          </p>
                          <p className="mt-1 text-[12px] text-[#565959]">
                            por {list.ownerDisplayName}
                            {list.ownerUsername ? ` @${list.ownerUsername}` : ""}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-[11px] font-bold text-[#374151]">
                          {list.itemsCount} itens
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => router.push("/listas")}
                  className="text-[12px] font-bold text-[#007185] hover:underline"
                >
                  Ver todas as listas
                </button>
              </div>
            </section>
          </div>
        </section>

        <footer className="mt-8 flex flex-col items-center px-4 pb-4 pt-6 text-center">
          <FeedbackModal />
          <div className="mx-auto mb-4 mt-6 w-16 border-t border-gray-300" />
          <p className="px-6 text-[11px] leading-tight text-[#565959]">
            Participamos do Programa de Associados da Amazon Services LLC.
          </p>
          <p className="mt-2 text-[11px] text-[#565959]">&copy; 2026 Amazon Picks.</p>
        </footer>
      </div>
    </main>
  );
}

function TrustPill({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function QuickCategoryCard({
  title,
  subtitle,
  imageSrc,
  onClick,
  compact = false,
}: {
  title: string;
  subtitle: string;
  imageSrc: string;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`group shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-white/8 text-center transition hover:bg-white/12 ${
        compact ? "w-full p-3" : "w-[78vw] p-3.5 md:w-[210px]"
      }`}
    >
      <div
        className={`relative overflow-hidden rounded-xl bg-white/95 ${
          compact ? "h-[106px]" : "h-[128px] md:h-[118px]"
        }`}
      >
        <Image
          src={imageSrc}
          alt={title}
          fill
          sizes={compact ? "(max-width: 768px) 42vw, 210px" : "(max-width: 768px) 78vw, 210px"}
          className={`object-contain transition-transform duration-300 group-hover:scale-[1.04] ${
            compact ? "p-1" : "p-1.5"
          }`}
          unoptimized
        />
      </div>
      <p
        className={`font-bold leading-tight text-white ${
          compact ? "mt-2 text-[12px]" : "mt-3 text-[14px] md:mt-3 md:text-[14px]"
        }`}
      >
        {title}
      </p>
      <p className={compact ? "text-[10px] text-white/76" : "text-[11px] text-white/76 md:text-[12px]"}>
        {subtitle}
      </p>
    </button>
  );
}

function HubToggleChip({
  title,
  subtitle,
  icon,
  badge,
  active,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`min-w-0 rounded-2xl border px-4 py-3 text-left transition ${
        active
          ? "border-[#007185] bg-[linear-gradient(180deg,#eefaf7_0%,#e2f3ef_100%)] text-[#0F1111] shadow-[inset_0_0_0_1px_rgba(0,113,133,0.06)]"
          : "border-[#d5d9d9] bg-[#F8FAFA] text-[#0F1111] hover:border-[#b8c3c4] hover:bg-white"
      }`}
    >
      <div className="relative flex flex-col items-center gap-2">
        {badge ? (
          <span className="absolute right-0 top-0 rounded-full bg-[#CC0C39] px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-sm">
            {badge}
          </span>
        ) : null}
        <span
          className={`inline-flex h-8 w-8 items-center justify-center rounded-xl ${
            active ? "bg-white text-[#007185]" : "bg-white text-[#5f6b6b]"
          }`}
        >
          {icon}
        </span>
        <span className="text-center text-[14px] font-bold leading-tight">{title}</span>
      </div>
      <p className="mt-2 text-center text-[11px] leading-snug text-[#565959]">{subtitle}</p>
    </button>
  );
}

interface CategoryCardProps {
  title: string;
  imageSrc: string;
  onClick: () => void;
  disabled?: boolean;
}

function CategoryCard({ title, imageSrc, onClick, disabled }: CategoryCardProps) {
  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`relative overflow-hidden rounded-xl border p-3.5 text-center shadow-sm transition ${
        disabled
          ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-60"
          : "cursor-pointer border-[#d5d9d9] bg-[#F8FAFA] hover:border-[#aab7b8] hover:bg-white"
      }`}
    >
      <div className="relative h-[112px] overflow-hidden rounded-lg bg-white md:h-[132px]">
        <Image
          src={imageSrc}
          alt={title}
          fill
          sizes="(max-width: 768px) 44vw, 240px"
          className="object-contain p-2 mix-blend-multiply"
          unoptimized
        />
      </div>
      <p className="mt-3 text-[15px] font-bold leading-tight text-[#0F1111]">{title}</p>
    </div>
  );
}

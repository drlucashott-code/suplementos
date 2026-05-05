"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  ArrowRight,
  Dumbbell,
  Home,
  Heart,
  PawPrint,
  ShieldCheck,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import FeedbackModal from "../FeedbackModal";
import BestDealProductCard from "@/components/BestDealProductCard";
import type { BestDeal } from "@/lib/bestDeals";
import { buildPublicListPath } from "@/lib/siteSocial";

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

export default function HomeV3Client({
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
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);

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
  const carouselSlides = [
    {
      key: "1",
      src: "/home-v3/1.png",
      mobileSrc: "/home-v3/1m.png",
      alt: "Produto 1",
    },
    {
      key: "2",
      src: "/home-v3/2.png",
      mobileSrc: "/home-v3/2m.png",
      alt: "Produto 2",
    },
    {
      key: "3",
      src: "/home-v3/3.png",
      mobileSrc: "/home-v3/3m.png",
      alt: "Produto 3",
    },
    {
      key: "4",
      src: "/home-v3/4.png",
      mobileSrc: "/home-v3/4m.png",
      alt: "Produto 4",
    },
  ];

  const handleCarouselDotClick = (index: number) => {
    setCarouselIndex(index);
    carouselRef.current?.scrollTo({
      left: index * carouselRef.current.clientWidth,
      behavior: "smooth",
    });
  };

  const handleCarouselScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    const nextIndex = Math.round(container.scrollLeft / container.clientWidth);

    if (nextIndex !== carouselIndex) {
      setCarouselIndex(nextIndex);
    }
  };

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

      <div className="mx-auto max-w-[1560px] px-3 pb-8 pt-2 md:px-5">
        <section className="relative overflow-hidden rounded-2xl border border-[#d5d9d9] bg-[linear-gradient(90deg,#131921_0%,#1f2f46_52%,#23415d_100%)] text-white shadow-sm">
            <div className="grid gap-8 px-4 py-3 md:grid-cols-[1fr_1.18fr] md:items-start md:gap-10 md:px-8 md:py-5">
              <div className="flex max-w-[600px] flex-col gap-4 md:pt-10">
              <h1 className="max-w-[520px] text-left text-[clamp(28px,3.2vw,44px)] font-black leading-[1.1] tracking-[-0.02em]">
                Compare produtos{" "}
                <span className="block">pelo custo real</span>{" "}
                <span className="block">e compre no momento certo</span>
              </h1>
              <div className="grid w-full max-w-[600px] grid-cols-1 gap-4 md:grid-cols-2">
                <DecisionBadge
                  icon={<Wallet className="h-4 w-4" />}
                  title="PREÇO POR USO"
                  description="Compare por dose, unidade ou rendimento."
                />
                <DecisionBadge
                  icon={<TrendingUp className="h-4 w-4" />}
                  title="HISTÓRICO DE PREÇOS"
                  description="Veja até 1 ano e entenda o momento certo."
                  accent="amber"
                />
                <DecisionBadge
                  icon={<Heart className="h-4 w-4" />}
                  title="ACOMPANHE PRODUTOS"
                  description="Salve produtos da Amazon e acompanhe automaticamente."
                  accent="emerald"
                />
                <DecisionBadge
                  icon={<Bell className="h-4 w-4" />}
                  title="ALERTA DE QUEDA"
                  description="Receba aviso quando o preço baixar."
                  accent="emerald"
                />
              </div>

            </div>

            <div className="rounded-[1.75rem] border border-white/12 bg-white/10 p-3 shadow-2xl backdrop-blur md:p-4 md:-mt-1">
              <div className="rounded-[1.5rem] border border-[#d5d9d9] bg-[#F8FAFA] p-4 text-slate-950 shadow-lg">
                <div className="mb-3 flex items-center justify-end gap-1">
                    {carouselSlides.map((slide, index) => (
                      <button
                        key={slide.key}
                        type="button"
                        onClick={() => handleCarouselDotClick(index)}
                        className={`h-2.5 w-2.5 rounded-full transition ${
                          carouselIndex === index ? "bg-[#0F1111]" : "bg-[#D0D5DD]"
                        }`}
                        aria-label={`Ir para o slide ${index + 1}`}
                      />
                    ))}
                </div>

                <div className="overflow-visible rounded-[1.5rem] border border-[#d5d9d9] bg-white shadow-sm">
                  <div
                    ref={carouselRef}
                    onScroll={handleCarouselScroll}
                    className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {carouselSlides.map((slide) => (
                      <div key={slide.key} className="min-w-full snap-start">
                        <div className="relative flex min-h-[420px] w-full items-center justify-center overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100 px-2 py-2 sm:min-h-[460px] md:min-h-[440px] md:overflow-visible">
                          <Image
                            src={slide.mobileSrc ?? slide.src}
                            alt={slide.alt}
                            fill
                            className="block object-cover object-center md:hidden"
                            sizes="(max-width: 768px) 100vw, 50vw"
                            unoptimized
                          />
                          <Image
                            src={slide.src}
                            alt={slide.alt}
                            width={1200}
                            height={900}
                            className="hidden h-auto w-full max-w-[650px] object-contain p-0 md:block"
                            sizes="(max-width: 768px) 100vw, 50vw"
                            unoptimized
                          />
                      </div>
                    </div>
                    ))}
                  </div>
                </div>
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
                    Descubra listas criadas por outros usuários ou crie suas próprias seleções de produtos monitorados.
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
                      onClick={() =>
                        router.push(
                          list.ownerUsername
                            ? buildPublicListPath(list.ownerUsername, list.slug)
                            : `/listas/${list.slug}`
                        )
                      }
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

function DecisionBadge({
  icon,
  title,
  description,
  accent = "indigo",
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent?: "indigo" | "emerald" | "amber";
}) {
  const accentStyles = {
    indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
  }[accent];

  return (
    <div
      className={`flex h-full w-full cursor-pointer flex-col gap-1.5 rounded-[16px] border p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${accentStyles}`}
    >
      <div className="flex items-start gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 shadow-sm">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold uppercase tracking-[0.5px] leading-[1.2]">{title}</p>
          <p className="text-[13px] leading-[1.4] text-slate-600/85">{description}</p>
        </div>
      </div>
    </div>
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

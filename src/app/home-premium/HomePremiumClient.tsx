"use client";

import { useEffect, useMemo, useRef, useState, type UIEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Home,
  LayoutList,
  PawPrint,
  ShieldCheck,
  Sparkles,
  Tags,
  TrendingUp,
} from "lucide-react";
import BestDealProductCard from "@/components/BestDealProductCard";
import type { BestDeal } from "@/lib/bestDeals";
import { buildPublicListPath } from "@/lib/siteSocial";

type HubKey = "suplementos" | "casa" | "pets";

export type CategoryItem = {
  title: string;
  imageSrc: string;
  path: string;
  disabled?: boolean;
};

type PublicListItem = {
  slug: string;
  title: string;
  ownerDisplayName: string;
  ownerUsername: string | null;
  itemsCount: number;
  previewImages: string[] | null;
  createdAt: string;
};

type FeaturedCategory = CategoryItem;

const hubMeta: Record<
  HubKey,
  {
    label: string;
    subtitle: string;
    icon: React.ReactNode;
  }
> = {
  suplementos: {
    label: "Suplementos",
    subtitle: "Proteína, dose, cafeína e rendimento",
    icon: <Dumbbell className="h-4 w-4" />,
  },
  casa: {
    label: "Casa & bem-estar",
    subtitle: "Lavagem, unidade, metro e volume",
    icon: <Home className="h-4 w-4" />,
  },
  pets: {
    label: "Pets",
    subtitle: "Peso, higiene e custo por unidade",
    icon: <PawPrint className="h-4 w-4" />,
  },
};

const signalItems = [
  {
    title: "Custo real por uso",
    description: "Compare por dose, unidade, metro, peso ou lavagem.",
    icon: <Tags className="h-4 w-4" />,
  },
  {
    title: "Histórico de preços",
    description: "Veja se a oferta atual está realmente abaixo da média.",
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    title: "Alertas práticos",
    description: "Salve produtos e acompanhe quedas sem abrir a Amazon todo dia.",
    icon: <Bell className="h-4 w-4" />,
  },
  {
    title: "Listas públicas",
    description: "Descubra seleções montadas por outros usuários.",
    icon: <LayoutList className="h-4 w-4" />,
  },
];

const carouselSlides = [
  { src: "/home-premium/carousel/01-whey.png", alt: "Comparação de whey protein" },
  { src: "/home-premium/carousel/02-lavagem.png", alt: "Comparação de custo por lavagem" },
  { src: "/home-premium/carousel/03-unidade.png", alt: "Comparação de custo por unidade" },
  { src: "/home-premium/carousel/04-fralda-v2.png", alt: "Comparação de fraldas por unidade" },
];

function TrackHomeView() {
  useEffect(() => {
    const win = window as typeof window & { dataLayer?: object[] };
    win.dataLayer = win.dataLayer || [];
    win.dataLayer.push({
      event: "view_home",
      page_path: "/home-premium",
    });
  }, []);

  return null;
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

function buildFeaturedCategories(
  supplementCategories: CategoryItem[],
  houseCategories: CategoryItem[],
  petCategories: CategoryItem[]
): FeaturedCategory[] {
  const combined = [
    ...sortCategories(supplementCategories),
    ...sortCategories(houseCategories),
    ...sortCategories(petCategories),
  ];

  const preferred = [
    "/suplementos/whey",
    "/casa/papel-higienico",
    "/suplementos/creatina",
    "/casa/lava-roupa",
  ];

  const ordered: FeaturedCategory[] = [];
  const remaining = [...combined];

  for (const path of preferred) {
    const index = remaining.findIndex((item) => item.path === path);
    if (index >= 0) {
      ordered.push(remaining[index]);
      remaining.splice(index, 1);
    }
  }

  return [...ordered, ...remaining].slice(0, 4);
}

function formatListDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function HomePremiumClient({
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
  const [selectedHub, setSelectedHub] = useState<HubKey>("suplementos");
  const [heroSlide, setHeroSlide] = useState(0);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const categoryGroups = useMemo<Record<HubKey, CategoryItem[]>>(
    () => ({
      suplementos: sortCategories(supplementCategories),
      casa: sortCategories(houseCategories),
      pets: sortCategories(petCategories),
    }),
    [supplementCategories, houseCategories, petCategories]
  );

  const featuredCategories = useMemo(
    () => buildFeaturedCategories(supplementCategories, houseCategories, petCategories),
    [supplementCategories, houseCategories, petCategories]
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

  const handleCarouselScroll = (event: UIEvent<HTMLDivElement>) => {
    const container = event.currentTarget;
    if (!container.clientWidth) return;

    const nextSlide = Math.round(container.scrollLeft / container.clientWidth);
    setHeroSlide((current) => (current === nextSlide ? current : nextSlide));
  };

  const scrollCarouselTo = (index: number) => {
    const container = carouselRef.current;
    if (!container) return;

    container.scrollTo({
      left: index * container.clientWidth,
      behavior: "smooth",
    });
    setHeroSlide(index);
  };

  return (
    <main className="min-h-screen bg-[#F4F6F8] pb-12 font-sans text-[#0F1111]">
      <TrackHomeView />

      <div className="border-b border-[#E5EBF0] bg-[#F8FAFC]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-center gap-2 px-4 py-2 text-center text-[12px] font-medium text-[#475467] md:px-8">
          <ShieldCheck className="h-3.5 w-3.5 text-[#007185]" />
          <span>Comparador verificado de ofertas Amazon.</span>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 pb-8 pt-5 md:px-8 md:pt-6">
        <section className="overflow-hidden rounded-[28px] border border-[#D8DEE6] bg-[linear-gradient(135deg,#131921_0%,#18283A_52%,#21405F_100%)] shadow-[0_20px_60px_rgba(15,17,17,0.10)]">
          <div className="grid gap-8 px-5 py-6 md:px-8 md:py-8 lg:grid-cols-[minmax(0,1.05fr)_420px] lg:items-center lg:px-10 lg:py-10">
            <div className="max-w-[720px]">
              <h1 className="mt-4 max-w-[680px] text-[32px] font-bold leading-[1.04] text-white md:text-[44px] lg:text-[50px]">
                Compare produtos da Amazon pelo custo real
              </h1>
              <p className="mt-4 max-w-[620px] text-[15px] leading-7 text-white/76 md:text-[17px]">
                Escolha uma categoria e descubra a melhor opção.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:max-w-[680px]">
                {signalItems.map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[20px] border border-white/10 bg-white/8 px-4 py-3 text-white/88"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#FFD814]">
                        {item.icon}
                      </span>
                      <div>
                        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/92">
                          {item.title}
                        </p>
                        <p className="mt-1 text-[12px] leading-5 text-white/68">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overflow-hidden rounded-[26px] border border-white/10 bg-white/8 p-3 backdrop-blur-[2px] md:p-4">
              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    scrollCarouselTo((heroSlide - 1 + carouselSlides.length) % carouselSlides.length)
                  }
                  className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/35 p-2 text-white/90 shadow-lg backdrop-blur-sm transition hover:bg-black/45 md:left-4"
                  aria-label="Imagem anterior"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => scrollCarouselTo((heroSlide + 1) % carouselSlides.length)}
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/15 bg-black/35 p-2 text-white/90 shadow-lg backdrop-blur-sm transition hover:bg-black/45 md:right-4"
                  aria-label="Próxima imagem"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>

                <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-white shadow-[0_18px_40px_rgba(15,17,17,0.10)]">
                  <div
                    ref={carouselRef}
                    onScroll={handleCarouselScroll}
                    className="flex h-full w-full snap-x snap-mandatory overflow-x-auto scroll-smooth touch-pan-x overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {carouselSlides.map((slide) => (
                      <div key={slide.src} className="relative h-full w-full shrink-0 snap-start">
                        <Image
                          src={slide.src}
                          alt={slide.alt}
                          fill
                          sizes="(max-width: 768px) 82vw, 420px"
                          className="object-contain"
                          priority={heroSlide === 0}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          id="categorias"
          className="mt-6 rounded-[28px] border border-[#D8DEE6] bg-white px-5 py-5 shadow-[0_10px_40px_rgba(15,17,17,0.05)] md:px-7 md:py-6"
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-[720px]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#007185]">
                Navegação principal
              </p>
              <h2 className="mt-2 text-[28px] font-bold leading-tight text-[#0F1111] md:text-[32px]">
                Comprar por categoria
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-[#667085] md:text-[16px]">
                Escolha uma categoria para comparar produtos com contexto real.
              </p>
            </div>

            <div className="grid w-full gap-3 md:max-w-[700px] md:grid-cols-3">
              {(Object.keys(hubMeta) as HubKey[])
                .filter((hub) => hub !== "pets" || petCategories.length > 0)
                .map((hub) => {
                  const meta = hubMeta[hub];
                  const active = selectedHub === hub;

                  return (
                    <button
                      key={hub}
                      type="button"
                      onClick={() => handleHubClick(hub)}
                      aria-pressed={active}
                      className={`flex min-h-[68px] items-center gap-3 rounded-[18px] border px-4 py-3 text-left transition ${
                        active
                          ? "border-[#0F1111] bg-[#0F1111] text-white shadow-[0_12px_28px_rgba(15,17,17,0.12)]"
                          : "border-[#E5EBF0] bg-[#F8FAFC] text-[#0F1111] hover:border-[#C9D3DD] hover:bg-white"
                      }`}
                    >
                      <span
                        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                          active ? "bg-white/10 text-[#FFD814]" : "bg-white text-[#007185]"
                        }`}
                      >
                        {meta.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[15px] font-semibold leading-tight">{meta.label}</span>
                        <span className={`mt-1 block text-[12px] leading-5 ${active ? "text-white/72" : "text-[#667085]"}`}>
                          {meta.subtitle}
                        </span>
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {visibleCategories.map((category) => (
              <CategoryCard
                key={category.path}
                category={category}
                onClick={() => handleCategoryClick(category.path, category.title)}
              />
            ))}
          </div>
        </section>

        <section
          id="melhores-ofertas"
          className="mt-6 rounded-[28px] border border-[#D8DEE6] bg-white px-5 py-5 shadow-[0_10px_40px_rgba(15,17,17,0.05)] md:px-7 md:py-6"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-[720px]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#007185]">
                Curadoria diária
              </p>
              <h2 className="mt-2 text-[28px] font-bold leading-tight text-[#0F1111] md:text-[32px]">
                Melhores ofertas do momento
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-[#667085] md:text-[16px]">
                Descontos relevantes com preço atual válido e leitura rápida do valor real da oferta.
              </p>
            </div>

            <Link
              href="/ofertas"
              className="inline-flex items-center gap-2 self-start rounded-full border border-[#D8DEE6] bg-[#F8FAFC] px-4 py-2.5 text-[13px] font-semibold text-[#0F1111] transition hover:border-[#C9D3DD] hover:bg-white"
            >
              Ver todas
              <ArrowRight className="h-4 w-4 text-[#007185]" />
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {bestDeals.map((item) => (
              <BestDealProductCard
                key={item.id}
                item={item}
                category="home_premium_ofertas"
                compact
                showActions={false}
              />
            ))}
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-[#D8DEE6] bg-white px-5 py-5 shadow-[0_10px_40px_rgba(15,17,17,0.05)] md:px-7 md:py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-[760px]">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#007185]">
                Comunidade
              </p>
              <h2 className="mt-2 text-[28px] font-bold leading-tight text-[#0F1111] md:text-[32px]">
                Listas públicas da comunidade
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-[#667085] md:text-[16px]">
                Veja seleções criadas por usuários e acompanhe produtos monitorados por outras pessoas.
              </p>
            </div>

            <Link
              href="/listas"
              className="inline-flex items-center gap-2 self-start rounded-full border border-[#D8DEE6] bg-[#F8FAFC] px-4 py-2.5 text-[13px] font-semibold text-[#0F1111] transition hover:border-[#C9D3DD] hover:bg-white"
            >
              Ver todas
              <ArrowRight className="h-4 w-4 text-[#007185]" />
            </Link>
          </div>

          {publicLists.length === 0 ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-[#D8DEE6] bg-[#F8FAFC] px-6 py-12 text-center text-[14px] text-[#667085]">
              Ainda não existem listas públicas.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {publicLists.map((list) => (
                <Link
                  key={list.slug}
                  href={
                    list.ownerUsername
                      ? buildPublicListPath(list.ownerUsername, list.slug)
                      : `/listas/${list.slug}`
                  }
                  className="group rounded-[24px] border border-[#E5EBF0] bg-[#FCFDFE] p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#D1DAE3] hover:bg-white hover:shadow-[0_12px_28px_rgba(15,17,17,0.06)]"
                >
                  <div className="flex h-[94px] items-center justify-center gap-2 overflow-hidden rounded-[20px] border border-[#EEF2F6] bg-[#F8FAFC] px-3">
                    {(list.previewImages ?? []).length > 0 ? (
                      (list.previewImages ?? []).slice(0, 3).map((imageSrc, index) => (
                        <div
                          key={`${list.slug}-preview-${index}`}
                          className="relative h-16 w-16 overflow-hidden rounded-[16px] border border-[#EDF2F7] bg-white"
                        >
                          <Image
                            src={imageSrc}
                            alt={`${list.title} preview ${index + 1}`}
                            fill
                            sizes="64px"
                            className="object-contain p-1.5"
                            unoptimized
                          />
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center text-center">
                        <LayoutList className="h-5 w-5 text-[#98A2B3]" />
                        <span className="mt-2 text-[11px] font-semibold text-[#667085]">
                          Prévia dos produtos
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[16px] font-bold leading-tight text-[#0F1111]">
                        {list.title}
                      </p>
                      <p className="mt-1 text-[12px] leading-5 text-[#667085]">
                        por {list.ownerDisplayName}
                        {list.ownerUsername ? ` @${list.ownerUsername}` : ""}
                      </p>
                    </div>
                    <span className="rounded-full bg-[#EEF6F7] px-2.5 py-1 text-[11px] font-bold text-[#007185]">
                      {list.itemsCount} itens
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[#EEF2F6] pt-3 text-[12px] text-[#667085]">
                    <span>{formatListDate(list.createdAt)}</span>
                    <span className="inline-flex items-center gap-1 font-semibold text-[#0F1111]">
                      Abrir lista
                      <ChevronRight className="h-4 w-4 text-[#007185]" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <footer className="mt-8 px-4 pb-6 pt-3 text-center">
          <div className="mx-auto max-w-[560px] border-t border-[#D8DEE6] pt-5">
            <p className="text-[11px] leading-5 text-[#667085]">
              Participamos do Programa de Associados da Amazon Services LLC.
            </p>
            <p className="mt-2 text-[11px] text-[#667085]">© 2026 Amazonpicks.</p>
          </div>
        </footer>
      </div>
    </main>
  );
}

function CategoryCard({
  category,
  onClick,
}: {
  category: CategoryItem;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={category.disabled}
      className={`group rounded-[24px] border p-3 text-left transition duration-200 ${
        category.disabled
          ? "cursor-not-allowed border-[#EEF2F6] bg-[#F8FAFC] opacity-60"
          : "border-[#E5EBF0] bg-[#FCFDFE] hover:-translate-y-0.5 hover:border-[#D1DAE3] hover:bg-white hover:shadow-[0_12px_28px_rgba(15,17,17,0.06)]"
      }`}
    >
      <div className="relative h-[138px] overflow-hidden rounded-[18px] border border-[#EEF2F6] bg-[#F8FAFC]">
        <Image
          src={category.imageSrc}
          alt={category.title}
          fill
          sizes="(max-width: 768px) 44vw, 280px"
          className="object-contain p-3 transition duration-300 group-hover:scale-[1.03]"
          unoptimized
        />
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-[16px] font-bold leading-tight text-[#0F1111]">{category.title}</p>
        <span className="mt-0.5 text-[#007185]">
          <ChevronRight className="h-5 w-5" />
        </span>
      </div>
    </button>
  );
}



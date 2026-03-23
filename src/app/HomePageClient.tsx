"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, Dumbbell, Home, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Header from "./Header";
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

type HubKey = "suplementos" | "casa";

export type CategoryItem = {
  title: string;
  imageSrc: string;
  path: string;
  disabled?: boolean;
};

type QuickCategoryItem = CategoryItem & {
  subtitle: string;
};

const supplementsCategories: CategoryItem[] = [
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
  "/casa/lenco-umedecido": "Preço por unidade",
  "/casa/papel-higienico": "Preço por metro",
  "/casa/sabao-para-louca": "Preço por lavagem",
  "/casa/saco-de-lixo": "Preço por unidade",
};

const quickHeroPriorityPaths = [
  "/suplementos/whey",
  "/casa/papel-higienico",
  "/suplementos/creatina",
  "/casa/lava-roupa",
  "/suplementos/barra",
  "/casa/amaciante",
  "/suplementos/bebidaproteica",
  "/casa/creme-dental",
  "/suplementos/cafe-funcional",
  "/casa/condicionador",
  "/suplementos/pre-treino",
];

function sortCategories(items: CategoryItem[]) {
  const active = items
    .filter((item) => !item.disabled)
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

  const disabled = items
    .filter((item) => item.disabled)
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

  return [...active, ...disabled];
}

function buildQuickHeroCategories(houseCategories: CategoryItem[]): QuickCategoryItem[] {
  const supplements = sortCategories(supplementsCategories).map((item) => ({
    ...item,
    subtitle: supplementQuickSubtitles[item.path] ?? "Preço por unidade",
  }));

  const house = sortCategories(houseCategories).map((item) => ({
    ...item,
    subtitle: houseQuickSubtitles[item.path] ?? "Preço por unidade",
  }));

  const allItems = [...supplements, ...house];
  const byPath = new Map(allItems.map((item) => [item.path, item]));
  const prioritized = quickHeroPriorityPaths
    .map((path) => byPath.get(path))
    .filter((item): item is QuickCategoryItem => Boolean(item));

  const usedPaths = new Set(prioritized.map((item) => item.path));
  const remaining = allItems.filter((item) => !usedPaths.has(item.path));

  return [...prioritized, ...remaining];
}

export default function HomePageClient({
  houseCategories,
  bestDeals,
}: {
  houseCategories: CategoryItem[];
  bestDeals: BestDeal[];
}) {
  const router = useRouter();
  const [selectedHub, setSelectedHub] = useState<HubKey>("suplementos");

  const categoryGroups = useMemo<Record<HubKey, CategoryItem[]>>(
    () => ({
      suplementos: sortCategories(supplementsCategories),
      casa: sortCategories(houseCategories),
    }),
    [houseCategories]
  );

  const quickHeroCategories = useMemo(
    () => buildQuickHeroCategories(houseCategories),
    [houseCategories]
  );

  const visibleCategories = categoryGroups[selectedHub];

  const handleCategoryClick = (path: string, categoryName: string) => {
    const win = window as typeof window & { dataLayer?: object[] };
    if (win.dataLayer) {
      win.dataLayer.push({
        event: "click_category",
        category_name: categoryName,
        hub_name: selectedHub,
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

      <Header extraCategories={houseCategories} />

      <div className="bg-[#37475A] px-4 py-2 text-center text-[11px] font-medium text-white">
        Compare ofertas Amazon com leitura técnica de preço.
      </div>

      <div className="mx-auto max-w-[1560px] px-3 pb-8 pt-4 md:px-5">
        <section className="relative overflow-hidden rounded-2xl border border-[#d5d9d9] bg-[linear-gradient(90deg,#131921_0%,#1f2f46_52%,#23415d_100%)] text-white shadow-sm">
          <div className="grid gap-4 px-4 py-4 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:py-8">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#FFB84D]">
                Amazon Picks
              </p>
              <h1 className="max-w-2xl text-[20px] font-bold leading-tight md:text-[34px]">
                Encontre a categoria certa e compare pelo critério que realmente importa.
              </h1>
              <p className="mt-2 max-w-xl text-[12px] leading-relaxed text-white/84 md:mt-3 md:text-[14px]">
                Preço por dose, por unidade, por grama e histórico de 30 dias para
                decidir melhor antes de abrir a oferta na Amazon.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <TrustPill icon={<BarChart3 className="h-3.5 w-3.5" />} label="Análise técnica" />
                <TrustPill icon={<TrendingUp className="h-3.5 w-3.5" />} label="Histórico de 30 dias" />
              </div>
            </div>

            <div className="-mx-1 overflow-x-auto pb-2">
              <div className="flex min-w-max gap-3 px-1">
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

        <section className="mt-4 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm">
            <p className="text-[18px] font-bold text-[#0F1111]">Departamentos</p>
            <div className="mt-4 grid gap-3">
              <HubPanel
                title="Suplementos"
                subtitle="Creatina, whey, barras e mais"
                icon={<Dumbbell className="h-5 w-5" />}
                active={selectedHub === "suplementos"}
                onClick={() => handleHubClick("suplementos")}
              />
              <HubPanel
                title="Casa & Bem-estar"
                subtitle="Higiene, limpeza e cuidados"
                icon={<Home className="h-5 w-5" />}
                active={selectedHub === "casa"}
                onClick={() => handleHubClick("casa")}
              />
            </div>
          </aside>

          <div className="grid gap-4">
            <section className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm md:p-5">
              <div className="mb-4">
                <h2 className="text-[20px] font-bold text-[#0F1111]">
                  {selectedHub === "suplementos"
                    ? "Compare por categoria em suplementos"
                    : "Compare por categoria em casa"}
                </h2>
                <p className="text-[12px] text-[#565959]">
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
}: {
  title: string;
  subtitle: string;
  imageSrc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group w-[190px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/8 p-3.5 text-center transition hover:bg-white/12 md:w-[210px]"
    >
      <div className="relative h-[98px] overflow-hidden rounded-xl bg-white/95 md:h-[118px]">
        <Image
          src={imageSrc}
          alt={title}
          fill
          sizes="(max-width: 768px) 56vw, 210px"
          className="object-contain p-2 transition-transform duration-300 group-hover:scale-[1.04]"
          unoptimized
        />
      </div>
      <p className="mt-2.5 text-[13px] font-bold leading-tight text-white md:mt-3 md:text-[14px]">
        {title}
      </p>
      <p className="text-[11px] text-white/76 md:text-[12px]">{subtitle}</p>
    </button>
  );
}

function HubPanel({
  title,
  subtitle,
  icon,
  active,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border p-3.5 text-left transition ${
        active
          ? "border-[#007185] bg-[#E6F4F1]"
          : "border-[#d5d9d9] bg-[#F8FAFA] hover:border-[#aab7b8]"
      }`}
    >
      <div className="mb-2 inline-flex rounded-lg bg-white p-2 text-[#007185] shadow-sm">
        {icon}
      </div>
      <p className="text-[14px] font-bold text-[#0F1111]">{title}</p>
      <p className="mt-1 text-[12px] leading-snug text-[#565959]">{subtitle}</p>
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

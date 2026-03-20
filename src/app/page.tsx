"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, TrendingUp, ShieldCheck, Dumbbell, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Header from "./Header";
import FeedbackModal from "./FeedbackModal";

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

type CategoryItem = {
  title: string;
  imageSrc: string;
  path: string;
  disabled?: boolean;
};

const categoryGroups: Record<HubKey, CategoryItem[]> = {
  suplementos: [
    {
      title: "Barra de proteína",
      imageSrc: "https://m.media-amazon.com/images/I/61RDMRO3uCL._AC_SL1200_.jpg",
      path: "/barra",
    },
    {
      title: "Bebida proteica",
      imageSrc: "https://m.media-amazon.com/images/I/51npzHic1NL._AC_SL1000_.jpg",
      path: "/bebidaproteica",
    },
    {
      title: "Café funcional",
      imageSrc: "https://m.media-amazon.com/images/I/61hwrgvkjrL._AC_SL1210_.jpg",
      path: "/cafe-funcional",
    },
    {
      title: "Creatina",
      imageSrc: "https://m.media-amazon.com/images/I/81UashXoAxL._AC_SL1500_.jpg",
      path: "/creatina",
    },
    {
      title: "Pré-treino",
      imageSrc: "https://m.media-amazon.com/images/I/61fGbsRyDWL._AC_SL1333_.jpg",
      path: "/pre-treino",
    },
    {
      title: "Whey Protein",
      imageSrc: "https://m.media-amazon.com/images/I/51lOuKbCawL._AC_SL1000_.jpg",
      path: "/whey",
    },
  ],
  casa: [
    {
      title: "Amaciante",
      imageSrc: "https://m.media-amazon.com/images/I/61NJbm2a9tL._AC_SL1200_.jpg",
      path: "/casa/amaciante",
    },
    {
      title: "Creme dental",
      imageSrc: "https://m.media-amazon.com/images/I/618cxCZ8wHL._AC_SL1000_.jpg",
      path: "/casa/creme-dental",
    },
    {
      title: "Fralda",
      imageSrc: "https://m.media-amazon.com/images/I/71EGaknfKuL._AC_SL1500_.jpg",
      path: "/casa/fralda",
    },
    {
      title: "Papel higiênico",
      imageSrc: "https://m.media-amazon.com/images/I/71uftHmzxQL._AC_SL1500_.jpg",
      path: "/casa/papel-higienico",
    },
    {
      title: "Sabão para roupas",
      imageSrc: "https://m.media-amazon.com/images/I/71bXBFl912L._AC_SL1500_.jpg",
      path: "/casa/sabao-roupa",
    },
    {
      title: "Saco de lixo",
      imageSrc: "https://m.media-amazon.com/images/I/51QDIzZJCgL._AC_SL1000_.jpg",
      path: "/casa/saco-de-lixo",
    },
    {
      title: "Sabão para louças",
      imageSrc: "https://m.media-amazon.com/images/I/71cHvPHeE7L._AC_SL1500_.jpg",
      path: "/casa/sabao-louca",
    },
  ],
};

function sortCategories(items: CategoryItem[]) {
  const active = items
    .filter((item) => !item.disabled)
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

  const disabled = items
    .filter((item) => item.disabled)
    .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

  return [...active, ...disabled];
}

export default function HomePage() {
  const router = useRouter();
  const [selectedHub, setSelectedHub] = useState<HubKey>("suplementos");

  const visibleCategories = useMemo(
    () => sortCategories(categoryGroups[selectedHub]),
    [selectedHub]
  );

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
    <main className="min-h-screen bg-[#EAEDED] pb-20 font-sans">
      <TrackHomeView />

      <Header />

      <div className="flex items-center justify-center gap-2 bg-[#37475A] px-4 py-2.5 text-[12px] font-medium text-white shadow-inner">
        <ShieldCheck className="h-4 w-4 text-[#FF9900]" />
        <span>Comparador verificado de ofertas Amazon</span>
      </div>

      <div className="relative overflow-hidden border-b border-gray-200 bg-white">
        <div className="relative z-10 mx-auto max-w-lg px-5 pb-10 pt-8 text-center">
          <span className="mb-4 inline-block rounded border border-gray-300 bg-[#F0F2F2] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#007185]">
            Guia do Consumidor
          </span>

          <h1 className="mb-8 text-[18px] font-bold leading-snug text-[#0F1111] sm:text-[20px]">
            Utilizamos filtros inteligentes para encontrar o melhor produto para você.
          </h1>

          <div className="mt-2 grid grid-cols-2 gap-8 px-2">
            <div className="flex flex-col items-center gap-2 text-center">
              <BarChart3 className="h-8 w-8 text-[#007185]" />
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-[#0F1111]">
                  Análise Técnica
                </span>
                <span className="text-[12px] text-[#565959]">
                  Custo real por unidade
                </span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 text-center">
              <TrendingUp className="h-8 w-8 text-[#007185]" />
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-[#0F1111]">
                  Preço Justo
                </span>
                <span className="text-[12px] text-[#565959]">
                  Histórico de 30 dias
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 h-6 w-full bg-gradient-to-b from-transparent to-[#EAEDED]/50" />
      </div>

      <div className="relative z-20 mx-auto mt-4 max-w-xl space-y-4 px-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <HubCard
              title="Suplementos"
              subtitle="Creatina, whey, barras e mais"
              icon={<Dumbbell className="h-6 w-6" />}
              active={selectedHub === "suplementos"}
              onClick={() => handleHubClick("suplementos")}
            />

            <HubCard
              title="Casa & Bem-estar"
              subtitle="Higiene, limpeza e cuidados"
              icon={<Home className="h-6 w-6" />}
              active={selectedHub === "casa"}
              badge="Novo"
              onClick={() => handleHubClick("casa")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
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

        <footer className="flex flex-col items-center px-4 pb-6 pt-10 text-center">
          <FeedbackModal />

          <div className="mx-auto mb-4 w-16 border-t border-gray-300" />
          <p className="px-6 text-[11px] leading-tight text-[#565959]">
            Participamos do Programa de Associados da Amazon Services LLC.
          </p>
          <p className="mt-2 text-[11px] text-[#565959]">
            &copy; 2026 Amazon Picks.
          </p>
        </footer>
      </div>
    </main>
  );
}

interface HubCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  active?: boolean;
  badge?: string;
  onClick: () => void;
}

function HubCard({ title, subtitle, icon, active, badge, onClick }: HubCardProps) {
  return (
    <button
      onClick={onClick}
      className={`relative rounded-xl border p-4 text-left transition-all ${
        active
          ? "border-[#007185] bg-[#E6F4F1] shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      {badge && (
        <span className="absolute right-3 top-3 rounded-full bg-[#CC0C39] px-2 py-0.5 text-[9px] font-black uppercase text-white shadow-sm">
          {badge}
        </span>
      )}

      <div
        className={`mb-3 inline-flex rounded-lg p-2 ${
          active ? "bg-white text-[#007185]" : "bg-[#F7F8F8] text-[#565959]"
        }`}
      >
        {icon}
      </div>

      <div className="space-y-1">
        <h3 className="text-[15px] font-bold text-[#0F1111]">{title}</h3>
        <p className="text-[12px] leading-snug text-[#565959]">{subtitle}</p>
      </div>
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
      className={`
        relative h-[160px] rounded-lg border bg-white p-4 shadow-sm transition-all
        flex flex-col items-center justify-between
        ${
          disabled
            ? "cursor-not-allowed border-gray-100 bg-gray-50 opacity-60"
            : "cursor-pointer border-gray-200 hover:shadow-md active:scale-[0.98] active:border-[#e47911]"
        }
      `}
    >
      <h2 className="mb-2 w-full text-center text-[14px] font-bold leading-tight text-[#0F1111]">
        {title}
      </h2>

      <div className="relative flex h-28 w-28 items-center justify-center">
        <Image
          src={imageSrc}
          alt={title}
          fill
          sizes="112px"
          className="object-contain p-1 drop-shadow-sm mix-blend-multiply"
          unoptimized
        />
      </div>

      {disabled && (
        <span className="absolute bottom-2 right-2 rounded border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-400">
          em breve
        </span>
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChartNoAxesCombined,
  Heart,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Wallet,
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

const heroMessages = [
  "Preço por dose, unidade ou rendimento",
  "Histórico de até 1 ano para comparar direito",
  "Alertas e listas para decidir com confiança",
];

const featureItems = [
  "Favoritos",
  "Alertas de preço",
  "Histórico automático",
  "Listas públicas",
  "Comentários",
];

function HomeViewTrack() {
  useEffect(() => {
    const win = window as typeof window & { dataLayer?: object[] };
    win.dataLayer = win.dataLayer || [];
    win.dataLayer.push({
      event: "view_home_v2",
      page_path: "/home-v2",
    });
  }, []);

  return null;
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
      className={`cursor-pointer rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.05] hover:shadow-lg ${accentStyles}`}
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 shadow-sm">
          {icon}
        </span>
        <div>
          <p className="text-[13px] font-black uppercase tracking-widest">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-black uppercase tracking-[0.32em] text-sky-600">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 text-sm leading-7 text-slate-600 md:text-base">{description}</p>
      ) : null}
    </div>
  );
}

function FeatureBullet({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
      <span className="text-sm font-semibold text-slate-700">{text}</span>
    </div>
  );
}

function HubCard({
  title,
  subtitle,
  icon,
  active,
  onClick,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-2xl border px-4 py-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-md ${
        active
          ? "border-sky-200 bg-sky-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
          {icon}
        </span>
        <div>
          <p className="text-[15px] font-black text-slate-900">{title}</p>
          <p className="mt-1 text-[12px] text-slate-500">{subtitle}</p>
        </div>
      </div>
    </button>
  );
}

function CategoryCard({
  title,
  imageSrc,
  onClick,
}: {
  title: string;
  imageSrc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg"
    >
      <div className="relative h-36 bg-slate-50">
        <Image src={imageSrc} alt={title} fill className="object-contain p-3" unoptimized />
      </div>
      <div className="p-4">
        <p className="text-[15px] font-bold text-slate-900">{title}</p>
        <p className="mt-2 text-[12px] text-slate-500">Ver comparação inteligente</p>
      </div>
    </button>
  );
}

function ProofCard() {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-950 text-white shadow-xl">
      <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="p-6 md:p-8">
          <p className="text-[11px] font-black uppercase tracking-[0.35em] text-sky-300">
            Prova prática
          </p>
          <h3 className="mt-3 text-2xl font-black tracking-tight md:text-3xl">
            Vale a pena comprar ou não?
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
            O preço sozinho não diz tudo.
          </p>

          <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/5 p-4 shadow-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">
              Leitura da compra
            </p>
            <p className="mt-3 text-3xl font-black tracking-tight text-white md:text-4xl">
              Não vale a pena agora
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              O histórico mostra que esse produto já esteve mais barato e o custo por dose ainda
              está alto.
            </p>
          </div>

          <p className="mt-4 text-xs leading-6 text-slate-400">
            Produto B custa menos por dose e rende mais.
          </p>
        </div>

        <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-black p-4 md:p-6">
          <div className="rounded-[1.75rem] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-sm md:p-5">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.3em] text-rose-300">
              <Sparkles className="h-4 w-4" />
              Comparação visual
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              A mesma leitura de custo real que o usuário precisa enxergar rápido.
            </p>
            <div className="mt-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[1.5rem] bg-white p-3 text-slate-950 shadow-xl">
                  <div className="relative rounded-[1.25rem] bg-gradient-to-b from-slate-50 to-slate-100 p-4">
                    <div className="mx-auto flex h-44 w-full max-w-[240px] items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                      <div className="relative h-36 w-28 rounded-[1.5rem] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 shadow-lg">
                        <div className="absolute inset-x-0 top-6 h-4 bg-gradient-to-r from-slate-600 via-slate-100 to-slate-600" />
                        <div className="absolute left-2 top-12 right-2 rounded-[1rem] border border-white/10 bg-white/5 px-2 py-3 text-center">
                          <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-300">
                            DUX
                          </p>
                          <p className="mt-2 text-[14px] font-black uppercase leading-4 text-white">
                            Whey Protein
                            <br />
                            Concentrado
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-center text-2xl font-black tracking-tight">WHEY 900g</p>
                    <p className="mt-2 text-center text-4xl font-black tracking-tight text-slate-950">
                      R$159,90
                    </p>
                    <p className="mt-3 text-center text-xl font-black text-slate-950">30 doses</p>
                    <p className="mt-1 text-center text-xl font-black text-rose-600">R$5,33 / dose</p>
                  </div>
                </div>

                <div className="rounded-[1.5rem] bg-white p-3 text-slate-950 shadow-xl">
                  <div className="relative rounded-[1.25rem] bg-gradient-to-b from-slate-50 to-slate-100 p-4">
                    <div className="mx-auto flex h-44 w-full max-w-[240px] items-center justify-center rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
                      <div className="relative h-40 w-32 rounded-[1.35rem] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800 shadow-lg">
                        <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-emerald-500" />
                        <div className="absolute inset-x-3 top-14 rounded-[0.9rem] border border-white/10 bg-white/5 px-2 py-3 text-center">
                          <p className="text-[9px] font-black uppercase tracking-[0.35em] text-slate-300">
                            DUX
                          </p>
                          <p className="mt-2 text-[14px] font-black uppercase leading-4 text-white">
                            Whey Protein
                            <br />
                            Concentrado
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-center text-2xl font-black tracking-tight">WHEY 1800g</p>
                    <p className="mt-2 text-center text-4xl font-black tracking-tight text-slate-950">
                      R$279,90
                    </p>
                    <p className="mt-3 text-center text-xl font-black text-slate-950">60 doses</p>
                    <p className="mt-1 text-center text-xl font-black text-emerald-600">R$4,66 / dose</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-4 text-center">
                <p className="text-sm font-bold text-emerald-50">
                  Mesmo com preço total menor, o Produto B custa menos por dose e rende mais.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DecisionSignalCard({
  badge,
  title,
  insight,
  item,
}: {
  badge: string;
  title: string;
  insight: string;
  item: BestDeal;
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-sky-700">
        {badge}
      </div>
      <p className="mt-3 text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">{insight}</p>
      <div className="mt-4">
        <BestDealProductCard item={item} category="home_v2" compact showActions={false} />
      </div>
    </div>
  );
}

export default function HomeV2Client({
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
  const [messageIndex, setMessageIndex] = useState(0);

  const categoryGroups = useMemo<Record<HubKey, CategoryItem[]>>(
    () => ({
      suplementos: supplementCategories,
      casa: houseCategories,
      pets: petCategories,
    }),
    [supplementCategories, houseCategories, petCategories]
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % heroMessages.length);
    }, 3800);

    return () => window.clearInterval(timer);
  }, []);

  const visibleCategories = categoryGroups[selectedHub];
  const decisionLabels = [
    {
      badge: "Bom custo por dose",
      title: "Bom custo por dose",
      insight: "Menor preço dos últimos 3 meses.",
    },
    {
      badge: "Menor preço recente",
      title: "Menor preço recente",
      insight: "Preço abaixo da média recente.",
    },
    {
      badge: "Preço acima do histórico",
      title: "Preço acima do histórico",
      insight: "Preço acima da média recente.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#F5F7FA] text-slate-900">
      <HomeViewTrack />

      <section className="mx-auto max-w-[1560px] px-4 pb-14 pt-4 md:px-6 md:pb-16 md:pt-6">
        <div className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-[#0B1323] via-[#10233F] to-[#1A3A5B] p-5 text-white shadow-2xl md:p-10">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.3em]">
                AmazonPicks v2
              </span>
                <span className="rounded-full border border-white/15 bg-emerald-400/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.3em] text-emerald-200">
                  Conversão
                </span>
            </div>

            <h1 className="mt-4 max-w-[12ch] text-[2.25rem] font-black leading-[1.02] tracking-tight sm:max-w-none sm:text-5xl md:mt-5 md:max-w-3xl md:text-6xl">
              Você pode estar pagando mais caro sem perceber
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200 md:mt-4 md:text-lg md:leading-8">
              Compare pelo custo real, veja o histórico e saiba quando vale a pena comprar.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3 md:mt-6">
              <DecisionBadge
                icon={<Wallet className="h-4 w-4" />}
                title="Veja o preço por dose"
                description="Compare custo por dose, unidade ou rendimento."
              />
              <DecisionBadge
                icon={<TrendingUp className="h-4 w-4" />}
                title="Descubra se está realmente barato"
                description="Veja o histórico e o momento certo da compra."
                accent="amber"
              />
              <DecisionBadge
                icon={<Bell className="h-4 w-4" />}
                title="Receba alerta quando cair"
                description="Monitore automaticamente e não perca a queda."
                accent="emerald"
              />
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.35em] text-sky-600">
                <ChartNoAxesCombined className="h-4 w-4" />
                Sinal diário
              </div>
              <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                Melhores decisões do dia
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Não mostramos só desconto. Aqui o foco é custo por dose e histórico útil.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {heroMessages.map((item, index) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setMessageIndex(index)}
                    className={`rounded-full px-3 py-2 text-[11px] font-bold transition ${
                      messageIndex === index
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">
                  Mensagem atual
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">{heroMessages[messageIndex]}</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-slate-400">
                Recursos
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {featureItems.map((item) => (
                  <FeatureBullet key={item} text={item} />
                ))}
              </div>

              <button
                type="button"
                onClick={() => router.push("/cadastro")}
                className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition-all duration-300 hover:scale-[1.03] hover:bg-slate-800 hover:shadow-lg"
              >
                Receber alerta quando o preço cair
                <ArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Monitore automaticamente e seja avisado no momento certo.
              </p>
            </div>
          </div>
        </div>

        <section className="mt-12">
          <SectionTitle
            eyebrow="Prova"
            title="Vale a pena comprar ou não?"
            description="O preço sozinho não diz tudo."
          />
          <div className="mt-5">
            <ProofCard />
          </div>
        </section>

        <section className="mt-12">
          <SectionTitle
            eyebrow="Categorias"
            title="Escolha o caminho certo para comparar"
            description="Comece pela categoria certa e compare por uma régua que faz sentido para a compra."
          />

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <HubCard
              title="Suplementos"
              subtitle="Creatina, whey, barras e mais"
              icon={<Sparkles className="h-5 w-5 text-sky-600" />}
              active={selectedHub === "suplementos"}
              onClick={() => setSelectedHub("suplementos")}
            />
            <HubCard
              title="Casa & Bem-estar"
              subtitle="Higiene, limpeza e cuidados"
              icon={<Wallet className="h-5 w-5 text-sky-600" />}
              active={selectedHub === "casa"}
              onClick={() => setSelectedHub("casa")}
            />
            {petCategories.length > 0 ? (
              <HubCard
                title="Pets"
                subtitle="Antipulgas, higiene e mais"
                icon={<Heart className="h-5 w-5 text-sky-600" />}
                active={selectedHub === "pets"}
                onClick={() => setSelectedHub("pets")}
              />
            ) : null}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {visibleCategories.map((category) => (
              <CategoryCard
                key={category.title}
                title={category.title}
                imageSrc={category.imageSrc}
                onClick={() => router.push(category.path)}
              />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <SectionTitle
              eyebrow="Ofertas"
              title="Melhores ofertas do dia"
              description="Seleção rápida para quem quer comparar sem perder tempo."
            />

            <button
              type="button"
              onClick={() => router.push("/ofertas")}
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
            >
              Ver página inteira
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3 md:gap-6">
            {bestDeals.slice(0, 3).map((item) => (
              <BestDealProductCard key={item.id} item={item} category="home_v2" compact showActions={false} />
            ))}
          </div>
        </section>

        <section className="mt-12">
          <SectionTitle
            eyebrow="Melhores decisões do dia"
            title="Não é só desconto — é o preço certo para comprar"
            description="Selecionamos produtos com bom custo por dose e histórico favorável."
          />

          <div className="mt-5 grid gap-4 md:grid-cols-3 md:gap-6">
            {bestDeals.slice(0, 3).map((item, index) => {
              const config = decisionLabels[index] ?? decisionLabels[0];
              return (
                <DecisionSignalCard
                  key={item.id}
                  badge={config.badge}
                  title={config.title}
                  insight={config.insight}
                  item={item}
                />
              );
            })}
          </div>
        </section>

        <section className="mt-12 overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-sky-600">
                Login / Features
              </p>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                Crie sua conta e acompanhe o que realmente importa
              </h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                Favoritos, alertas de preço, histórico automático, listas públicas e comentários
                em um único lugar.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push("/cadastro")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-black text-white transition-all duration-300 hover:scale-[1.03] hover:bg-slate-800 hover:shadow-lg"
            >
              Receber alerta quando o preço cair
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">
            Monitore automaticamente e seja avisado no momento certo.
          </p>
        </section>

        <section className="mt-12">
          <SectionTitle
            eyebrow="Listas públicas"
            title="Veja listas criadas por usuários que já pensam no custo real"
            description="Uma vitrine de recomendações reais para economizar tempo e tomar decisões mais inteligentes."
          />

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {publicLists.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center text-sm text-slate-500 md:col-span-3">
                Ainda não existem listas públicas.
              </div>
            ) : (
              publicLists.map((list) => (
                <button
                  key={list.slug}
                  type="button"
                  onClick={() =>
                    router.push(
                      list.ownerUsername
                        ? buildPublicListPath(list.ownerUsername, list.slug)
                        : `/listas/${list.slug}`
                    )
                  }
                  className="cursor-pointer rounded-[1.75rem] border border-slate-200 bg-white p-4 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[17px] font-black text-slate-950">{list.title}</p>
                      <p className="mt-1 text-sm text-slate-500">
                        por {list.ownerDisplayName}
                        {list.ownerUsername ? (
                          <>
                            {" "}
                            <span className="text-[#2162A1] transition hover:text-[#174e87]">
                              @{list.ownerUsername}
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                      {list.itemsCount} itens
                    </span>
                  </div>

                  <div className="mt-4 flex h-20 items-center justify-center gap-2 overflow-hidden rounded-2xl bg-slate-50 px-3">
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
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <MessageCircle className="h-4 w-4" />
                        Prévia dos produtos
                      </div>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}







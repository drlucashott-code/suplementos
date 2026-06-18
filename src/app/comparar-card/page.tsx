import {
  AlertTriangle,
  ExternalLink,
  Heart,
  MessageCircle,
  TrendingUp,
} from "lucide-react";

import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Comparação de card (mobile)",
  robots: { index: false, follow: false },
};

type Sample = {
  name: string;
  image: string;
  rating: number;
  reviews: number;
  sabor: string;
  unidades: number;
  peso: number;
  proteina: string;
  precoUnidade: string;
  price: [string, string]; // [inteiro, centavos]
  programe: [string, string];
  discountPercent?: number;
  refPrice?: string;
};

const SAMPLES: Sample[] = [
  {
    name: "Power Protein Bar Caixa com 8 Unidades (720g), Frutas Vermelhas",
    image: "https://m.media-amazon.com/images/I/51HrcWZ4mmL._SL500_.jpg",
    rating: 4.6,
    reviews: 9,
    sabor: "Frutas vermelhas",
    unidades: 8,
    peso: 720,
    proteina: "29g",
    precoUnidade: "R$ 11,50",
    price: ["92", "00"],
    programe: ["87", "40"],
  },
  {
    name: "Power Protein Bar (8 unid - 90g) - Sabor Milk Caramel, Max Titanium",
    image: "https://m.media-amazon.com/images/I/41AaWKGZqQL._SL500_.jpg",
    rating: 4.2,
    reviews: 14,
    sabor: "Milk caramel",
    unidades: 8,
    peso: 720,
    proteina: "29g",
    precoUnidade: "R$ 11,53",
    price: ["78", "99"],
    programe: ["74", "84"],
    discountPercent: 18,
    refPrice: "90,63",
  },
];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-[#DE7921]" aria-hidden>
      {"★★★★★".split("").map((s, i) => (
        <span key={i} className={i < Math.round(rating) ? "" : "text-[#E3E6E6]"}>
          ★
        </span>
      ))}
    </span>
  );
}

function CircleBtn({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#d9dee3] bg-white text-gray-600 ${className}`}
    >
      {children}
    </span>
  );
}

function MockCard({ v, p }: { v: "atual" | "proposto"; p: Sample }) {
  const proposto = v === "proposto";
  const priceColor = p.discountPercent ? "text-[#CC0C39]" : "text-[#0F1111]";

  return (
    <div className="relative flex min-h-[230px] items-stretch gap-3 rounded-xl border border-[#D5D9D9] bg-white font-sans shadow-[0_1px_3px_rgba(15,17,17,0.06)]">
      {p.discountPercent ? (
        <div className="absolute left-0 top-0 z-10 rounded-br-md rounded-tl-xl bg-[#CC0C39] px-2 py-0.5 text-[11px] font-bold text-white">
          {p.discountPercent}% OFF
        </div>
      ) : null}

      {/* Coluna da imagem */}
      <div className="relative flex w-[160px] flex-shrink-0 items-center justify-center rounded-l-xl bg-[#f3f3f3] p-2">
        {proposto ? (
          // PROPOSTO: só o coração sobre a foto
          <div className="absolute left-1.5 top-2 z-20">
            <CircleBtn className="h-9 w-9">
              <Heart className="h-4 w-4" />
            </CircleBtn>
          </div>
        ) : (
          <>
            {/* ATUAL: 4 ícones flanqueando a foto */}
            <div className="absolute bottom-3 left-0.5 top-7 z-20 flex flex-col items-center justify-between">
              <CircleBtn>
                <Heart className="h-3.5 w-3.5" />
              </CircleBtn>
              <CircleBtn>
                <span className="relative">
                  <MessageCircle className="h-3.5 w-3.5" />
                  <span className="absolute -right-1.5 -top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-[#CC0C39] text-[7px] font-bold text-white">
                    0
                  </span>
                </span>
              </CircleBtn>
            </div>
            <div className="absolute bottom-3 right-0.5 top-7 z-20 flex flex-col items-center justify-between">
              <CircleBtn>
                <ExternalLink className="h-3.5 w-3.5" />
              </CircleBtn>
              <CircleBtn>
                <AlertTriangle className="h-3.5 w-3.5" />
              </CircleBtn>
            </div>
          </>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.image}
          alt={p.name}
          className="h-auto max-h-[190px] w-auto max-w-[130px] object-contain mix-blend-multiply"
        />
      </div>

      {/* Coluna de infos */}
      <div className="flex min-w-0 flex-1 flex-col py-3 pr-2">
        <h2 className="mb-1 line-clamp-3 text-[14px] font-normal leading-tight text-[#0F1111]">
          {p.name}
        </h2>

        <div className="mb-2 flex items-center gap-1 text-[12px]">
          <span className="text-[#0F1111]">{p.rating.toFixed(1)}</span>
          <Stars rating={p.rating} />
          <span className="text-[#007185]">({p.reviews})</span>
        </div>

        <div className="mb-2 flex flex-wrap items-center gap-x-1 text-[11px] text-zinc-500">
          <span>• Sabor: <b className="font-medium text-zinc-700">{p.sabor}</b></span>
          <span>• Unidades: <b className="font-medium text-zinc-700">{p.unidades}</b></span>
          <span>• Peso (g): <b className="font-medium text-zinc-700">{p.peso}</b></span>
        </div>

        {/* Tabela de análise por unidade */}
        {proposto ? (
          <div className="mb-2 rounded-md bg-[#F4F6F8] px-2 py-1.5">
            <div className="mb-1 text-center text-[10px] font-semibold text-zinc-500">
              Análise por unidade (90g)
            </div>
            <div className="grid grid-cols-2 divide-x divide-[#E3E6E6]">
              <div className="flex flex-col items-center">
                <span className="text-[13px] font-semibold text-[#0F1111]">{p.proteina}</span>
                <span className="text-[10px] text-zinc-500">proteína</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[13px] font-semibold text-green-700">{p.precoUnidade}</span>
                <span className="text-[10px] text-zinc-500">preço</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-3 grid gap-2 divide-x divide-zinc-200 rounded border border-zinc-200 bg-white p-2">
            <div className="border-b border-zinc-200 pb-2 text-center text-[11px] font-bold uppercase tracking-wide text-zinc-500">
              ANÁLISE POR UNIDADE (90G)
            </div>
            <div className="grid grid-cols-2 divide-x divide-zinc-200">
              <div className="flex flex-col items-center px-1">
                <span className="text-[12px] font-semibold text-[#0F1111]">{p.proteina}</span>
                <span className="text-[9px] font-bold uppercase tracking-wide text-zinc-400">PROTEÍNA</span>
              </div>
              <div className="flex flex-col items-center px-1">
                <span className="text-[12px] font-semibold text-green-700">{p.precoUnidade}</span>
                <span className="text-[9px] font-bold uppercase tracking-wide text-green-600">PREÇO</span>
              </div>
            </div>
          </div>
        )}

        {/* Preço + programe e poupe */}
        <div className="mt-auto flex flex-col">
          <div className="flex items-end justify-between gap-2">
            <div className="flex items-start">
              <div className="flex items-start">
                <span className={`mt-1 text-[13px] font-medium ${priceColor}`}>R$</span>
                <span className={`text-3xl font-medium leading-none tracking-tight ${priceColor}`}>
                  {p.price[0]}
                </span>
                <span className={`mt-[3px] text-[14px] font-medium leading-none ${priceColor}`}>
                  {p.price[1]}
                </span>
              </div>
              {!p.refPrice ? (
                <span className="ml-2 mt-1">
                  <CircleBtn className="h-7 w-7 border-[#E5E7EB] text-[#6B7280]">
                    <TrendingUp className="h-3 w-3" />
                  </CircleBtn>
                </span>
              ) : null}
            </div>

            {proposto ? (
              // PROPOSTO: programe e poupe sem borda, rótulo curto
              <div className="flex flex-col items-end leading-none text-[#0F1111]">
                <span className="text-[9px] font-semibold text-zinc-500">Assinando</span>
                <div className="flex items-start leading-none">
                  <span className="mt-0.5 text-[8px] font-medium">R$</span>
                  <span className="text-[16px] font-medium leading-none tracking-tight">{p.programe[0]}</span>
                  <span className="mt-[1px] text-[8px] font-medium">{p.programe[1]}</span>
                </div>
              </div>
            ) : (
              // ATUAL: caixa com borda
              <div className="inline-flex w-fit shrink-0 flex-col rounded-md border border-[#d5d9d9] bg-[#f3f4f6] px-1.5 py-0.5">
                <span className="text-[9px] font-bold leading-none text-[#0F1111]">Programe e Poupe</span>
                <div className="mt-0.5 flex items-start leading-none">
                  <span className="mt-0.5 text-[8px] font-medium">R$</span>
                  <span className="text-[16px] font-medium leading-none tracking-tight">{p.programe[0]}</span>
                  <span className="mt-[1px] text-[8px] font-medium">{p.programe[1]}</span>
                </div>
              </div>
            )}
          </div>

          {p.refPrice ? (
            <div className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
              <span className="font-medium">De:</span>
              <span className="line-through">R$ {p.refPrice}</span>
            </div>
          ) : null}

          <div className="mt-1 flex items-center">
            <span className="flex items-center text-[12px] font-black italic leading-none">
              <span className="mr-0.5 text-[13px] not-italic text-[#FEBD69]">✓</span>
              <span className="text-[#00A8E1]">prime</span>
            </span>
          </div>

          {/* PROPOSTO: ações secundárias agrupadas numa linha discreta */}
          {proposto ? (
            <div className="mt-2 flex items-center gap-4 text-zinc-400">
              <ExternalLink className="h-4 w-4" />
              <MessageCircle className="h-4 w-4" />
              <AlertTriangle className="h-4 w-4" />
            </div>
          ) : null}

          <div className="mt-2">
            <span className="block w-full rounded-full border border-[#FCD200] bg-[#FFD814] py-2.5 text-center text-[13px] font-medium text-[#0F1111] shadow-sm">
              Ver na Amazon
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompararCardPage() {
  return (
    <div className="min-h-screen bg-[#EAEDED] pb-16">
      <div className="sticky top-0 z-30 bg-[#131921] px-4 py-3 text-white">
        <p className="text-[15px] font-bold">Comparação — card do catálogo (mobile)</p>
        <p className="text-[12px] text-white/70">
          Abra no celular. Para cada produto: <b>ATUAL</b> em cima, <b>PROPOSTO</b> embaixo.
        </p>
      </div>

      <div className="mx-auto max-w-[430px] space-y-8 px-3 pt-4">
        {SAMPLES.map((p, i) => (
          <div key={i} className="space-y-2">
            <div className="inline-flex rounded bg-[#2162A1] px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-white">
              Atual
            </div>
            <MockCard v="atual" p={p} />

            <div className="mt-3 inline-flex rounded bg-[#067D62] px-2.5 py-1 text-[12px] font-bold uppercase tracking-wide text-white">
              Proposto
            </div>
            <MockCard v="proposto" p={p} />

            <div className="!mt-6 border-b border-dashed border-[#C9D3DD]" />
          </div>
        ))}

        <div className="rounded-xl border border-[#D8DEE6] bg-white p-4 text-[13px] leading-6 text-[#475467]">
          <p className="mb-2 font-bold text-[#0F1111]">O que muda no proposto</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Foto limpa: só o coração; compartilhar/comentar/reportar viram uma linha discreta.</li>
            <li>Contagem de comentários some quando é zero.</li>
            <li>Tabela "análise por unidade" sem borda (fundo sutil) e menos maiúsculas.</li>
            <li>"Programe e Poupe" sem caixa, ao lado do preço, rótulo curto.</li>
            <li>Espaçamento mais enxuto → card mais baixo.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

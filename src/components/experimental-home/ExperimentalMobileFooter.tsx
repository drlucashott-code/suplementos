"use client";

import Link from "next/link";
import { ArrowUp, ListChecks, Scale, Tags, UserRound } from "lucide-react";

const footerLinks = [
  { label: "Ofertas", href: "/ofertas", icon: Tags },
  { label: "Comparar", href: "#categorias", icon: Scale },
  { label: "Listas", href: "/listas", icon: ListChecks },
  { label: "Minha conta", href: "/minha-conta", icon: UserRound },
];

export function ExperimentalMobileFooter() {
  return (
    <footer className="bg-[#131921] text-white lg:hidden">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="flex w-full items-center justify-center gap-2 bg-[#37475A] py-3.5 text-[12px] font-semibold text-white"
      >
        <ArrowUp className="h-3.5 w-3.5" />
        Voltar ao topo
      </button>

      <div className="px-4 pb-6 pt-7">
        <Link
          href="/experimental/home"
          className="mx-auto block w-fit text-[21px] font-bold tracking-[-0.03em]"
          aria-label="AmazonPicks — homepage experimental"
        >
          amazon<span className="text-[#FFD814]">picks</span>
        </Link>

        <nav aria-label="Atalhos do rodapé" className="mt-6 grid grid-cols-2 gap-2.5">
          {footerLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex min-h-11 items-center gap-2.5 rounded-lg border border-white/15 bg-white/[0.04] px-3 text-[13px] font-semibold text-[#F3F3F3] transition active:bg-white/10"
              >
                <Icon className="h-4 w-4 shrink-0 text-[#FFD814]" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-white/10 pt-5 text-center text-[11px] leading-4 text-[#B8C2CC]">
          <p>
            Como participante do Programa de Associados da Amazon, podemos receber comissões por compras qualificadas.
          </p>
          <p className="mt-2 text-[10px] text-[#8795A3]">© {new Date().getFullYear()} amazonpicks</p>
        </div>
      </div>
    </footer>
  );
}

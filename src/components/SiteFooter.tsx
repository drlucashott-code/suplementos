"use client";

import Link from "next/link";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Amazonpicks",
    links: [
      { label: "Início", href: "/" },
      { label: "Ofertas", href: "/ofertas" },
      { label: "Listas públicas", href: "/listas" },
    ],
  },
  {
    title: "Categorias",
    links: [
      { label: "Suplementos", href: "/suplementos" },
      { label: "Casa & bem-estar", href: "/casa" },
      { label: "Pets", href: "/pets" },
    ],
  },
  {
    title: "Sua conta",
    links: [
      { label: "Entrar", href: "/entrar" },
      { label: "Criar conta", href: "/cadastro" },
      { label: "Minha conta", href: "/minha-conta" },
      { label: "Produtos salvos", href: "/salvos" },
    ],
  },
  {
    title: "Ajuda",
    links: [
      { label: "Notificações", href: "/notificacoes" },
      { label: "Minhas listas", href: "/minha-conta/listas" },
      { label: "Configurações", href: "/minha-conta/configuracoes" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 bg-[#131921] text-white">
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="block w-full bg-[#232f3e] py-4 text-center text-[13px] font-medium text-white transition hover:bg-[#37475a]"
      >
        Voltar ao topo
      </button>

      <div className="mx-auto grid max-w-[1100px] gap-8 px-6 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <h3 className="mb-3 text-[15px] font-bold">{column.title}</h3>
            <ul className="space-y-2 text-[13px] text-[#DDD]">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-white hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1100px] items-center justify-center px-6 py-6">
          <span className="text-[18px] font-bold tracking-tight">
            amazon<span className="text-[#FFD814]">picks</span>
          </span>
        </div>
      </div>

      <div className="bg-[#0F1111] py-6 text-center text-[11px] leading-5 text-[#9aa0a6]">
        <p className="mx-auto max-w-[760px] px-4">
          Os preços e a disponibilidade são exibidos com base nas informações da Amazon e podem mudar
          a qualquer momento. Como participante do Programa de Associados da Amazon, podemos receber
          comissões por compras qualificadas feitas através dos nossos links.
        </p>
        <p className="mt-2">© {year} amazonpicks · Todos os direitos reservados</p>
      </div>
    </footer>
  );
}

export default SiteFooter;

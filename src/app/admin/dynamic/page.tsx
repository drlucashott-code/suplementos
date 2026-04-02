import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { revalidateDynamicCatalogCategoryRefs } from "@/lib/dynamicCatalogRevalidation";
import CacheResetButton, { type CacheResetState } from "@/components/admin/CacheResetButton";

type CardColor = "blue" | "emerald" | "purple" | "sky" | "orange" | "yellow" | "red" | "amber" | "gray";

const cardStyles: Record<
  CardColor,
  {
    iconBg: string;
    iconText: string;
    hoverBorder: string;
  }
> = {
  blue: {
    iconBg: "bg-blue-50",
    iconText: "text-blue-600",
    hoverBorder: "hover:border-blue-200",
  },
  emerald: {
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
    hoverBorder: "hover:border-emerald-200",
  },
  purple: {
    iconBg: "bg-purple-50",
    iconText: "text-purple-600",
    hoverBorder: "hover:border-purple-200",
  },
  sky: {
    iconBg: "bg-sky-50",
    iconText: "text-sky-600",
    hoverBorder: "hover:border-sky-200",
  },
  orange: {
    iconBg: "bg-orange-50",
    iconText: "text-orange-600",
    hoverBorder: "hover:border-orange-200",
  },
  yellow: {
    iconBg: "bg-yellow-50",
    iconText: "text-yellow-600",
    hoverBorder: "hover:border-yellow-200",
  },
  red: {
    iconBg: "bg-red-50",
    iconText: "text-red-600",
    hoverBorder: "hover:border-red-200",
  },
  amber: {
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    hoverBorder: "hover:border-amber-200",
  },
  gray: {
    iconBg: "bg-gray-50",
    iconText: "text-gray-700",
    hoverBorder: "hover:border-gray-300",
  },
};

function AdminCard({
  title,
  description,
  href,
  icon,
  color,
}: {
  title: string;
  description: string;
  href: string;
  icon: string;
  color: CardColor;
}) {
  const style = cardStyles[color];

  return (
    <Link href={href} className="group">
      <div
        className={`h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${style.hoverBorder}`}
      >
        <div
          className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-transform group-hover:scale-110 ${style.iconBg} ${style.iconText}`}
        >
          {icon}
        </div>
        <h2 className="mb-1 text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-sm leading-relaxed text-gray-500">{description}</p>
      </div>
    </Link>
  );
}

async function revalidateAllDynamicCatalog(
  _prevState: CacheResetState,
  _formData: FormData
): Promise<CacheResetState> {
  "use server";

  const categories = await prisma.dynamicCategory.findMany({
    select: { group: true, slug: true },
  });

  const refs = categories
    .map((category) => ({
      group: category.group || "",
      slug: category.slug,
    }))
    .filter((category) => category.group && category.slug);

  if (refs.length > 0) {
    revalidateDynamicCatalogCategoryRefs(refs);
  }

  return {
    ok: true,
    count: refs.length,
    message:
      refs.length > 0
        ? `Cache limpo (${refs.length} categorias)`
        : "Nenhuma categoria para revalidar",
  };
}

export default async function AdminDynamicDashboard() {
  const [totalProducts, totalCategories] = await Promise.all([
    prisma.dynamicProduct.count(),
    prisma.dynamicCategory.count(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 p-8 text-black">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                Admin Panel
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Catalogo Dinamico
            </h1>
            <p className="font-medium text-gray-500">
              Gerenciamento central do amazonpicks.com.br
            </p>
          </div>

          <div className="flex gap-4">
            <div className="min-w-[120px] rounded-2xl border border-gray-200 bg-white px-6 py-3 text-center shadow-sm">
              <span className="mb-1 block text-[10px] font-black uppercase text-gray-400">
                Total de itens
              </span>
              <span className="text-2xl font-black text-blue-600">
                {totalProducts}
              </span>
            </div>
            <div className="min-w-[120px] rounded-2xl border border-gray-200 bg-white px-6 py-3 text-center shadow-sm">
              <span className="mb-1 block text-[10px] font-black uppercase text-gray-400">
                Categorias
              </span>
              <span className="text-2xl font-black text-purple-600">
                {totalCategories}
              </span>
            </div>
          </div>

          <CacheResetButton action={revalidateAllDynamicCatalog} />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AdminCard
            title="Importar via API"
            description="Processamento em lote pela Amazon. Nome, foto e preco direto da origem."
            href="/admin/dynamic/importar"
            icon="R"
            color="blue"
          />

          <AdminCard
            title="Gerenciar Produtos"
            description="Edicao de atributos, revisao de categorias e ajustes finos por item."
            href="/admin/dynamic/produtos"
            icon="P"
            color="emerald"
          />

          <AdminCard
            title="Categorias"
            description="Gerencie categorias dinamicas e suas regras de exibicao."
            href="/admin/dynamic/categorias"
            icon="C"
            color="purple"
          />

          <AdminCard
            title="Cliques"
            description="Veja os produtos mais clicados e a atividade recente."
            href="/admin/dynamic/cliques"
            icon="K"
            color="sky"
          />

          <AdminCard
            title="Pendencias"
            description="Mostra apenas lacunas de cadastro que dependem de correcao manual."
            href="/admin/dynamic/pendencias"
            icon="!"
            color="orange"
          />

          <AdminCard
            title="Criar Nova Categoria"
            description="Defina novos slugs e a configuracao de comparacao publica."
            href="/admin/dynamic/nova-categoria"
            icon="+"
            color="yellow"
          />

          <AdminCard
            title="Execucoes"
            description="Historico da rotina automatica de atualizacao de precos."
            href="/admin/dynamic/execucoes"
            icon="$"
            color="red"
          />

          <AdminCard
            title="Fallback"
            description="Controle o fallback global de precos do site dinamico."
            href="/admin/dynamic/fallback"
            icon="F"
            color="amber"
          />

          <AdminCard
            title="Reports"
            description="Problemas reportados pelos usuarios nos cards de oferta."
            href="/admin/dynamic/reports"
            icon="?"
            color="orange"
          />

          <AdminCard
            title="Ver no Site"
            description="Abra a versao publica para validar categorias, cards e ordenacoes."
            href="/"
            icon="S"
            color="gray"
          />
        </div>

        <div className="relative mt-12 overflow-hidden rounded-3xl bg-gray-900 p-8 text-white shadow-2xl">
          <div className="relative z-10">
            <h3 className="mb-2 text-xl font-bold">Arquitetura unificada</h3>
            <p className="max-w-xl text-sm leading-relaxed text-gray-400">
              O admin dinamico centraliza catalogo, cliques, pendencias, fallback e
              execucoes automatizadas na mesma interface.
            </p>
          </div>
          <div className="pointer-events-none absolute right-[-5%] top-[-20%] select-none text-[120px] font-black opacity-[0.03]">
            DYNAMIC
          </div>
        </div>
      </div>
    </div>
  );
}

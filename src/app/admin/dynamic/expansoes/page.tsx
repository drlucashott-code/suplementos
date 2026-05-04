import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { scanCategoryExpansionGaps } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ExpansoesPageProps = {
  searchParams: Promise<{
    category?: string;
    status?: string;
    notice?: string;
  }>;
};

type StatusFilter = "all" | "discovered" | "rejected_soft" | "rejected_hard" | "imported";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(value);
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function AdminDynamicExpansoesPage({
  searchParams,
}: ExpansoesPageProps) {
  const params = await searchParams;
  const selectedCategory = params.category?.trim() ?? "";
  const selectedStatus = (params.status?.trim() as StatusFilter) || "all";
  const notice = typeof params.notice === "string" ? safeDecode(params.notice) : "";

  const categories = await prisma.dynamicCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const decisions = await prisma.dynamicCategoryAsinDecision.findMany({
    where: {
      ...(selectedCategory ? { categoryId: selectedCategory } : {}),
      ...(selectedStatus !== "all" ? { status: selectedStatus } : {}),
    },
    include: {
      category: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ lastSeenAt: "desc" }],
    take: 2000,
  });

  const scopedAsins = Array.from(new Set(decisions.map((item) => item.asin)));

  const existingProducts = scopedAsins.length
    ? await prisma.dynamicProduct.findMany({
        where: {
          asin: { in: scopedAsins },
        },
        select: {
          asin: true,
          categoryId: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      })
    : [];

  const existingAnyByAsin = new Set(existingProducts.map((item) => item.asin));
  const existingCategoriesByAsin = existingProducts.reduce<Record<string, string[]>>(
    (acc, item) => {
      const current = acc[item.asin] ?? [];
      if (!current.includes(item.category.name)) {
        current.push(item.category.name);
      }
      acc[item.asin] = current;
      return acc;
    },
    {}
  );

  const missing = decisions.filter((item) => !existingAnyByAsin.has(item.asin));

  const statusCounts = decisions.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});

  const missingAsinsForImport = Array.from(new Set(missing.map((item) => item.asin)));

  const statusOptions: Array<{ value: StatusFilter; label: string }> = [
    { value: "all", label: "Todos" },
    { value: "discovered", label: "Somente descobertos" },
    { value: "rejected_soft", label: "Soft reject" },
    { value: "rejected_hard", label: "Hard reject" },
    { value: "imported", label: "Ja importados" },
  ];

  const buildHref = (nextCategory: string, nextStatus: StatusFilter) => {
    const query = new URLSearchParams();
    if (nextCategory) query.set("category", nextCategory);
    if (nextStatus !== "all") query.set("status", nextStatus);
    const suffix = query.toString();
    return `/admin/dynamic/expansoes${suffix ? `?${suffix}` : ""}`;
  };

  return (
    <div className="min-h-screen bg-gray-50/30 p-8 font-sans text-black">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">
                Auditoria de expansao
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              ASINs Descobertos x Catalogo
            </h1>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Mostra o que a expansao encontrou e ainda nao entrou no banco.
            </p>
          </div>

          <div className="flex gap-3">
            <form action={scanCategoryExpansionGaps}>
              <input type="hidden" name="categoryId" value={selectedCategory} />
              <input type="hidden" name="status" value={selectedStatus} />
              <button
                type="submit"
                disabled={!selectedCategory}
                className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-indigo-700 shadow-sm transition-all hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Vasculhar expansoes
              </button>
            </form>
            <Link
              href="/admin/dynamic/importar"
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-600 shadow-sm transition-all hover:text-black"
            >
              Ir para importador
            </Link>
            <Link
              href="/admin/dynamic/rejeitados"
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-600 shadow-sm transition-all hover:text-black"
            >
              Ir para rejeitados
            </Link>
          </div>
        </div>

        {notice ? (
          <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-sm font-semibold text-indigo-800">
            {notice}
          </div>
        ) : null}

        <div className="mb-6 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Decisoes no filtro
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">{decisions.length}</div>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-amber-500">
              Faltando no banco
            </div>
            <div className="mt-1 text-3xl font-black text-amber-700">{missing.length}</div>
          </div>
          <div className="rounded-2xl border border-blue-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-blue-500">
              Descobertos
            </div>
            <div className="mt-1 text-3xl font-black text-blue-700">
              {statusCounts.discovered ?? 0}
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
              Ja importados
            </div>
            <div className="mt-1 text-3xl font-black text-emerald-700">
              {statusCounts.imported ?? 0}
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href={buildHref("", selectedStatus)}
            className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
              !selectedCategory
                ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Todas as categorias
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={buildHref(category.id, selectedStatus)}
              className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                selectedCategory === category.id
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {category.name}
            </Link>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {statusOptions.map((option) => (
            <Link
              key={option.value}
              href={buildHref(selectedCategory, option.value)}
              className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                selectedStatus === option.value
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-[11px] font-black uppercase tracking-widest text-gray-500">
            ASINs prontos para importar ({missingAsinsForImport.length})
          </div>
          <textarea
            readOnly
            value={missingAsinsForImport.join(",")}
            className="h-24 w-full rounded-xl border border-gray-200 bg-gray-50 p-3 font-mono text-xs text-gray-700 outline-none"
          />
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="w-36 p-4 text-center text-black">Categoria</th>
                  <th className="w-36 p-4 text-center text-black">ASIN</th>
                  <th className="p-4 text-black">Titulo</th>
                  <th className="w-40 p-4 text-center text-black">Status decisao</th>
                  <th className="w-32 p-4 text-center text-black">No banco?</th>
                  <th className="w-52 p-4 text-black">Motivo</th>
                  <th className="w-40 p-4 text-center text-black">Ultimo evento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {decisions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-10 text-center text-sm font-semibold text-gray-400"
                    >
                      Nenhum registro encontrado para esse filtro.
                    </td>
                  </tr>
                ) : (
                  decisions.map((item) => {
                    const exists = existingAnyByAsin.has(item.asin);
                    const existingCategories = existingCategoriesByAsin[item.asin] ?? [];
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-gray-50/50">
                        <td className="p-4 text-center">
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-600">
                            {item.category.name}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <a
                            href={`https://www.amazon.com.br/dp/${item.asin}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block rounded bg-blue-50 px-2 py-1 font-mono text-[10px] font-black uppercase text-blue-700 transition hover:bg-blue-600 hover:text-white"
                          >
                            {item.asin}
                          </a>
                        </td>
                        <td className="p-4">
                          <div className="text-[13px] font-bold leading-tight text-gray-900">
                            {item.title || "Sem titulo"}
                          </div>
                          <div className="mt-1 text-[11px] font-semibold text-gray-500">
                            {item.brand || "Sem marca"}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                              item.status === "imported"
                                ? "bg-emerald-50 text-emerald-700"
                                : item.status === "discovered"
                                  ? "bg-blue-50 text-blue-700"
                                  : item.status === "rejected_hard"
                                    ? "bg-red-50 text-red-700"
                                    : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                              exists
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {exists ? "Sim" : "Nao"}
                          </span>
                        </td>
                        <td className="p-4 text-[12px] font-semibold text-gray-700">
                          {exists && existingCategories.length > 0
                            ? `Ja cadastrado em: ${existingCategories.join(", ")}`
                            : item.reasonText || item.reasonCode || "-"}
                        </td>
                        <td className="p-4 text-center text-[12px] font-semibold text-gray-500">
                          {formatDate(item.lastSeenAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

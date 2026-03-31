import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  releaseRejectedSoftDecision,
  releaseRejectedSoftDecisions,
} from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RejectedPageProps = {
  searchParams: Promise<{
    category?: string;
    status?: string;
  }>;
};

export default async function AdminDynamicRejectedPage({
  searchParams,
}: RejectedPageProps) {
  const params = await searchParams;

  const [categories, decisions] = await Promise.all([
    prisma.dynamicCategory.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.dynamicCategoryAsinDecision.findMany({
      where: {
        status:
          params.status === "hard"
            ? "rejected_hard"
            : params.status === "soft"
              ? "rejected_soft"
              : { in: ["rejected_soft", "rejected_hard"] },
        ...(params.category ? { categoryId: params.category } : {}),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ lastSeenAt: "desc" }],
    }),
  ]);

  const selectedCategory = params.category ?? "";
  const selectedStatus = params.status ?? "all";
  const redirectTo = `/admin/dynamic/rejeitados${
    selectedCategory || selectedStatus !== "all"
      ? `?${[
          selectedCategory ? `category=${selectedCategory}` : "",
          selectedStatus !== "all" ? `status=${selectedStatus}` : "",
        ]
          .filter(Boolean)
          .join("&")}`
      : ""
  }`;
  const softRejectCount = decisions.filter(
    (item) => item.status === "rejected_soft"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50/30 p-8 font-sans text-black">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                Memoria de descoberta
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              ASINs Rejeitados
            </h1>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Produtos barrados por categoria, separados dos itens ocultos da vitrine.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin/dynamic/produtos"
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm transition-all hover:text-black"
            >
              Ver produtos
            </Link>
            <Link
              href="/admin/dynamic/importar"
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm transition-all hover:text-black"
            >
              Importador
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Rejeitados listados
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">
              {decisions.length}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Soft reject
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">
              {decisions.filter((item) => item.status === "rejected_soft").length}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Hard reject
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">
              {decisions.filter((item) => item.status === "rejected_hard").length}
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <Link
            href="/admin/dynamic/rejeitados"
            className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
              !selectedCategory
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Todas as categorias
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/admin/dynamic/rejeitados?category=${category.id}${
                selectedStatus !== "all" ? `&status=${selectedStatus}` : ""
              }`}
              className={`rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all ${
                selectedCategory === category.id
                  ? "border-amber-200 bg-amber-50 text-amber-700"
                  : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {category.name}
            </Link>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          {[
            { value: "all", label: "Todos" },
            { value: "soft", label: "Soft reject" },
            { value: "hard", label: "Hard reject" },
          ].map((option) => (
            <Link
              key={option.value}
              href={`/admin/dynamic/rejeitados${
                selectedCategory ? `?category=${selectedCategory}${option.value !== "all" ? `&status=${option.value}` : ""}` : option.value !== "all" ? `?status=${option.value}` : ""
              }`}
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

        {softRejectCount > 0 ? (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div>
              <div className="text-sm font-black text-amber-900">
                Reavaliar soft rejects
              </div>
              <div className="mt-1 text-xs font-semibold text-amber-700">
                Libera os itens soft reject desta visao para aparecerem novamente em
                futuras importacoes.
              </div>
            </div>

            <form action={releaseRejectedSoftDecisions}>
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <input type="hidden" name="categoryId" value={selectedCategory} />
              <button
                type="submit"
                className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-[11px] font-black uppercase tracking-widest text-amber-800 transition-all hover:bg-amber-100"
              >
                Liberar {softRejectCount} soft reject{softRejectCount > 1 ? "s" : ""}
              </button>
            </form>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="w-24 p-4 text-center text-black">Foto</th>
                  <th className="p-4 text-black">Produto</th>
                  <th className="w-40 p-4 text-center text-black">Categoria</th>
                  <th className="w-36 p-4 text-center text-black">ASIN</th>
                  <th className="w-32 p-4 text-center text-black">Status</th>
                  <th className="w-56 p-4 text-black">Motivo</th>
                  <th className="w-40 p-4 text-center text-black">Ultima vez visto</th>
                  <th className="w-40 p-4 text-center text-black">Acao</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {decisions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="p-10 text-center text-sm font-semibold text-gray-400"
                    >
                      Nenhum ASIN rejeitado encontrado para esse filtro.
                    </td>
                  </tr>
                ) : (
                  decisions.map((decision) => (
                    <tr
                      key={decision.id}
                      className="transition-colors hover:bg-gray-50/50"
                    >
                      <td className="p-4 text-center">
                        <div className="relative mx-auto h-14 w-14 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                          {decision.imageUrl ? (
                            <Image
                              src={decision.imageUrl}
                              alt={decision.title || decision.asin}
                              fill
                              className="object-contain p-1"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] font-bold text-gray-300">
                              sem imagem
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="text-[13px] font-bold leading-tight text-gray-900">
                          {decision.title || "Sem titulo salvo"}
                        </div>
                        <div className="mt-1 text-[11px] font-semibold text-gray-500">
                          {decision.brand || "Sem marca"}
                          {typeof decision.observedPrice === "number"
                            ? ` | R$ ${decision.observedPrice.toFixed(2).replace(".", ",")}`
                            : ""}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-600">
                          {decision.category.name}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <a
                          href={`https://www.amazon.com.br/dp/${decision.asin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block rounded bg-blue-50 px-2 py-1 font-mono text-[10px] font-black uppercase text-blue-600 transition hover:bg-blue-600 hover:text-white"
                        >
                          {decision.asin}
                        </a>
                      </td>

                      <td className="p-4 text-center">
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                            decision.status === "rejected_hard"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {decision.status === "rejected_hard"
                            ? "Hard reject"
                            : "Soft reject"}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="text-[12px] font-semibold text-gray-700">
                          {decision.reasonText || decision.reasonCode || "-"}
                        </div>
                        {decision.reasonCode ? (
                          <div className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                            {decision.reasonCode}
                          </div>
                        ) : null}
                      </td>

                      <td className="p-4 text-center text-[12px] font-semibold text-gray-500">
                        {new Intl.DateTimeFormat("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(decision.lastSeenAt)}
                      </td>

                      <td className="p-4 text-center">
                        {decision.status === "rejected_soft" ? (
                          <form action={releaseRejectedSoftDecision}>
                            <input type="hidden" name="decisionId" value={decision.id} />
                            <input type="hidden" name="redirectTo" value={redirectTo} />
                            <button
                              type="submit"
                              className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-blue-700 transition-all hover:bg-blue-100"
                            >
                              Reavaliar
                            </button>
                          </form>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                            Bloqueio fixo
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

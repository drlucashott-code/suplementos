import Link from "next/link";
import { AdminProductTable } from "@/components/admin/AdminProductTable";
import { getAdminProductsPageData } from "./actions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type AdminProdutosPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brands?: string;
    visibility?: string;
    page?: string;
    sort?: string;
    dir?: string;
  }>;
};

export default async function AdminProdutosDynamic({
  searchParams,
}: AdminProdutosPageProps) {
  const params = await searchParams;

  const { products, categories } = await getAdminProductsPageData();

  return (
    <div className="min-h-screen bg-gray-50/30 p-8 font-sans text-black">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                Painel de Controle
              </span>
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tight text-gray-900">
              Catalogo Dinamico
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Gerencie{" "}
              <span className="font-bold text-black">{products.length}</span>{" "}
              produtos em todos os nichos ativos.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin/dynamic/rejeitados"
              className="flex items-center rounded-2xl border border-gray-200 bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:text-black"
            >
              Rejeitados
            </Link>

            <Link
              href="/admin/dynamic/categorias"
              className="flex items-center rounded-2xl border border-gray-200 bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm transition-all hover:border-gray-300 hover:text-black"
            >
              Categorias
            </Link>

            <Link
              href="/admin/dynamic/importar"
              className="flex items-center gap-2 rounded-2xl border border-yellow-500/20 bg-yellow-400 px-6 py-3 text-[10px] font-black uppercase tracking-widest text-black shadow-md transition-all hover:bg-yellow-500 active:scale-95"
            >
              <span className="text-lg leading-none">+</span> Importar via ASIN
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
          <AdminProductTable
            initialProducts={products}
            categories={categories}
            initialState={{
              searchTerm: params.q ?? "",
              filterCategory: params.category ?? "",
              selectedBrands: (params.brands ?? "")
                .split(",")
                .map((brand) => brand.trim())
                .filter(Boolean),
              siteVisibilityFilter:
                params.visibility === "visible" ||
                params.visibility === "hidden" ||
                params.visibility === "pending" ||
                params.visibility === "internal"
                  ? params.visibility
                  : "all",
              currentPage: Math.max(1, Number(params.page ?? "1") || 1),
              sortConfig: params.sort
                ? {
                    key: params.sort,
                    direction: params.dir === "desc" ? "desc" : "asc",
                  }
                : { key: "name", direction: "asc" },
            }}
          />
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 transition-colors hover:text-black"
          >
            <span className="text-lg">&larr;</span> Voltar ao Dashboard
          </Link>

          <span className="text-[10px] font-bold uppercase tracking-tighter text-gray-300">
            Amazon Picks v3.0 - Dynamic System
          </span>
        </div>
      </div>
    </div>
  );
}

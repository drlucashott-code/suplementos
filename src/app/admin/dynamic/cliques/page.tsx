import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ClickedProductRow = {
  id: string;
  name: string;
  imageUrl: string | null;
  asin: string;
  clickCount: number;
  lastClickedAt: Date | null;
};

async function getClickedProducts(): Promise<ClickedProductRow[]> {
  const rows = await prisma.$queryRaw<ClickedProductRow[]>`
    SELECT
      p."id",
      p."name",
      p."imageUrl",
      p."asin",
      s."clickCount",
      s."lastClickedAt"
    FROM "DynamicProductClickStats" s
    INNER JOIN "DynamicProduct" p ON p."id" = s."productId"
    ORDER BY s."clickCount" DESC, s."lastClickedAt" DESC NULLS LAST
  `;

  return rows.map((row) => ({
    ...row,
    clickCount: Number(row.clickCount) || 0,
  }));
}

export default async function AdminDynamicClicksPage() {
  const clickedProducts = await getClickedProducts();

  const totalClicks = clickedProducts.reduce(
    (total, product) => total + product.clickCount,
    0
  );

  const lastClick = clickedProducts[0]?.lastClickedAt ?? null;

  return (
    <div className="min-h-screen bg-gray-50/30 p-8 font-sans text-black">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">
                Prioridade por clique
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              CLIQUES DE PRODUTOS
            </h1>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Veja quais produtos receberam mais interesse recente no site.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin/dynamic"
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm transition-all hover:text-black"
            >
              ← Painel dinâmico
            </Link>
            <Link
              href="/admin/dynamic/produtos"
              className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 shadow-sm transition-all hover:text-black"
            >
              Ver produtos
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Produtos clicados
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">
              {clickedProducts.length}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Cliques acumulados
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">
              {totalClicks}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Último clique
            </div>
            <div className="mt-2 text-sm font-black text-gray-900">
              {lastClick ? new Date(lastClick).toLocaleString("pt-BR") : "Sem cliques"}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="w-24 p-4 text-center text-black">Foto</th>
                  <th className="p-4 text-black">Produto</th>
                  <th className="w-40 p-4 text-center text-black">ASIN</th>
                  <th className="w-32 p-4 text-center text-black">Cliques</th>
                  <th className="w-48 p-4 text-center text-black">Último clique</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {clickedProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-10 text-center text-sm font-semibold text-gray-400"
                    >
                      Nenhum clique registrado ainda.
                    </td>
                  </tr>
                ) : (
                  clickedProducts.map((product) => (
                    <tr key={product.id} className="transition-colors hover:bg-gray-50/50">
                      <td className="p-4 text-center">
                        <div className="relative mx-auto h-14 w-14 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                          {product.imageUrl ? (
                            <Image
                              src={product.imageUrl}
                              alt={product.name}
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
                          {product.name}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <a
                          href={`https://www.amazon.com.br/dp/${product.asin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block rounded bg-blue-50 px-2 py-1 font-mono text-[10px] font-black uppercase text-blue-600 transition hover:bg-blue-600 hover:text-white"
                        >
                          {product.asin} ↗
                        </a>
                      </td>

                      <td className="p-4 text-center text-xl font-black text-gray-900">
                        {product.clickCount}
                      </td>

                      <td className="p-4 text-center text-[12px] font-bold text-gray-500">
                        {product.lastClickedAt
                          ? new Date(product.lastClickedAt).toLocaleString("pt-BR")
                          : "Nunca"}
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

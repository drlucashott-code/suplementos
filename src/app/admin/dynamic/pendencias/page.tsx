import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PendingProduct = {
  id: string;
  name: string;
  asin: string;
  imageUrl: string | null;
  totalPrice: number;
  categoryName: string;
  categorySlug: string;
  issues: string[];
};

type RawProduct = {
  id: string;
  name: string;
  asin: string;
  imageUrl: string | null;
  totalPrice: number;
  attributes: Record<string, string | number | boolean | null | undefined>;
  category: {
    name: string;
    slug: string;
  };
};

function getNumber(
  attributes: Record<string, string | number | boolean | null | undefined>,
  key: string
) {
  const value = Number(attributes[key]);
  return Number.isNaN(value) ? 0 : value;
}

function getIssues(product: RawProduct) {
  const issues: string[] = [];
  const attrs = product.attributes || {};
  const seller = String(attrs.seller || "").trim();
  const migrationPendingReason = String(attrs.migrationPendingReason || "").trim();

  if (product.totalPrice <= 0) {
    issues.push("Sem preco");
  }

  if (!product.imageUrl) {
    issues.push("Sem imagem");
  }

  if (!seller) {
    issues.push("Sem seller");
  }

  if (migrationPendingReason) {
    issues.push(`Pendencia de migracao: ${migrationPendingReason}`);
  }

  switch (product.category.slug) {
    case "whey": {
      if (getNumber(attrs, "doseInGrams") <= 0) issues.push("Sem dose (g)");
      if (getNumber(attrs, "proteinPerDoseInGrams") <= 0) {
        issues.push("Sem proteina por dose");
      }
      if (getNumber(attrs, "totalProteinInGrams") <= 0) {
        issues.push("Sem proteina total");
      }
      break;
    }
    case "barra": {
      if (getNumber(attrs, "unitsPerBox") <= 0) issues.push("Sem unidades por caixa");
      if (getNumber(attrs, "proteinPerDoseInGrams") <= 0) {
        issues.push("Sem proteina por barra");
      }
      if (getNumber(attrs, "totalProteinInGrams") <= 0) {
        issues.push("Sem proteina total");
      }
      break;
    }
    case "bebidaproteica": {
      if (getNumber(attrs, "unitsPerPack") <= 0) issues.push("Sem unidades por pack");
      if (getNumber(attrs, "proteinPerUnitInGrams") <= 0) {
        issues.push("Sem proteina por unidade");
      }
      if (getNumber(attrs, "totalProteinInGrams") <= 0) {
        issues.push("Sem proteina total");
      }
      break;
    }
    case "cafe-funcional": {
      if (getNumber(attrs, "doseInGrams") <= 0) issues.push("Sem dose (g)");
      if (getNumber(attrs, "caffeinePerDoseInMg") <= 0) {
        issues.push("Sem cafeina por dose");
      }
      if (getNumber(attrs, "cafeinaTotalMg") <= 0) {
        issues.push("Sem cafeina total");
      }
      break;
    }
    case "creatina": {
      if (getNumber(attrs, "doseInGrams") <= 0) issues.push("Sem dose (g)");
      if (getNumber(attrs, "gramasCreatinaPuraNoPote") <= 0) {
        issues.push("Sem creatina pura no pote");
      }
      break;
    }
    case "pre-treino": {
      if (getNumber(attrs, "doseInGrams") <= 0) issues.push("Sem dose (g)");
      if (getNumber(attrs, "caffeinePerDoseInMg") <= 0) {
        issues.push("Sem cafeina por dose");
      }
      if (getNumber(attrs, "numberOfDoses") <= 0) {
        issues.push("Sem numero de doses");
      }
      break;
    }
    default:
      break;
  }

  return issues;
}

async function getPendingProducts(): Promise<PendingProduct[]> {
  const products = await prisma.dynamicProduct.findMany({
    include: {
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return products
    .map((product) => {
      const attrs =
        (product.attributes as Record<
          string,
          string | number | boolean | null | undefined
        >) || {};

      const issues = getIssues({
        id: product.id,
        name: product.name,
        asin: product.asin,
        imageUrl: product.imageUrl,
        totalPrice: product.totalPrice,
        attributes: attrs,
        category: {
          name: product.category.name,
          slug: product.category.slug,
        },
      });

      return {
        id: product.id,
        name: product.name,
        asin: product.asin,
        imageUrl: product.imageUrl,
        totalPrice: product.totalPrice,
        categoryName: product.category.name,
        categorySlug: product.category.slug,
        issues,
      };
    })
    .filter((product) => product.issues.length > 0)
    .sort((a, b) => b.issues.length - a.issues.length);
}

export default async function AdminDynamicPendingPage() {
  const pendingProducts = await getPendingProducts();

  const totalIssues = pendingProducts.reduce(
    (total, product) => total + product.issues.length,
    0
  );

  const productsWithoutPrice = pendingProducts.filter((product) =>
    product.issues.includes("Sem preco")
  ).length;

  const migrationPendencies = pendingProducts.filter((product) =>
    product.issues.some((issue) => issue.startsWith("Pendencia de migracao"))
  ).length;

  return (
    <div className="min-h-screen bg-gray-50/30 p-8 font-sans text-black">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                Qualidade de dados
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              FALHAS E PENDÊNCIAS
            </h1>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Produtos que precisam de revisão para manter comparações e
              atualizações confiáveis.
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
              Produtos com pendência
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">
              {pendingProducts.length}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Total de problemas
            </div>
            <div className="mt-1 text-3xl font-black text-gray-900">
              {totalIssues}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Sem preço / migração
            </div>
            <div className="mt-1 text-sm font-black text-gray-900">
              {productsWithoutPrice} sem preço • {migrationPendencies} migração
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
          <div className="overflow-x-auto">
            <table className="min-w-[1150px] w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <th className="w-24 p-4 text-center text-black">Foto</th>
                  <th className="p-4 text-black">Produto</th>
                  <th className="w-36 p-4 text-center text-black">Categoria</th>
                  <th className="w-36 p-4 text-center text-black">ASIN</th>
                  <th className="w-28 p-4 text-center text-black">Preço</th>
                  <th className="p-4 text-black">Pendências</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {pendingProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-10 text-center text-sm font-semibold text-gray-400"
                    >
                      Nenhuma pendência encontrada no momento.
                    </td>
                  </tr>
                ) : (
                  pendingProducts.map((product) => (
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
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-600">
                          {product.categoryName}
                        </span>
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

                      <td className="p-4 text-center text-[12px] font-black text-gray-700">
                        {product.totalPrice > 0
                          ? `R$ ${product.totalPrice.toFixed(2).replace(".", ",")}`
                          : "—"}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {product.issues.map((issue) => (
                            <span
                              key={issue}
                              className="rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-600"
                            >
                              {issue}
                            </span>
                          ))}
                        </div>
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

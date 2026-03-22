import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { DynamicProduct } from "@prisma/client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ category: string }>;
}

type CategoryWithVisibleProducts = {
  id: string;
  name: string;
  slug: string;
  products: DynamicProduct[];
  _count: {
    products: number;
  };
};

export default async function CategoryGroupPage({ params }: PageProps) {
  const { category: categoryParam } = await params;

  const categories = await (
    prisma.dynamicCategory as unknown as {
      findMany: (args: Record<string, unknown>) => Promise<CategoryWithVisibleProducts[]>;
    }
  ).findMany({
    where: {
      group: categoryParam.toLowerCase(),
    },
    include: {
      _count: {
        select: {
          products: {
            where: {
              isVisibleOnSite: true,
            },
          },
        },
      },
      products: {
        where: {
          isVisibleOnSite: true,
        },
        take: 4,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  if (!categories || categories.length === 0) return notFound();

  return (
    <main className="min-h-screen bg-[#EAEDED] p-4 md:p-8">
      <div className="mx-auto max-w-6xl font-sans">
        <div className="mb-6">
          <p className="mb-1 text-xs font-bold uppercase tracking-widest text-gray-500">
            Nicho selecionado
          </p>
          <h1 className="text-3xl font-black capitalize tracking-tight text-gray-900">
            {categoryParam.replace("-", " ")}
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/${categoryParam}/${cat.slug}`}
              className="group flex flex-col justify-between rounded-2xl border border-transparent bg-white p-6 shadow-sm transition-all duration-300 hover:border-yellow-400 hover:shadow-xl"
            >
              <div>
                <h2 className="mb-1 text-xl font-bold text-gray-800 transition-colors group-hover:text-black">
                  {cat.name}
                </h2>
                <p className="mb-4 text-xs font-bold uppercase tracking-tighter text-gray-400">
                  {cat._count.products}{" "}
                  {cat._count.products === 1 ? "produto encontrado" : "produtos encontrados"}
                </p>

                <div className="mb-4 grid grid-cols-4 gap-2">
                  {cat.products.length > 0 ? (
                    cat.products.map((product: DynamicProduct) => (
                      <div
                        key={product.id}
                        className="relative aspect-square overflow-hidden rounded-lg border border-gray-100 bg-gray-50 shadow-inner"
                      >
                        {product.imageUrl ? (
                          <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            sizes="80px"
                            className="object-contain p-1.5 mix-blend-multiply transition-transform group-hover:scale-110"
                          />
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-4 flex h-16 items-center justify-center rounded-xl border-2 border-dashed border-gray-100 bg-gray-50 text-[10px] font-bold uppercase text-gray-300">
                      Nenhum item visível
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-black uppercase tracking-tight text-blue-600 transition-colors group-hover:text-orange-600">
                  Ver ofertas
                </span>
                <span className="text-gray-300 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

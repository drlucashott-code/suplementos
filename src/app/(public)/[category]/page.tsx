import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image"; 
import { notFound } from "next/navigation";
import { DynamicProduct } from "@prisma/client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ category: string }>;
}

export default async function CategoryGroupPage({ params }: PageProps) {
  // 🚀 O categoryParam aqui corresponde ao 'group' no nosso banco de dados
  const { category: categoryParam } = await params;

  // Busca apenas as categorias que pertencem a este grupo/nicho específico
  const categories = await prisma.dynamicCategory.findMany({
    where: {
      group: categoryParam.toLowerCase(), // Garante a busca em minúsculo
    },
    include: {
      _count: {
        select: { products: true },
      },
      products: {
        take: 4, // Pega os 4 primeiros para a prévia visual
        orderBy: { createdAt: 'desc' }
      },
    },
    orderBy: { name: 'asc' }
  });

  // Se não houver categorias criadas para este nicho, retorna 404
  if (!categories || categories.length === 0) return notFound();

  return (
    <main className="min-h-screen bg-[#EAEDED] p-4 md:p-8">
      <div className="max-w-6xl mx-auto font-sans">
        
        {/* Breadcrumb simples ou Título Dinâmico */}
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-bold mb-1">Nicho Selecionado</p>
          <h1 className="text-3xl font-black capitalize text-gray-900 tracking-tight">
            {categoryParam.replace("-", " ")}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat) => (
            <Link 
              key={cat.id} 
              href={`/${categoryParam}/${cat.slug}`}
              className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 group border border-transparent hover:border-yellow-400 flex flex-col justify-between"
            >
              <div>
                <h2 className="text-xl font-bold text-gray-800 group-hover:text-black mb-1 transition-colors">
                  {cat.name}
                </h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter mb-4">
                  {cat._count.products} {cat._count.products === 1 ? 'produto encontrado' : 'produtos encontrados'}
                </p>
                
                {/* Grid de miniaturas (Preview de Produtos) */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {cat.products.length > 0 ? (
                    cat.products.map((product: DynamicProduct) => (
                      <div key={product.id} className="aspect-square bg-gray-50 rounded-lg overflow-hidden relative border border-gray-100 shadow-inner">
                        {product.imageUrl && (
                          <Image 
                            src={product.imageUrl} 
                            alt={product.name} 
                            fill
                            sizes="80px"
                            className="object-contain mix-blend-multiply p-1.5 transition-transform group-hover:scale-110"
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="col-span-4 h-16 flex items-center justify-center bg-gray-50 border-2 border-dashed border-gray-100 rounded-xl text-[10px] text-gray-300 font-bold uppercase">
                      Nenhum item cadastrado
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm font-black text-blue-600 group-hover:text-orange-600 transition-colors uppercase tracking-tight">
                  Ver Ofertas
                </span>
                <span className="text-gray-300 group-hover:translate-x-1 transition-transform">
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
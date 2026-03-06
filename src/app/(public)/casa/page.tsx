import { prisma } from '@/lib/prisma';
import ProductCard from '@/components/casa/ProductCard';

interface DisplayConfigField {
  key: string;
  label: string;
  unit: string;
  type?: 'text' | 'number' | 'currency';
}

interface DynamicAttributes {
  [key: string]: string | number | undefined;
}

export default async function CasaPublicPage() {
  const categories = await prisma.homeCategory.findMany({
    include: {
      products: {
        where: { totalPrice: { gt: 0 } },
        orderBy: { totalPrice: 'asc' },
        take: 8,
      }
    }
  });

  return (
    <div className="bg-gray-50 min-h-screen pb-20 font-sans">
      <div className="bg-[#0f172a] text-white py-24 px-8 mb-12 shadow-inner">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tighter uppercase">
            Casa & Limpeza
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
            Calculamos o custo-benefício por <span className="text-white">unidade</span> para você economizar tempo e dinheiro.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-24">
        {categories.map((cat) => (
          <section key={cat.id}>
            <div className="flex justify-between items-end mb-8 border-l-4 border-blue-600 pl-5">
              <div>
                <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">
                  {cat.name}
                </h2>
                <p className="text-gray-400 text-xs font-black uppercase mt-1 tracking-widest">
                  Ofertas Filtradas
                </p>
              </div>
              <a 
                href={`/casa/${cat.slug}`} 
                className="text-blue-600 font-bold text-sm hover:text-blue-800 transition-all hover:translate-x-1"
              >
                Ver tudo →
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {cat.products.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={{ 
                    ...product, 
                    attributes: product.attributes as unknown as DynamicAttributes,
                    category: { 
                      displayConfig: (cat.displayConfig as unknown as DisplayConfigField[]) || [] 
                    } 
                  }} 
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
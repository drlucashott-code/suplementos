import { getHomeCategories, deleteDynamicCategory, type ConfigField } from '../nova-categoria/actions';
import { normalizeDynamicDisplayConfig } from '@/lib/dynamicCategoryMetrics';
import Link from 'next/link';
import DeleteCategoryButton from "@/components/admin/DeleteCategoryButton";

export default async function AdminCategoriasDynamic() {
  // Busca as categorias usando a action que já corrigimos para 'prisma.dynamicCategory'
  const categories = await getHomeCategories();

  return (
    <div className="p-8 text-black bg-white min-h-screen font-sans">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-gray-900">Categorias Dinâmicas</h1>
          <p className="text-gray-500 text-sm">Gerencie os nichos e regras de exibição (Petshop, Limpeza, etc).</p>
        </div>
        
        {/* 🚀 CORREÇÃO: Botão com cor de destaque e rota correta */}
        <Link 
          href="/admin/dynamic/nova-categoria" 
          className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2"
        >
          <span className="text-lg">+</span> Nova Categoria
        </Link>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-gray-200 shadow-sm">
        <table className="w-full border-collapse bg-white text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Nicho</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Nome</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Slug (URL)</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Configuração</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Produtos</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categories.map((cat) => {
              const displayConfig = normalizeDynamicDisplayConfig(cat.displayConfig)
                .fields as unknown as ConfigField[];
              const fieldsCount = displayConfig.length;

              return (
                <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="bg-gray-100 text-[10px] font-bold px-2 py-1 rounded-md uppercase text-gray-600">
                      {cat.group}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-gray-900">{cat.name}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-blue-500">
                      /{cat.group}/{cat.slug}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-gray-700">{fieldsCount} campos</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-700">
                      {cat._count.products} itens
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-4">
                      <Link 
                        href={`/admin/dynamic/nova-categoria?id=${cat.id}`}
                        className="text-gray-400 hover:text-black font-bold text-xs uppercase tracking-tighter transition-colors"
                        title="Editar Categoria"
                      >
                        Editar
                      </Link>
                      
                      <DeleteCategoryButton
                        action={async () => {
                          "use server";
                          await deleteDynamicCategory(cat.id);
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}

            {categories.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-20 text-center text-gray-400 italic">
                  Nenhuma categoria cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex gap-4">
         <Link href="/admin/dynamic/produtos" className="text-gray-400 hover:text-black text-sm font-medium transition-colors">
            ← Voltar para todos os produtos
         </Link>
      </div>
    </div>
  );
}

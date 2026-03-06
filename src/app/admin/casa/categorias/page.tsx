import { getHomeCategories, deleteHomeCategory, type ConfigField } from '../nova-categoria/actions';
import Link from 'next/link'; // 🚀 Importamos o Link do Next.js

export default async function AdminCategoriasCasa() {
  const categories = await getHomeCategories();

  return (
    <div className="p-8 text-black bg-white min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Categorias de Casa</h1>
          <p className="text-gray-500 text-sm">Gerencie as categorias dinâmicas do seu site.</p>
        </div>
        {/* 🚀 Trocado a por Link */}
        <Link 
          href="/admin/casa/nova-categoria" 
          className="bg-black text-white px-5 py-2.5 rounded-lg font-bold hover:bg-gray-800 transition"
        >
          + Nova Categoria
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full border-collapse bg-white text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-6 py-4 font-bold text-gray-900">Nome</th>
              <th className="px-6 py-4 font-bold text-gray-900">Slug (URL)</th>
              <th className="px-6 py-4 font-bold text-gray-900 text-center">Campos</th>
              <th className="px-6 py-4 font-bold text-gray-900 text-center">Produtos</th>
              <th className="px-6 py-4 font-bold text-gray-900 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 border-t border-gray-100">
            {categories.map((cat) => {
              const displayConfig = cat.displayConfig as unknown as ConfigField[];
              const fieldsCount = displayConfig.length;

              return (
                <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{cat.name}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                      /casa/{cat.slug}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold">{fieldsCount} filtros</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {cat._count.products} itens
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end items-center gap-4">
                      {/* 🚀 Trocado a por Link */}
                      <Link 
                        href={`/admin/casa/nova-categoria?id=${cat.id}`}
                        className="text-blue-600 hover:text-blue-800 font-bold text-sm transition"
                        title="Editar Categoria"
                      >
                        Editar
                      </Link>
                      
                      <form action={async () => { 'use server'; await deleteHomeCategory(cat.id); }}>
                        <button 
                          className="text-red-500 hover:text-red-700 font-bold text-sm transition"
                          title="Excluir Categoria"
                        >
                          Excluir
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}

            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-500 italic">
                  Nenhuma categoria cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex gap-4">
         {/* 🚀 Trocado a por Link */}
         <Link href="/admin/casa/produtos" className="text-blue-600 hover:underline text-sm font-medium">
           ← Ver todos os produtos
         </Link>
      </div>
    </div>
  );
}
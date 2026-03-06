import { getDynamicProducts, getHomeCategories } from './actions'; 
import { AdminProductTable } from '@/components/admin/AdminProductTable';
import Link from 'next/link';

// 🚀 ESSENCIAL: Garante que o Admin nunca mostre dados cacheados/desatualizados
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminProdutosDynamic() {
  // 🚀 Busca sincronizada no servidor
  // Note: getHomeCategories agora é buscado da mesma action para manter consistência
  const [products, categories] = await Promise.all([
    getDynamicProducts(),
    getHomeCategories()
  ]);

  return (
    <div className="p-8 text-black bg-gray-50/30 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Superior */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></span>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Painel de Controle</span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 uppercase italic">
              Catálogo Dinâmico
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Gerencie <span className="text-black font-bold">{products.length}</span> produtos em todos os nichos ativos.
            </p>
          </div>

          <div className="flex gap-3">
            {/* Link para Gerenciar Categorias */}
            <Link 
              href="/admin/dynamic/categorias" 
              className="bg-white border border-gray-200 text-gray-500 hover:text-black hover:border-gray-300 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm flex items-center"
            >
              📂 Categorias
            </Link>

            {/* Botão de Importação - Destaque em Amarelo */}
            <Link 
              href="/admin/dynamic/importar" 
              className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-2 border border-yellow-500/20"
            >
              <span className="text-lg leading-none">+</span> Importar via ASIN
            </Link>
          </div>
        </div>

        {/* 🚀 COMPONENTE DE TABELA INTERATIVA (Client Side) 
            Este componente recebe os produtos e as categorias. 
            Dentro dele, você deve garantir que as colunas acessem 'p.attributes.marca' e 'p.attributes.asin'.
        */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
          <AdminProductTable 
            initialProducts={products} 
            categories={categories} 
          />
        </div>

        {/* Rodapé de Navegação */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-between items-center">
           <Link href="/admin" className="text-gray-400 hover:text-black text-[10px] font-black uppercase tracking-widest transition-colors flex items-center gap-2">
             <span className="text-lg">←</span> Voltar ao Dashboard
           </Link>
           
           <span className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">
             Amazon Picks v3.0 - Dynamic System
           </span>
        </div>
      </div>
    </div>
  );
}
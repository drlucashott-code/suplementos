import { getHomeProducts, deleteHomeProduct } from '../novo-produto/actions';
import Link from 'next/link';

export default async function AdminProdutosCasa() {
  const products = await getHomeProducts();

  // Função auxiliar para extrair o ASIN da URL (ex: .../dp/B07DTVN396?...)
  const extractAsin = (url: string) => {
    const match = url.match(/\/dp\/([A-Z0-9]{10})/);
    return match ? match[1] : '---';
  };

  return (
    <div className="p-8 text-black bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b pb-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Produtos de Casa</h1>
            <p className="text-gray-500 text-sm">Gerencie o catálogo de limpeza e utilidades.</p>
          </div>
          <Link 
            href="/admin/casa/importar" 
            className="bg-yellow-400 hover:bg-yellow-500 text-black px-6 py-3 rounded-xl font-bold transition-all shadow-sm"
          >
            + Importar via ASIN
          </Link>
        </div>

        {/* Tabela */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-widest text-gray-400 font-black">
                <th className="p-4">Categoria</th>
                <th className="p-4">Nome</th>
                <th className="p-4">ASIN</th>
                <th className="p-4">Marca</th>
                <th className="p-4">Preço</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => {
                // Tipagem para evitar erro de 'any' nos atributos
                const attrs = p.attributes as { brand?: string };
                const asin = extractAsin(p.url);

                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors text-sm">
                    {/* Categoria */}
                    <td className="p-4">
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-[10px] font-bold uppercase">
                        {p.category.name}
                      </span>
                    </td>

                    {/* Nome */}
                    <td className="p-4 font-medium text-gray-900 max-w-xs truncate">
                      {p.name}
                    </td>

                    {/* ASIN */}
                    <td className="p-4 font-mono text-xs text-blue-500">
                      {asin}
                    </td>

                    {/* Marca */}
                    <td className="p-4 text-gray-500">
                      {attrs.brand || '---'}
                    </td>

                    {/* Preço */}
                    <td className="p-4 font-black text-gray-900">
                      R$ {p.totalPrice.toFixed(2)}
                    </td>

                    {/* Ações */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-4">
                        <Link 
                          href={`/admin/casa/produtos/${p.id}`}
                          className="text-blue-600 hover:text-blue-800 font-bold transition-colors"
                        >
                          Editar
                        </Link>
                        
                        <form action={async () => { 
                          'use server'; 
                          await deleteHomeProduct(p.id); 
                        }}>
                          <button className="text-red-500 hover:text-red-700 font-bold transition-colors">
                            Excluir
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="p-12 text-center text-gray-400 italic">
              Nenhum produto encontrado. Comece importando alguns ASINs!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
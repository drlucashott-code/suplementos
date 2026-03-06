'use client';

import Link from 'next/link';

interface DynamicHeaderProps {
  categoryName: string;
  groupName: string; // 🚀 Adicionado para ser genérico (ex: "CASA", "PETSHOP")
  searchPlaceholder: string;
}

export const DynamicHeader = ({ 
  categoryName, 
  groupName, 
  searchPlaceholder 
}: DynamicHeaderProps) => {
  return (
    <header className="bg-[#131921] text-white p-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        {/* Linha Superior: Logo e Identificador do Nicho */}
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-[#FFD814]">
            amazonpicks<span className="text-white">.com.br</span>
          </Link>
          <span className="text-[10px] font-black bg-gray-700 px-2 py-1 rounded uppercase tracking-widest border border-gray-600">
            {groupName}
          </span>
        </div>

        {/* Linha Inferior: Categoria e Busca */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold">Ofertas de: {categoryName}</h2>
          
          <div className="relative flex-1 max-w-md">
            <form action={(formData) => {
              const query = formData.get('search');
              if (query) {
                // Lógica de busca pode ser injetada via URL aqui
                window.location.search = `?q=${query}`;
              }
            }}>
              <input 
                name="search"
                type="text" 
                placeholder={searchPlaceholder}
                className="w-full p-2.5 rounded-lg text-black outline-none focus:ring-2 focus:ring-[#FFD814] text-sm"
              />
              <button 
                type="submit"
                className="absolute right-0 top-0 h-full bg-[#FFD814] px-4 rounded-r-lg text-black hover:bg-[#F7CA00] transition-colors"
              >
                🔍
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
};
// src/app/casa/HomeHeader.tsx
'use client';

import Link from 'next/link';

interface HomeHeaderProps {
  categoryName: string;
  searchPlaceholder: string;
}

export const HomeHeader = ({ categoryName, searchPlaceholder }: HomeHeaderProps) => {
  return (
    <header className="bg-[#131921] text-white p-4 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-col gap-3">
        {/* Linha Superior: Logo e Link Voltar */}
        <div className="flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-[#FFD814]">
            amazonpicks<span className="text-white">.com.br</span>
          </Link>
          <span className="text-xs bg-gray-700 px-2 py-1 rounded">CASA & LIMPEZA</span>
        </div>

        {/* Linha Inferior: Categoria e Busca */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-lg font-bold">Ofertas de: {categoryName}</h2>
          
          <div className="relative flex-1 max-w-md">
            <input 
              type="text" 
              placeholder={searchPlaceholder}
              className="w-full p-2 rounded text-black outline-none focus:ring-2 focus:ring-[#FFD814]"
            />
            <button className="absolute right-0 top-0 h-full bg-[#FFD814] px-4 rounded-r text-black">
              🔍
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
"use client";

import { BarChart3, TrendingUp, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import Header from "./Header"; // 🚀 Importado para aparecer apenas na Home

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#EAEDED] pb-20 font-sans">
      
      {/* --- 1. HEADER EXCLUSIVO DA HOME (Com busca branca) --- */}
      <Header />

      {/* --- 2. FAIXA DE STATUS (Sub-header) --- */}
      <div className="bg-[#37475A] px-4 py-2.5 flex items-center gap-2 text-white text-[12px] font-medium shadow-inner">
        <ShieldCheck className="w-4 h-4 text-[#FF9900]" />
        <span>Comparador verificado de ofertas Amazon</span>
      </div>

      {/* --- 3. HERO SECTION --- */}
      <div className="bg-white border-b border-gray-200 relative overflow-hidden">
        <div className="px-5 pt-8 pb-8 max-w-lg mx-auto text-center relative z-10">
          
          <span className="inline-block bg-[#F0F2F2] text-[#007185] text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider mb-4 border border-gray-300">
            Guia do Consumidor
          </span>

          <h1 className="text-[18px] sm:text-[20px] leading-snug font-bold text-[#0F1111] mb-8">
            Utilizamos filtros inteligentes para encontrar o melhor produto para você.
          </h1>

          {/* --- MÉTRICAS --- */}
          <div className="grid grid-cols-2 gap-8 mt-2 px-2">
            <div className="flex flex-col items-center gap-2 text-center">
              <BarChart3 className="w-8 h-8 text-[#007185]" />
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-[#0F1111]">Análise Técnica</span>
                <span className="text-[12px] text-[#565959]">Custo real por grama</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2 text-center">
              <TrendingUp className="w-8 h-8 text-[#007185]" />
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-[#0F1111]">Preço Justo</span>
                <span className="text-[12px] text-[#565959]">Histórico de 30 dias</span>
              </div>
            </div>
          </div>

        </div>
        
        {/* Gradiente de Transição para o fundo cinza */}
        <div className="absolute bottom-0 w-full h-6 bg-gradient-to-b from-transparent to-[#EAEDED]/50" />
      </div>

      {/* --- 4. GRID DE CATEGORIAS --- */}
      <div className="px-4 -mt-4 relative z-20 max-w-xl mx-auto space-y-4">
        
        <h2 className="text-[18px] font-bold text-[#0F1111] px-1 pt-4">Comprar por categoria</h2>

        <div className="grid grid-cols-2 gap-3">
          
          <CategoryCard 
            title="Creatina"
            imageSrc="https://m.media-amazon.com/images/I/81UashXoAxL._AC_SL1500_.jpg" 
            onClick={() => router.push('/creatina')}
          />

          <CategoryCard 
            title="Whey Protein"
            imageSrc="https://m.media-amazon.com/images/I/51lOuKbCawL._AC_SL1000_.jpg" 
            onClick={() => router.push('/whey')}
          />

          <CategoryCard 
            title="Barra de proteína"
            imageSrc="https://m.media-amazon.com/images/I/61RDMRO3uCL._AC_SL1200_.jpg" 
            onClick={() => router.push('/barra')}
          />

          <CategoryCard 
            title="Pré-Treino"
            imageSrc="https://m.media-amazon.com/images/I/61fGbsRyDWL._AC_SL1333_.jpg" 
            onClick={() => {}}
            disabled
          />
        </div>

        {/* --- 5. FOOTER --- */}
        <footer className="pt-10 pb-4 text-center px-4">
          <div className="border-t border-gray-300 w-16 mx-auto mb-4" />
          <p className="text-[11px] text-[#565959] leading-tight px-6">
            Participamos do Programa de Associados da Amazon Services LLC.
          </p>
          <p className="text-[11px] text-[#565959] mt-2">
            &copy; 2026 Amazon Picks.
          </p>
        </footer>

      </div>
    </main>
  );
}

// --- COMPONENTE DE CARD ---
interface CategoryCardProps {
  title: string;
  imageSrc: string;
  onClick: () => void;
  disabled?: boolean;
}

function CategoryCard({ title, imageSrc, onClick, disabled }: CategoryCardProps) {
  return (
    <div 
      onClick={!disabled ? onClick : undefined}
      className={`
        relative bg-white p-4 rounded-lg shadow-sm flex flex-col items-center justify-between h-[160px] border transition-all
        ${disabled 
          ? 'border-gray-100 opacity-60 cursor-not-allowed bg-gray-50' 
          : 'border-gray-200 cursor-pointer active:scale-[0.98] active:border-[#e47911] hover:shadow-md'
        }
      `}
    >
      <h2 className="text-[15px] font-bold text-[#0F1111] w-full text-left mb-2">{title}</h2>

      <div className="w-24 h-24 relative flex items-center justify-center">
         <img 
            src={imageSrc} 
            alt={title}
            className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm"
         />
      </div>

      {disabled && (
        <span className="absolute bottom-2 right-2 text-[10px] text-gray-400 font-medium bg-gray-100 px-1 rounded">
          em breve
        </span>
      )}
    </div>
  );
}
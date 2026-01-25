"use client";

import { Menu, BarChart3, TrendingUp, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[#EAEDED] pb-20 font-sans">
      
      {/* --- 1. HEADER ESTILO AMAZON --- */}
      <header className="bg-[#232f3e] sticky top-0 z-50 shadow-md">
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <button className="p-1">
              <Menu className="w-6 h-6" />
            </button>
            <div className="font-bold text-xl tracking-tight">
              amazon<span className="text-[#FF9900]">picks</span>
            </div>
          </div>
        </div>

        <div className="bg-[#37475A] px-4 py-2.5 flex items-center gap-2 text-white text-[12px] font-medium shadow-inner">
          <ShieldCheck className="w-4 h-4 text-[#FF9900]" />
          <span>Comparador verificado de ofertas Amazon</span>
        </div>
      </header>

      {/* --- 2. HERO SECTION --- */}
      <div className="bg-white border-b border-gray-200 relative overflow-hidden">
        <div className="px-5 pt-8 pb-10 max-w-lg mx-auto text-center relative z-10">
          
          <span className="inline-block bg-[#F0F2F2] text-[#007185] text-[10px] font-bold px-3 py-1 rounded uppercase tracking-wider mb-5 border border-gray-300">
            Guia do Consumidor
          </span>

          <h1 className="text-[21px] leading-snug font-bold text-[#0F1111] mb-8">
            Utilizamos filtros inteligentes para encontrar o melhor produto para você.
          </h1>

          <div className="grid grid-cols-2 gap-6 mt-4 px-2">
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-blue-50 rounded-full">
                <BarChart3 className="w-6 h-6 text-[#007185]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-[#0F1111]">Análise Técnica</span>
                <span className="text-[12px] text-[#565959]">Custo real por grama</span>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-blue-50 rounded-full">
                <TrendingUp className="w-6 h-6 text-[#007185]" />
              </div>
              <div className="flex flex-col">
                <span className="text-[14px] font-bold text-[#0F1111]">Preço Justo</span>
                <span className="text-[12px] text-[#565959]">Histórico de 30 dias</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 w-full h-8 bg-gradient-to-b from-transparent to-[#EAEDED]/60" />
      </div>

      {/* --- 3. GRID DE CATEGORIAS --- */}
      <div className="px-4 -mt-6 relative z-20 max-w-xl mx-auto space-y-4">
        
        <h2 className="text-[18px] font-bold text-[#0F1111] px-1 pt-4">Comprar por categoria</h2>

        <div className="grid grid-cols-2 gap-3">
          
          {/* CARD 1: CREATINA */}
          <CategoryCard 
            title="Creatina"
            imageSrc="https://m.media-amazon.com/images/I/81UashXoAxL._AC_SL1500_.jpg" 
            onClick={() => router.push('/creatina')}
          />

          {/* CARD 2: WHEY PROTEIN */}
          <CategoryCard 
            title="Whey Protein"
            imageSrc="https://m.media-amazon.com/images/I/51lOuKbCawL._AC_SL1000_.jpg" 
            onClick={() => router.push('/whey')}
          />

          {/* CARD 3: BARRINHAS */}
          <CategoryCard 
            title="Barrinhas"
            imageSrc="https://m.media-amazon.com/images/I/61RDMRO3uCL._AC_SL1200_.jpg" 
            onClick={() => {}}
            disabled
          />

          {/* CARD 4: PRÉ-TREINO */}
          <CategoryCard 
            title="Pré-Treino"
            imageSrc="https://m.media-amazon.com/images/I/61fGbsRyDWL._AC_SL1333_.jpg" 
            onClick={() => {}}
            disabled
          />
        </div>

        {/* --- 4. FOOTER --- */}
        <footer className="pt-12 pb-6 text-center px-4">
          <div className="border-t border-gray-300 w-24 mx-auto mb-5" />
          <p className="text-[11px] text-[#565959] leading-snug">
            Participamos do Programa de Associados da Amazon Services LLC.
          </p>
          <p className="text-[11px] text-[#565959] mt-3 font-medium">
            &copy; 2026 Amazon Picks. Todos os direitos reservados.
          </p>
        </footer>

      </div>
    </main>
  );
}

// --- COMPONENTE DE CARD AJUSTADO ---
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
        relative bg-white p-4 rounded-lg shadow-sm flex flex-col items-center justify-between h-[170px] border transition-all overflow-hidden
        ${disabled 
          ? 'border-gray-100 opacity-70 cursor-not-allowed grayscale-[0.3]' 
          : 'border-gray-200 cursor-pointer active:scale-[0.98] active:border-[#e47911] hover:shadow-md'
        }
      `}
    >
      {/* Badge Em Breve */}
      {disabled && (
        <span className="absolute top-0 right-0 bg-[#F0F2F2] text-[#565959] text-[9px] font-bold px-2 py-1 rounded-bl-lg border-b border-l border-gray-200 z-10">
          Em breve
        </span>
      )}

      {/* Texto da Categoria */}
      <h2 className={`text-[15px] font-bold w-full text-left mb-2 ${disabled ? 'text-gray-500' : 'text-[#0F1111]'}`}>
        {title}
      </h2>

      {/* Imagem Centralizada */}
      <div className="w-28 h-28 relative flex items-center justify-center">
         <img 
           src={imageSrc} 
           alt={title}
           className="w-full h-full object-contain mix-blend-multiply drop-shadow-sm p-1"
         />
      </div>
    </div>
  );
}
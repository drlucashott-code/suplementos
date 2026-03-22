import Image from 'next/image';
import { getOptimizedAmazonUrl } from '@/lib/utils';

// 1. Interfaces para eliminar o 'any'
interface DisplayConfigField {
  key: string;
  label: string;
  unit: string;
  type?: 'text' | 'number' | 'currency';
}

interface DynamicAttributes {
  [key: string]: string | number | undefined;
}

interface ProductCardProps {
  product: {
    name: string;
    totalPrice: number;
    imageUrl: string | null;
    url: string;
    attributes: DynamicAttributes; // Tipado!
    category: {
      displayConfig: DisplayConfigField[]; // Tipado!
    };
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { name, totalPrice, imageUrl, url, attributes, category } = product;
  
  // 2. Lógica de busca da unidade de medida
  // Procuramos por campos que indiquem volume ou quantidade para o cálculo
  const config = category.displayConfig;
  const unitField = config.find(c => 
    c.key === 'quantity' || 
    c.key === 'liters' || 
    c.key === 'washes' ||
    c.key === 'meters'
  );
  
  const unitValue = unitField ? (attributes[unitField.key] as number) : 0;
  const pricePerUnit = unitValue > 0 ? totalPrice / unitValue : 0;

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="group bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-xl transition-all flex flex-col h-full"
    >
      {/* Imagem do Produto */}
      <div className="relative w-full h-44 mb-4 bg-gray-50 rounded-xl overflow-hidden">
        <Image 
          src={imageUrl ? getOptimizedAmazonUrl(imageUrl, 320) : '/placeholder.png'} 
          alt={name} 
          fill 
          className="object-contain p-2 group-hover:scale-105 transition-transform" 
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          unoptimized
        />
      </div>

      {/* Nome */}
      <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-2 flex-grow">
        {name}
      </h3>

      <div className="mt-auto border-t border-gray-50 pt-3">
        {/* Badge de Custo-Benefício */}
        {pricePerUnit > 0 && (
          <div className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase px-2 py-1 rounded-md w-fit mb-2 tracking-tight">
            R$ {pricePerUnit.toFixed(2)} por {unitField?.label.toLowerCase() || 'unid.'}
          </div>
        )}

        {/* Preço Principal */}
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] font-bold text-gray-400">R$</span>
          <span className="text-2xl font-black text-gray-900 leading-none">
            {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Call to Action */}
        <div className="w-full mt-3 bg-[#FFD814] group-hover:bg-[#F7CA00] text-black py-2.5 rounded-xl font-bold text-xs text-center transition-colors shadow-sm">
          Menor Preço na Amazon
        </div>
      </div>
    </a>
  );
}

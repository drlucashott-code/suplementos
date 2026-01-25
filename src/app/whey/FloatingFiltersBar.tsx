"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";

export function FloatingFiltersBar() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const order = searchParams.get("order") ?? "cost";

  useEffect(() => {
    const controlNavbar = () => {
      if (typeof window !== 'undefined') {
        if (window.scrollY > lastScrollY && window.scrollY > 80) {
          setIsVisible(false);
        } else {
          setIsVisible(true);
        }
        setLastScrollY(window.scrollY);
      }
    };

    window.addEventListener('scroll', controlNavbar);
    return () => window.removeEventListener('scroll', controlNavbar);
  }, [lastScrollY]);

  function openFilters() {
    window.dispatchEvent(new CustomEvent("open-filters"));
  }

  function changeOrder(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("order", value);
    router.push(`/whey?${params.toString()}`);
  }

  return (
    <div className={`sticky top-[64px] z-30 bg-white border-b border-gray-200 py-2 px-2 transition-transform duration-300 ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={openFilters}
          className="flex items-center justify-center border border-gray-300 rounded-lg p-2 bg-white shadow-sm active:bg-gray-50 flex-shrink-0"
        >
          <SlidersHorizontal className="w-5 h-5 text-[#0F1111]" />
        </button>

        <div className="flex-1 flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-1.5 bg-[#F0F2F2] shadow-sm border-b-[#D5D9D9]">
          <span className="text-[13px] text-[#565959] whitespace-nowrap">Classificar por:</span>
          <div className="flex-1 relative">
            <select
              value={order}
              onChange={(e) => changeOrder(e.target.value)}
              className="w-full appearance-none bg-transparent text-[13px] text-[#0F1111] font-medium outline-none pr-6"
            >
              <option value="cost"> Custo-benefício</option>
              <option value="discount">Maior desconto</option>
              <option value="protein">Maior % de proteína</option>
            </select>
            <ChevronDown className="absolute right-0 top-0.5 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // Força a janela a ir para o topo absoluto (0, 0) sempre que o caminho da URL mudar
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
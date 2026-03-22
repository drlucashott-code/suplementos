"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useEffect, useState } from "react";
import { SAVED_DEALS_EVENT, getSavedDeals } from "@/lib/client/savedDeals";

export default function SavedDealsLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => setCount(getSavedDeals().length);

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(SAVED_DEALS_EVENT, sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(SAVED_DEALS_EVENT, sync);
    };
  }, []);

  return (
    <Link
      href="/salvos"
      className="relative inline-grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md bg-[#febd69] text-[0] text-[#131921] shadow-sm transition hover:bg-[#f3a847]"
      aria-label="Ofertas salvas"
      title="Ofertas salvas"
    >
      <Bookmark className="h-5 w-5" />
      <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#131921] px-1 text-[10px] font-bold text-white">
        {count}
      </span>
    </Link>
  );
}

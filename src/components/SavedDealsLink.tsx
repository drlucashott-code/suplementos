"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { useEffect, useState } from "react";
import {
  SAVED_DEALS_EVENT,
  getSavedDeals,
} from "@/lib/client/savedDeals";

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
      className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md border border-white/10 bg-[#232f3e] px-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-[#2d3f58]"
    >
      <Bookmark className="h-4 w-4" />
      <span>Salvos</span>
      <span className="rounded-full bg-[#febd69] px-2 py-0.5 text-[11px] font-bold text-[#131921]">
        {count}
      </span>
    </Link>
  );
}

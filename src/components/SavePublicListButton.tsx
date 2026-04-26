"use client";

import { Bookmark } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SavePublicListButton({
  listId,
  initialSaved,
}: {
  listId: string;
  initialSaved: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    setPending(true);

    try {
      const response = await fetch("/api/account/saved-lists", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId }),
      });

      if (response.status === 401) {
        router.push("/entrar");
        return;
      }

      const data = (await response.json()) as { ok?: boolean };
      if (!response.ok || !data.ok) {
        throw new Error("saved_list_toggle_failed");
      }

      setSaved((current) => !current);
    } catch (error) {
      console.error("saved_list_toggle_failed", error);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      disabled={pending}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold transition ${
        saved
          ? "border-[#f0c14b] bg-[#fff7d6] text-[#b77900]"
          : "border-[#d5d9d9] bg-white text-[#0F1111] hover:border-[#aab7b8]"
      } disabled:opacity-60`}
    >
      <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
      {pending ? "Salvando..." : saved ? "Lista salva" : "Salvar lista"}
    </button>
  );
}

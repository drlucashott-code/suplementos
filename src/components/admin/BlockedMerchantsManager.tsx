"use client";

import { useMemo, useState } from "react";

type BlockedMerchantsManagerProps = {
  blockedMerchants: string[];
  blockedMerchantStats: Array<{
    merchant: string;
    productCount: number;
  }>;
  action: (formData: FormData) => void | Promise<void>;
};

function normalizeMerchantName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function BlockedMerchantsManager({
  blockedMerchants,
  blockedMerchantStats,
  action,
}: BlockedMerchantsManagerProps) {
  const [draftMerchant, setDraftMerchant] = useState("");
  const [merchants, setMerchants] = useState<string[]>(blockedMerchants);

  const sortedMerchants = useMemo(
    () => [...merchants].sort((a, b) => a.localeCompare(b, "pt-BR")),
    [merchants]
  );

  const statsByMerchant = useMemo(
    () =>
      new Map(
        blockedMerchantStats.map((stat) => [stat.merchant.toLowerCase(), stat.productCount])
      ),
    [blockedMerchantStats]
  );

  function addMerchant() {
    const normalized = normalizeMerchantName(draftMerchant);
    if (!normalized) return;

    const lowered = normalized.toLowerCase();
    const alreadyExists = merchants.some((merchant) => merchant.toLowerCase() === lowered);

    if (alreadyExists) {
      setDraftMerchant("");
      return;
    }

    setMerchants((current) => [...current, normalized]);
    setDraftMerchant("");
  }

  function removeMerchant(merchantToRemove: string) {
    const confirmed = window.confirm(`Excluir "${merchantToRemove}" da blocklist?`);
    if (!confirmed) return;

    setMerchants((current) =>
      current.filter((merchant) => merchant.toLowerCase() !== merchantToRemove.toLowerCase())
    );
  }

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
      <input type="hidden" name="blockedMerchants" value={merchants.join("\n")} />

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-500">
            Adicionar seller bloqueado
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={draftMerchant}
              onChange={(event) => setDraftMerchant(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addMerchant();
                }
              }}
              className="h-12 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-900 outline-none focus:border-rose-300 focus:bg-white"
              placeholder="Ex.: Minha Loja"
            />
            <button
              type="button"
              onClick={addMerchant}
              className="h-12 rounded-2xl bg-gray-900 px-5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-black"
            >
              Adicionar
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            O seller entra na caixa da direita e depois voce salva a blocklist.
          </p>
        </div>

        <button
          type="submit"
          className="rounded-2xl bg-rose-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition hover:bg-rose-700"
        >
          Salvar blocklist
        </button>
      </div>

      <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-5">
        <div className="mb-4">
          <span className="block text-[10px] font-black uppercase tracking-widest text-rose-700">
            Sellers adicionais ativos
          </span>
          <p className="mt-1 text-sm font-medium text-gray-600">
            Clique no <span className="font-black">X</span> para remover um seller antes de salvar.
          </p>
        </div>

        {sortedMerchants.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-rose-200 bg-white px-4 py-6 text-sm font-medium text-gray-500">
            Nenhum seller adicional bloqueado.
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {sortedMerchants.map((merchant) => (
              <div
                key={merchant}
                className="flex items-center gap-2 rounded-full border border-rose-200 bg-white px-3 py-2 text-sm font-bold text-rose-700 shadow-sm"
              >
                <span>{merchant}</span>
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-black text-rose-700">
                  {statsByMerchant.get(merchant.toLowerCase()) ?? 0}
                </span>
                <button
                  type="button"
                  onClick={() => removeMerchant(merchant)}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-[11px] font-black leading-none text-rose-700 transition hover:bg-rose-200"
                  aria-label={`Excluir ${merchant}`}
                  title={`Excluir ${merchant}`}
                >
                  x
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </form>
  );
}

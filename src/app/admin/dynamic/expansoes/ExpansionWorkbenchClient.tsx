"use client";

import Image from "next/image";
import { useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  approveExpansionDecision,
  clearExpansionPendingDecisions,
  clearExpansionRejectedDecisions,
  rejectExpansionDecision,
  scanCategoryExpansionGaps,
} from "./actions";

type CategoryOption = {
  id: string;
  name: string;
  group: string;
  slug: string;
};

type ExpansionDecisionRow = {
  id: string;
  asin: string;
  sourceAsin: string | null;
  status: string;
  reasonCode: string | null;
  reasonText: string | null;
  title: string | null;
  brand: string | null;
  imageUrl: string | null;
  observedPrice: number | null;
  productId: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  createdAt: string;
};

type ExpansionWorkbenchProps = {
  categories: CategoryOption[];
  selectedCategoryId: string;
  notice: string;
  selectedCategory: CategoryOption | null;
  baseProductCount: number;
  decisions: ExpansionDecisionRow[];
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

function formatMoney(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "—";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function amazonUrl(asin: string) {
  return `https://www.amazon.com.br/dp/${asin}`;
}

function PendingSubmitButton({
  children,
  pendingLabel,
  className,
  disabled,
}: {
  children: ReactNode;
  pendingLabel: string;
  className: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={disabled || pending} className={className}>
      {pending ? pendingLabel : children}
    </button>
  );
}

function SectionShell({
  title,
  count,
  open = false,
  children,
  subtitle,
}: {
  title: string;
  count: number;
  open?: boolean;
  children: ReactNode;
  subtitle?: string;
}) {
  return (
    <details
      open={open}
      className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-gray-200/40"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-[14px] font-black uppercase tracking-[0.3em] text-gray-900">
              {title}
            </h2>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-black text-gray-600">
              {count}
            </span>
          </div>
          {subtitle ? <p className="mt-2 text-sm font-medium text-gray-500">{subtitle}</p> : null}
        </div>
      </summary>
      <div className="border-t border-gray-100 px-4 py-4">{children}</div>
    </details>
  );
}

function DecisionTable({
  rows,
  categoryId,
  emptyLabel,
  showActions,
  showOrigin,
  actionMode,
}: {
  rows: ExpansionDecisionRow[];
  categoryId: string;
  emptyLabel: string;
  showActions: boolean;
  showOrigin: boolean;
  actionMode: "pending" | "readonly";
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 px-5 py-8 text-center text-sm font-semibold text-gray-400">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.75rem] border border-gray-100">
      <div className="overflow-x-auto">
        <table className="min-w-[960px] w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50 text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
              <th className="w-[84px] p-3 text-center text-black">Foto</th>
              <th className="p-3 text-black">Produto</th>
              <th className="w-[170px] p-3 text-black">Marca</th>
              <th className="w-[150px] p-3 text-black">ASIN</th>
              {showOrigin ? <th className="w-[150px] p-3 text-black">Origem</th> : null}
              <th className="w-[180px] p-3 text-black">Ultima vez visto</th>
              {showActions ? <th className="w-[190px] p-3 text-black">Acao</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-gray-50/50">
                <td className="p-3 align-top">
                  <div className="relative mx-auto h-14 w-14 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                    {row.imageUrl ? (
                      <Image
                        src={row.imageUrl}
                        alt={row.title || row.asin}
                        fill
                        className="object-contain p-1"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] font-bold text-gray-300">
                        sem foto
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-3 align-top">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={amazonUrl(row.asin)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-gray-900 transition-colors hover:text-blue-700"
                      >
                        {row.title || `Produto Amazon ${row.asin}`}
                      </a>
                      <a
                        href={amazonUrl(row.asin)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-blue-700 transition-colors hover:bg-blue-100"
                      >
                        {row.asin}
                      </a>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-500">
                      <span>{formatMoney(row.observedPrice)}</span>
                      {row.reasonText ? <span>• {row.reasonText}</span> : null}
                    </div>
                  </div>
                </td>
                <td className="p-3 align-top">
                  <div className="font-semibold text-gray-900">{row.brand || "—"}</div>
                  <div className="mt-1 text-xs font-medium text-gray-500">
                    {row.reasonCode || "sem motivo"}
                  </div>
                </td>
                <td className="p-3 align-top">
                  <a
                    href={amazonUrl(row.asin)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-black text-gray-900 transition-colors hover:text-blue-700"
                  >
                    {row.asin}
                  </a>
                </td>
                {showOrigin ? (
                  <td className="p-3 align-top">
                    {row.sourceAsin ? (
                      <a
                        href={amazonUrl(row.sourceAsin)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-gray-900 transition-colors hover:text-blue-700"
                      >
                        {row.sourceAsin}
                      </a>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                ) : null}
                <td className="p-3 align-top text-sm font-medium text-gray-500">
                  {formatDate(row.lastSeenAt)}
                </td>
                {showActions ? (
                  <td className="p-3 align-top">
                    <div className="flex flex-wrap gap-2">
                      {actionMode === "pending" ? (
                        <>
                          <form action={approveExpansionDecision}>
                            <input type="hidden" name="categoryId" value={categoryId} />
                            <input type="hidden" name="decisionId" value={row.id} />
                            <PendingSubmitButton
                              pendingLabel="Importando..."
                              className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              Importar com dados
                            </PendingSubmitButton>
                          </form>
                          <form action={rejectExpansionDecision}>
                            <input type="hidden" name="categoryId" value={categoryId} />
                            <input type="hidden" name="decisionId" value={row.id} />
                            <PendingSubmitButton
                              pendingLabel="Rejeitando..."
                              className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              Rejeitar
                            </PendingSubmitButton>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ExpansionWorkbenchClient({
  categories,
  selectedCategoryId,
  notice,
  selectedCategory,
  baseProductCount,
  decisions,
}: ExpansionWorkbenchProps) {
  const router = useRouter();

  const pendingRows = useMemo(
    () =>
      decisions.filter(
        (item) => item.status === "discovered" || item.status === "pending_review"
      ),
    [decisions]
  );
  const rejectedRows = useMemo(
    () =>
      decisions.filter(
        (item) => item.status === "rejected_soft" || item.status === "rejected_hard"
      ),
    [decisions]
  );

  return (
    <main className="min-h-screen bg-gray-50/30 p-8 font-sans text-black">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-6 rounded-[2rem] border border-gray-100 bg-white px-6 py-6 shadow-xl shadow-gray-200/40 md:flex-row md:items-end md:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-600">
                Expansao de catalogo
              </span>
            </div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900">
              Expansao de variacoes
            </h1>
            <p className="mt-1 text-sm font-medium text-gray-500">
              Selecione uma categoria, vasculhe as familias dos ASINs base e importe so o que
              realmente vale entrar no banco.
            </p>
          </div>

          <div className="min-w-[320px]">
            <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
              Selecionar categoria
            </label>
            <select
              value={selectedCategoryId}
              onChange={(event) => {
                const next = event.target.value;
                router.push(
                  next
                    ? `/admin/dynamic/expansoes?category=${encodeURIComponent(next)}`
                    : "/admin/dynamic/expansoes"
                );
              }}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-base font-medium text-gray-900 shadow-sm outline-none transition focus:border-blue-300"
            >
              <option value="">Selecionar categoria</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {selectedCategory ? (
              <p className="mt-2 text-xs font-semibold text-gray-500">
                {selectedCategory.group} / {selectedCategory.slug}
              </p>
            ) : null}
          </div>
        </div>

        {notice ? (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-800">
            {notice}
          </div>
        ) : null}

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
              Categoria
            </div>
            <div className="mt-1 text-2xl font-black text-gray-900">
              {selectedCategory?.name || "—"}
            </div>
            <div className="mt-1 text-sm font-medium text-gray-500">
              {selectedCategory?.group || "Selecione uma categoria"}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
              Base ASINs
            </div>
            <div className="mt-1 text-2xl font-black text-gray-900">{baseProductCount}</div>
            <div className="mt-1 text-sm font-medium text-gray-500">
              Produtos ja cadastrados na categoria
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
              Encontrados
            </div>
            <div className="mt-1 text-2xl font-black text-gray-900">{pendingRows.length}</div>
            <div className="mt-1 text-sm font-medium text-gray-500">
              Variacoes prontas para importar ou rejeitar
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">
              Rejeitados
            </div>
            <div className="mt-1 text-2xl font-black text-gray-900">{rejectedRows.length}</div>
            <div className="mt-1 text-sm font-medium text-gray-500">
              ASINs barrados para esta categoria
            </div>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
          <form action={scanCategoryExpansionGaps}>
            <input type="hidden" name="categoryId" value={selectedCategoryId} />
            <PendingSubmitButton
              pendingLabel="Vasculhando..."
              disabled={!selectedCategoryId}
              className="rounded-full border border-gray-900 bg-gray-900 px-5 py-3 text-[11px] font-black uppercase tracking-[0.3em] text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-200 disabled:text-gray-500"
            >
              Vasculhar variacoes
            </PendingSubmitButton>
          </form>

          <div className="ml-auto flex items-center gap-3 text-sm font-semibold text-gray-500">
            <span>{decisions.length} expansões acumuladas</span>
            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
            <span>{pendingRows.length} ASINs encontrados</span>
          </div>
        </div>

        {!selectedCategoryId ? (
          <div className="rounded-[2rem] border border-dashed border-gray-200 bg-white px-6 py-10 text-center shadow-sm">
            <div className="text-lg font-black text-gray-900">Selecione uma categoria</div>
            <p className="mt-2 text-sm font-medium text-gray-500">
              Depois disso a tela carrega os ASINs base, as variacoes novas e os rejeitados
              desta categoria.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <SectionShell
              title="Produtos encontrados"
              count={pendingRows.length}
              open
              subtitle="Mostra apenas as variacoes novas encontradas na familia."
            >
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <form action={clearExpansionPendingDecisions}>
                  <input type="hidden" name="categoryId" value={selectedCategoryId} />
                  <PendingSubmitButton
                    pendingLabel="Limpando..."
                    disabled={!selectedCategoryId}
                    className="rounded-full border border-rose-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    Limpar encontrados
                  </PendingSubmitButton>
                </form>
              </div>
              <DecisionTable
                rows={pendingRows}
                categoryId={selectedCategoryId}
                emptyLabel="Nenhuma variacao nova encontrada para revisar."
                showActions
                showOrigin
                actionMode="pending"
              />
            </SectionShell>

            <SectionShell
              title="Produtos rejeitados"
              count={rejectedRows.length}
              subtitle="ASINs barrados para esta categoria."
            >
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <form action={clearExpansionRejectedDecisions}>
                  <input type="hidden" name="categoryId" value={selectedCategoryId} />
                  <PendingSubmitButton
                    pendingLabel="Limpando..."
                    disabled={!selectedCategoryId}
                    className="rounded-full border border-rose-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-700 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    Limpar rejeitados
                  </PendingSubmitButton>
                </form>
              </div>
              <DecisionTable
                rows={rejectedRows}
                categoryId={selectedCategoryId}
                emptyLabel="Nenhum item rejeitado nesta categoria."
                showActions={false}
                showOrigin
                actionMode="readonly"
              />
            </SectionShell>
          </div>
        )}
      </div>
    </main>
  );
}

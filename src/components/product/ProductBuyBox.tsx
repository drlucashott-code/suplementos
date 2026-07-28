"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertTriangle, Check, Heart, ShieldCheck, Truck, X } from "lucide-react";
import TrackedDealLink from "@/components/TrackedDealLink";
import AccountListPickerModal from "@/components/AccountListPickerModal";
import { PriceHistoryButton } from "@/components/dynamic/PriceHistoryButton";
import { ProductShareInlineButton } from "@/lib/client/productShare";
import {
  accountPrimaryButtonClass,
  accountSecondaryButtonClass,
} from "@/components/account/accountUi";
import {
  ACCOUNT_FAVORITES_EVENT,
  isAccountFavorite,
  toggleAccountFavorite,
} from "@/lib/client/accountFavorites";
import { getAccountListsCount } from "@/lib/client/accountLists";

export type BuyBoxProduct = {
  id: string;
  asin: string;
  name: string;
  url: string;
  totalPrice: number;
  averagePrice30d: number;
  discountPercent: number;
  ratingAverage: number | null;
  ratingCount: number | null;
  createdAt?: Date | string | null;
};

const REPORT_REASONS = [
  "Preço desatualizado",
  "Produto indisponível",
  "Informação incorreta",
  "Outro",
] as const;

const UNVERIFIED_ACCOUNT_MESSAGE =
  "Para ativarmos a sua conta na Amazonpicks, precisamos que você confirme o seu endereço de email.";

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function ProductBuyBox({
  product,
  category = "produto_detalhe",
}: {
  product: BuyBoxProduct;
  category?: string;
}) {
  const router = useRouter();
  const hasPrice = product.totalPrice > 0;
  const hasReferencePrice =
    hasPrice &&
    product.averagePrice30d > product.totalPrice &&
    product.discountPercent > 0;
  const [whole, cents] = (hasPrice ? product.totalPrice : 0).toFixed(2).split(".");

  const [saved, setSaved] = useState(false);
  const [accountListCount, setAccountListCount] = useState<number | null>(null);
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [accountAlert, setAccountAlert] = useState<null | "unverified">(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] =
    useState<(typeof REPORT_REASONS)[number]>("Preço desatualizado");
  const [details, setDetails] = useState("");
  const [reportState, setReportState] =
    useState<"idle" | "submitting" | "success" | "error">("idle");

  useEffect(() => {
    let active = true;
    void isAccountFavorite(product.id).then((value) => {
      if (active) setSaved(value);
    });
    return () => {
      active = false;
    };
  }, [product.id]);

  useEffect(() => {
    let active = true;
    void getAccountListsCount().then((count) => {
      if (active) setAccountListCount(count);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const sync = () => void isAccountFavorite(product.id).then(setSaved);
    window.addEventListener("storage", sync);
    window.addEventListener(ACCOUNT_FAVORITES_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(ACCOUNT_FAVORITES_EVENT, sync);
    };
  }, [product.id]);

  function confirmSaved(listTitle: string) {
    setSaved(true);
    toast.success(`Salvo em ${listTitle}`);
  }

  async function handleToggleSave() {
    try {
      const nextSaved = !saved;

      if (nextSaved) {
        const listCount = accountListCount ?? (await getAccountListsCount());
        if (accountListCount === null) setAccountListCount(listCount);
        if (listCount > 1) {
          setListPickerOpen(true);
          return;
        }
      }

      const result = await toggleAccountFavorite(product.id, nextSaved);
      if (result.unauthorized) {
        router.push("/entrar");
        return;
      }
      if ("unverified" in result && result.unverified) {
        setAccountAlert("unverified");
        return;
      }
      if (!result.ok) {
        toast.error(result.errorDetail ?? result.error ?? "Não foi possível salvar agora.");
        return;
      }

      if (nextSaved) {
        confirmSaved(result.list?.title ?? "Minha lista");
      } else {
        setSaved(false);
      }
    } catch (error) {
      console.error("buybox_save_failed", error);
      toast.error("Não foi possível salvar agora.");
    }
  }

  async function submitReport() {
    if (reportState === "submitting") return;
    try {
      setReportState("submitting");
      const response = await fetch("/api/product-issue-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asin: product.asin,
          reason,
          details,
          pagePath: window.location.pathname,
        }),
      });
      if (!response.ok) throw new Error("report_failed");
      setReportState("success");
      setDetails("");
      window.setTimeout(() => {
        setReportOpen(false);
        setReportState("idle");
      }, 1200);
    } catch (error) {
      console.error("buybox_report_failed", error);
      setReportState("error");
    }
  }

  return (
    <>
      <div className="rounded-[12px] border border-[#D5D9D9] bg-white p-4 shadow-sm md:p-5 lg:sticky lg:top-[88px]">
        {/* Preço */}
        {hasPrice ? (
          <div className="border-b border-[#ECECEC] pb-4">
            {hasReferencePrice ? (
              <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-[#CC0C39] px-2 py-0.5 text-[12px] font-bold text-white">
                -{product.discountPercent}%
                <span className="font-semibold">abaixo da média</span>
              </div>
            ) : null}
            <div className="flex items-end gap-1.5 font-variant-numeric-tabular">
              <span className="pb-[6px] text-[15px] leading-none text-[#0F1111]">R$</span>
              <span className="text-[40px] font-bold leading-none text-[#0F1111]">{whole}</span>
              <span className="pb-[6px] text-[16px] leading-none text-[#0F1111]">,{cents}</span>
            </div>
            {hasReferencePrice ? (
              <p className="mt-2 text-[13px] text-[#565959]">
                Média dos últimos 30 dias:{" "}
                <span className="line-through">{formatCurrency(product.averagePrice30d)}</span>
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[10px] border border-[#FECACA] bg-[#FFF5F5] px-3 py-3 text-[15px] font-bold text-[#B42318]">
            Produto sem estoque no momento
          </div>
        )}

        {/* Disponibilidade */}
        {hasPrice ? (
          <p className="mt-3 text-[14px] font-bold text-[#007600]">Em estoque</p>
        ) : null}

        {/* CTA dominante */}
        <div className="mt-4">
          <TrackedDealLink
            asin={product.asin}
            href={product.url}
            productId={product.id}
            productName={product.name}
            value={product.totalPrice}
            category={category}
            disabled={!hasPrice}
            className={`flex w-full items-center justify-center rounded-[10px] border border-[#FCD200] bg-[#FFD814] px-4 py-3.5 text-center text-[16px] font-bold text-[#0F1111] shadow-sm transition hover:bg-[#F7CA00] ${
              hasPrice ? "" : "cursor-not-allowed opacity-50"
            }`}
          >
            Ver oferta na Amazon
          </TrackedDealLink>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] text-[#565959]">
            <Truck className="h-3.5 w-3.5" />
            Você será levado ao site da Amazon para concluir a compra
          </p>
        </div>

        {/* Histórico de preço — diferencial em destaque */}
        <div className="mt-4">
          <PriceHistoryButton
            productId={product.id}
            productName={product.name}
            createdAt={product.createdAt}
            triggerLabel="Ver histórico de preço"
          />
        </div>

        {/* Ações secundárias (rebaixadas) */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-[#ECECEC] pt-4">
          <button
            type="button"
            onClick={() => void handleToggleSave()}
            className={`inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] border px-3 text-[13px] font-semibold transition ${
              saved
                ? "border-[#f0c14b] bg-[#fff7d6] text-[#b77900]"
                : "border-[#d9dee3] bg-white text-[#0F1111] hover:bg-[#F8FAFA]"
            }`}
          >
            <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
            {saved ? "Salvo" : "Salvar"}
          </button>

          <ProductShareInlineButton
            productShareKey={product.asin}
            productName={product.name}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-[8px] border border-[#d9dee3] bg-white px-3 text-[13px] font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA]"
            iconClassName="h-4 w-4"
            ariaLabel="Compartilhar produto"
            label="Compartilhar"
          />
        </div>

        {/* Confiança + reportar (de-emphasized) */}
        <div className="mt-4 flex items-start gap-2 rounded-[8px] bg-[#F7F8F8] px-3 py-2.5 text-[12px] leading-5 text-[#565959]">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#007600]" />
          <span>Monitoramos o preço deste produto diariamente para te mostrar quando vale a pena comprar.</span>
        </div>

        <button
          type="button"
          onClick={() => {
            setReportOpen(true);
            setReportState("idle");
          }}
          className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#565959] transition hover:text-[#0F1111]"
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Reportar um problema
        </button>
      </div>

      {/* Modal: reportar */}
      {reportOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4"
          onClick={() => {
            setReportOpen(false);
            setReportState("idle");
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Reportar problema"
        >
          <div
            className="w-full max-w-md rounded-[10px] border border-[#D5D9D9] bg-white p-5 shadow-[0_16px_40px_rgba(0,0,0,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-gray-900">Reportar problema</h3>
                <p className="mt-1 text-sm text-gray-500">{product.name}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setReportOpen(false);
                  setReportState("idle");
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-[#d9dee3] bg-white text-[#0F1111] transition hover:bg-[#F8FAFA]"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {REPORT_REASONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setReason(option)}
                    className={`rounded-md border px-3 py-2 text-left text-[13px] font-semibold transition ${
                      reason === option
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>

              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Detalhe opcional"
                className="w-full rounded-md border border-[#D0D5DD] px-3 py-2 text-[13px] text-[#0F1111] outline-none transition placeholder:text-gray-400 focus:border-blue-300"
              />

              {reportState === "success" ? (
                <p className="flex items-center gap-1.5 text-sm font-semibold text-green-600">
                  <Check className="h-4 w-4" /> Problema registrado.
                </p>
              ) : null}
              {reportState === "error" ? (
                <p className="text-sm font-semibold text-red-600">Falha ao enviar. Tente de novo.</p>
              ) : null}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setReportOpen(false);
                    setReportState("idle");
                  }}
                  className={accountSecondaryButtonClass + " px-4"}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitReport}
                  disabled={reportState === "submitting"}
                  className={accountPrimaryButtonClass + " px-4 disabled:cursor-not-allowed disabled:opacity-60"}
                >
                  {reportState === "submitting" ? "Enviando..." : "Enviar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Modal: conta não verificada */}
      {accountAlert ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 px-4"
          onClick={() => setAccountAlert(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Confirmação pendente"
        >
          <div
            className="w-full max-w-md rounded-[10px] border border-[#D5D9D9] bg-white p-6 shadow-[0_16px_40px_rgba(0,0,0,0.22)]"
            onClick={(event) => event.stopPropagation()}
          >
            <h4 className="text-[18px] font-black text-[#0F1111]">Confirmação pendente</h4>
            <p className="mt-3 text-sm leading-6 text-[#565959]">{UNVERIFIED_ACCOUNT_MESSAGE}</p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setAccountAlert(null)}
                className="rounded-md px-4 py-2 text-[13px] font-semibold text-[#2162A1] hover:text-[#174e87]"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={() => router.push("/minha-conta")}
                className={accountPrimaryButtonClass + " px-4"}
              >
                Ir para minha conta
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <AccountListPickerModal
        open={listPickerOpen}
        productId={product.id}
        productName={product.name}
        selectionMode="single"
        actionLabel="Salvar"
        onConfirmSingleList={async (list) => {
          const result = await toggleAccountFavorite(product.id, true, list.id);
          if (result.unauthorized) {
            router.push("/entrar");
            return;
          }
          if ("unverified" in result && result.unverified) {
            setAccountAlert("unverified");
            return;
          }
          if (result.ok) {
            confirmSaved(result.list?.title ?? list.title);
          }
        }}
        onClose={() => setListPickerOpen(false)}
      />
    </>
  );
}

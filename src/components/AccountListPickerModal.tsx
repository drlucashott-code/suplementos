"use client";

import { Check, ListPlus, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { toggleAccountFavorite } from "@/lib/client/accountFavorites";
import {
  accountIconButtonClass,
  accountPrimaryButtonClass,
  accountSecondaryButtonClass,
} from "@/components/account/accountUi";

type AccountListItem = {
  id: string;
  title: string;
  isDefault: boolean;
  itemsCount: number;
};

type AccountListPickerModalProps = {
  open: boolean;
  productName: string;
  productId?: string;
  monitoredProductId?: string;
  initialSelectedListIds?: string[];
  selectionMode?: "single" | "multiple";
  actionLabel?: string;
  onConfirmSingleList?: (list: AccountListItem) => Promise<void> | void;
  onClose: () => void;
};

export default function AccountListPickerModal({
  open,
  productId,
  monitoredProductId,
  productName,
  initialSelectedListIds,
  selectionMode = "multiple",
  actionLabel,
  onConfirmSingleList,
  onClose,
}: AccountListPickerModalProps) {
  const router = useRouter();
  const [lists, setLists] = useState<AccountListItem[]>([]);
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showCreateInput, setShowCreateInput] = useState(false);
  const [creatingListRequest, setCreatingListRequest] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");

  useEffect(() => {
    if (!open) return;

    let active = true;
    setLoading(true);
    setErrorMessage("");
    setShowCreateInput(false);
    setNewListTitle("");

    void fetch("/api/account/lists", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          ok?: boolean;
          lists?: AccountListItem[];
          error?: string;
        };

        if (!response.ok || !data.ok) {
          if (response.status === 401 || data.error === "unauthorized") {
            router.push("/entrar");
            return [];
          }
          throw new Error(data.error || "list_load_failed");
        }

        return data.lists ?? [];
      })
      .then((items) => {
        if (!active) return;

        setLists(items);
        const knownIds = new Set(items.map((item) => item.id));

        if (initialSelectedListIds?.length) {
          const initialSelection = initialSelectedListIds.filter((id) => knownIds.has(id));
          if (initialSelection.length > 0) {
            setSelectedListIds(initialSelection);
            return;
          }
        }

        const defaultList = items.find((item) => item.isDefault) ?? items[0] ?? null;
        setSelectedListIds(defaultList ? [defaultList.id] : []);
      })
      .catch((error) => {
        if (!active) return;
        console.error("list_picker_load_failed", error);
        setErrorMessage("Nao foi possivel carregar suas listas agora.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [open, router, initialSelectedListIds]);

  function toggleList(listId: string) {
    if (selectionMode === "single") {
      setSelectedListIds([listId]);
      return;
    }

    setSelectedListIds((current) =>
      current.includes(listId) ? current.filter((id) => id !== listId) : [...current, listId]
    );
  }

  async function createList() {
    const title = newListTitle.trim();
    if (title.length < 2) {
      setErrorMessage("Digite um nome para a lista.");
      return null;
    }

    setCreatingListRequest(true);
    setErrorMessage("");

    try {
      const response = await fetch("/api/account/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        list?: AccountListItem;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.list) {
        throw new Error(data.error || "list_create_failed");
      }

      setLists((current) => [data.list!, ...current]);
      setSelectedListIds([data.list!.id]);
      setNewListTitle("");
      setShowCreateInput(false);
      return data.list!;
    } catch (error) {
      console.error("list_picker_create_failed", error);
      setErrorMessage("Nao foi possivel criar a lista agora.");
      return null;
    } finally {
      setCreatingListRequest(false);
    }
  }

  async function addToSelectedLists() {
    if (selectedListIds.length === 0) {
      setErrorMessage("Escolha ao menos uma lista.");
      return;
    }

    if (!productId && !monitoredProductId) {
      setErrorMessage("Nao foi possivel identificar o produto.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const selectedLists = lists.filter((list) => selectedListIds.includes(list.id));
      const createdLists: string[] = [];
      const existingLists: string[] = [];

      for (const list of selectedLists) {
        const response = await fetch(`/api/account/lists/${list.id}/items`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId, monitoredProductId }),
        });
        const data = (await response.json()) as {
          ok?: boolean;
          created?: boolean;
          error?: string;
        };

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "list_item_create_failed");
        }

        if (data.created) {
          createdLists.push(list.title);
        } else {
          existingLists.push(list.title);
        }
      }

      if (createdLists.length === 0 && existingLists.length > 0) {
        toast.error("Produto ja esta nesta lista.");
      } else if (existingLists.length > 0) {
        toast.success(
          `Adicionado em ${createdLists.length} lista${createdLists.length === 1 ? "" : "s"} e ja estava em ${existingLists.length} lista${existingLists.length === 1 ? "" : "s"}.`
        );
      } else {
        toast.success(`Adicionado em ${createdLists.length} lista${createdLists.length === 1 ? "" : "s"}.`);
      }

      onClose();
    } catch (error) {
      console.error("list_picker_add_failed", { productId, monitoredProductId, error });
      setErrorMessage(
        error instanceof Error ? error.message : "Nao foi possivel adicionar agora."
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmSingleSelection() {
    if (selectedListIds.length === 0) {
      setErrorMessage("Escolha uma lista.");
      return;
    }

    if (!productId && !monitoredProductId) {
      setErrorMessage("Nao foi possivel identificar o produto.");
      return;
    }

    const selectedList = lists.find((list) => list.id === selectedListIds[0]);
    if (!selectedList) {
      setErrorMessage("Escolha uma lista.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      onClose();

      if (onConfirmSingleList) {
        await onConfirmSingleList(selectedList);
      } else if (productId) {
        const result = await toggleAccountFavorite(productId, true, selectedList.id);
        if (!result.ok) {
          throw new Error("favorite_create_failed");
        }
        toast.success(`Salvo em ${selectedList.title}`);
      } else {
        throw new Error("invalid_product");
      }
    } catch (error) {
      console.error("list_picker_save_failed", { productId, monitoredProductId, error });
      setErrorMessage(
        error instanceof Error ? error.message : "Nao foi possivel adicionar agora."
      );
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-[10px] border border-[#D5D9D9] bg-white shadow-[0_16px_40px_rgba(0,0,0,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#EAECF0] px-4 py-3.5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#007185]">
              {selectionMode === "single" ? "Salvar em lista" : "Adicionar a outra lista"}
            </p>
            <h3 className="mt-2 text-[18px] font-black text-[#0F1111]">{productName}</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={accountIconButtonClass}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="px-4 pt-4 text-[13px] text-[#565959]">
          {selectionMode === "single"
            ? "Escolha a lista para salvar o produto."
            : "Escolha uma ou mais listas. O produto continua na lista selecionada e pode entrar em outras."}
        </p>

        <div className="mt-4 space-y-2 px-4">
          {loading ? (
            <div className="rounded-[10px] border border-dashed border-[#D0D5DD] px-4 py-5 text-[13px] text-[#667085]">
              Carregando listas...
            </div>
          ) : lists.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-[#D0D5DD] px-4 py-5 text-[13px] text-[#667085]">
              Voce ainda nao criou listas.
            </div>
          ) : (
            lists.map((list) => {
              const selected = selectedListIds.includes(list.id);

              return (
                <button
                  key={list.id}
                  type="button"
                  onClick={() => toggleList(list.id)}
                  className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition ${
                    selected
                      ? "border-[#FFD37A] bg-[#FFF9E8]"
                      : "border-[#D0D5DD] bg-white hover:bg-[#F8FAFA]"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-[#0F1111]">{list.title}</p>
                    <p className="text-xs text-[#667085]">
                      {list.itemsCount} produto{list.itemsCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  {selected ? <Check className="h-4 w-4 text-[#B77900]" /> : null}
                </button>
              );
            })
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 px-4">
          {showCreateInput ? (
            <div className="flex w-full items-center gap-2 rounded-md border border-[#D0D5DD] bg-white px-3 py-2.5">
              <input
                autoFocus
                value={newListTitle}
                onChange={(event) => setNewListTitle(event.target.value)}
                placeholder="Nome da nova lista"
                className="h-8 flex-1 border-0 p-0 text-[13px] outline-none"
              />
              <button
                type="button"
                onClick={() => void createList()}
                disabled={creatingListRequest}
                className={accountPrimaryButtonClass + " h-8 px-3 text-xs disabled:opacity-60"}
              >
                {creatingListRequest ? "Criando..." : "Criar"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreateInput(true)}
              className={accountSecondaryButtonClass + " h-9 gap-2 px-3 text-[12px]"}
            >
              <Plus className="h-3.5 w-3.5" />
              + Nova lista
            </button>
          )}
        </div>

        {errorMessage ? (
          <p className="mx-4 mt-3 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13px] text-[#B42318]">
            {errorMessage}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-end gap-3 border-t border-[#EAECF0] px-4 py-4">
          <button
            type="button"
            onClick={onClose}
            className={accountSecondaryButtonClass + " px-4"}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() =>
              void (selectionMode === "single" ? confirmSingleSelection() : addToSelectedLists())
            }
            disabled={saving || selectedListIds.length === 0 || loading}
            className={accountPrimaryButtonClass + " gap-2 px-4 disabled:opacity-60"}
          >
            <ListPlus className="h-4 w-4" />
            {saving
              ? selectionMode === "single"
                ? "Salvando..."
                : "Adicionando..."
              : actionLabel ??
                (selectionMode === "single" ? "Salvar" : "Adicionar")}
          </button>
        </div>
      </div>
    </div>
  );
}

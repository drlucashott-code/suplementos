"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type FavoriteEntry = {
  id: string;
  savedAt: string;
  product: {
    id: string;
    asin: string;
    name: string;
    totalPrice: number;
    imageUrl: string | null;
    url: string;
    averagePrice30d: number | null;
    category: {
      name: string;
      group: string;
      slug: string;
    };
  };
};

type ListEntry = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  itemsCount: number;
};

type SiteAccountWorkspaceProps = {
  favorites: FavoriteEntry[];
  lists: ListEntry[];
};

function formatCurrency(value: number | null) {
  if (!value || value <= 0) return "Sem preço";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function SiteAccountWorkspace({
  favorites: initialFavorites,
  lists: initialLists,
}: SiteAccountWorkspaceProps) {
  const router = useRouter();
  const [favorites, setFavorites] = useState(initialFavorites);
  const [lists, setLists] = useState(initialLists);
  const [listTitle, setListTitle] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [listPublic, setListPublic] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [listMessage, setListMessage] = useState("");
  const [suggestionText, setSuggestionText] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(null);

  const publicLists = useMemo(
    () => lists.filter((list) => list.isPublic),
    [lists]
  );

  async function createList(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingList(true);
    setListMessage("");

    try {
      const response = await fetch("/api/account/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: listTitle,
          description: listDescription,
          isPublic: listPublic,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string; list?: ListEntry };

      if (!response.ok || !data.ok || !data.list) {
        throw new Error(data.error || "list_create_failed");
      }

      const createdList: ListEntry = {
        id: data.list.id,
        slug: data.list.slug,
        title: data.list.title,
        description: data.list.description ?? null,
        isPublic: data.list.isPublic,
        itemsCount: 0,
      };

      setLists((current) => [
        createdList,
        ...current,
      ]);
      setListTitle("");
      setListDescription("");
      setListPublic(false);
      setListMessage("Lista criada com sucesso.");
    } catch (error) {
      console.error("create_list_failed", error);
      setListMessage("Não foi possível criar a lista agora.");
    } finally {
      setCreatingList(false);
    }
  }

  async function addFavoriteToList(listId: string, productId: string) {
    setPendingFavoriteId(`${listId}:${productId}`);

    try {
      const response = await fetch(`/api/account/lists/${listId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      const data = (await response.json()) as { ok?: boolean; created?: boolean };
      if (!response.ok || !data.ok) {
        throw new Error("list_item_create_failed");
      }

      setLists((current) =>
        current.map((list) =>
          list.id === listId
            ? {
                ...list,
                itemsCount: data.created ? list.itemsCount + 1 : list.itemsCount,
              }
            : list
        )
      );
      setListMessage(data.created ? "Produto adicionado à lista." : "Lista atualizada.");
    } catch (error) {
      console.error("add_to_list_failed", error);
      setListMessage("Não foi possível adicionar o produto à lista.");
    } finally {
      setPendingFavoriteId(null);
    }
  }

  async function removeFavorite(productId: string) {
    setPendingFavoriteId(`favorite:${productId}`);

    try {
      const response = await fetch("/api/account/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      const data = (await response.json()) as { ok?: boolean };
      if (!response.ok || !data.ok) {
        throw new Error("favorite_delete_failed");
      }

      setFavorites((current) => current.filter((favorite) => favorite.product.id !== productId));
    } catch (error) {
      console.error("remove_favorite_failed", error);
    } finally {
      setPendingFavoriteId(null);
    }
  }

  async function submitSuggestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuggesting(true);
    setSuggestionMessage("");

    try {
      const response = await fetch("/api/account/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: suggestionText }),
      });

      const data = (await response.json()) as { ok?: boolean };
      if (!response.ok || !data.ok) {
        throw new Error("suggestion_failed");
      }

      setSuggestionText("");
      setSuggestionMessage("Sugestão enviada para análise.");
      router.refresh();
    } catch (error) {
      console.error("suggestion_submit_failed", error);
      setSuggestionMessage("Não foi possível enviar sua sugestão agora.");
    } finally {
      setSuggesting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#d5d9d9] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#667085]">
            Favoritos
          </p>
          <p className="mt-3 text-4xl font-black text-[#0F1111]">{favorites.length}</p>
          <p className="mt-2 text-sm text-[#565959]">
            Produtos que você está acompanhando com a sua conta.
          </p>
        </div>

        <div className="rounded-2xl border border-[#d5d9d9] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#667085]">Listas</p>
          <p className="mt-3 text-4xl font-black text-[#0F1111]">{lists.length}</p>
          <p className="mt-2 text-sm text-[#565959]">
            Coleções para compartilhar, organizar ou montar compras por objetivo.
          </p>
        </div>

        <div className="rounded-2xl border border-[#d5d9d9] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#667085]">
            Listas públicas
          </p>
          <p className="mt-3 text-4xl font-black text-[#0F1111]">{publicLists.length}</p>
          <p className="mt-2 text-sm text-[#565959]">
            Conteúdo que já pode ser compartilhado com outros usuários.
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-[#d5d9d9] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-[#0F1111]">Favoritos da conta</h2>
              <p className="mt-1 text-sm text-[#565959]">
                Esse é o núcleo do sistema: daqui saem alertas, listas e histórico pessoal.
              </p>
            </div>

            <Link
              href="/salvos"
              className="rounded-xl border border-[#d5d9d9] px-4 py-2 text-sm font-semibold text-[#0F1111] transition hover:bg-[#F7FAFA]"
            >
              Ver página de salvos
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            {favorites.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-[#F8FAFA] px-4 py-8 text-center text-sm text-[#565959]">
                Nenhum favorito na conta ainda. Ao salvar produtos logado, eles passam a aparecer
                aqui.
              </div>
            ) : (
              favorites.map((favorite) => (
                <div
                  key={favorite.id}
                  className="rounded-2xl border border-gray-100 bg-[#FCFCFD] p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-[#0F1111]">{favorite.product.name}</p>
                      <p className="mt-1 text-sm text-[#565959]">
                        {favorite.product.category.name} · {formatCurrency(favorite.product.totalPrice)}
                        {favorite.product.averagePrice30d ? (
                          <> · média 30d {formatCurrency(favorite.product.averagePrice30d)}</>
                        ) : null}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {lists.map((list) => (
                        <button
                          key={list.id}
                          type="button"
                          onClick={() => addFavoriteToList(list.id, favorite.product.id)}
                          disabled={pendingFavoriteId === `${list.id}:${favorite.product.id}`}
                          className="rounded-xl border border-[#d5d9d9] px-3 py-2 text-xs font-semibold text-[#0F1111] transition hover:bg-white disabled:opacity-60"
                        >
                          {pendingFavoriteId === `${list.id}:${favorite.product.id}`
                            ? "Adicionando..."
                            : `Adicionar em ${list.title}`}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => removeFavorite(favorite.product.id)}
                        disabled={pendingFavoriteId === `favorite:${favorite.product.id}`}
                        className="rounded-xl border border-[#fecdca] bg-[#fef3f2] px-3 py-2 text-xs font-semibold text-[#B42318] transition hover:bg-[#fee4e2] disabled:opacity-60"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-[#d5d9d9] bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black text-[#0F1111]">Criar lista</h2>
            <p className="mt-1 text-sm text-[#565959]">
              Comece com listas simples para compartilhar ou organizar produtos por objetivo.
            </p>

            <form onSubmit={createList} className="mt-5 space-y-3">
              <input
                type="text"
                value={listTitle}
                onChange={(event) => setListTitle(event.target.value)}
                placeholder="Ex.: Wheys que quero testar"
                className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#f3a847]"
                required
              />

              <textarea
                value={listDescription}
                onChange={(event) => setListDescription(event.target.value)}
                rows={3}
                placeholder="Descrição opcional"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#f3a847]"
              />

              <label className="flex items-center gap-2 text-sm font-medium text-[#344054]">
                <input
                  type="checkbox"
                  checked={listPublic}
                  onChange={(event) => setListPublic(event.target.checked)}
                />
                Tornar lista pública e compartilhável
              </label>

              {listMessage ? (
                <p className="text-sm font-medium text-[#565959]">{listMessage}</p>
              ) : null}

              <button
                type="submit"
                disabled={creatingList}
                className="h-11 w-full rounded-xl bg-[#FFD814] text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00] disabled:opacity-70"
              >
                {creatingList ? "Criando..." : "Criar lista"}
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-[#d5d9d9] bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black text-[#0F1111]">Minhas listas</h2>
            <div className="mt-4 space-y-3">
              {lists.length === 0 ? (
                <p className="text-sm text-[#565959]">Você ainda não criou nenhuma lista.</p>
              ) : (
                lists.map((list) => (
                  <div key={list.id} className="rounded-2xl border border-gray-100 bg-[#FCFCFD] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-[#0F1111]">{list.title}</p>
                        <p className="mt-1 text-sm text-[#565959]">
                          {list.itemsCount} item(ns) · {list.isPublic ? "Pública" : "Privada"}
                        </p>
                      </div>

                      {list.isPublic ? (
                        <Link
                          href={`/listas/${list.slug}`}
                          className="rounded-xl border border-[#d5d9d9] px-3 py-2 text-xs font-semibold text-[#0F1111] transition hover:bg-white"
                        >
                          Abrir
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-[#d5d9d9] bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black text-[#0F1111]">Sugerir produto</h2>
            <p className="mt-1 text-sm text-[#565959]">
              Em vez de abrir cadastro livre logo de início, a sugestão entra em análise no admin.
            </p>

            <form onSubmit={submitSuggestion} className="mt-4 space-y-3">
              <textarea
                value={suggestionText}
                onChange={(event) => setSuggestionText(event.target.value)}
                rows={4}
                placeholder="Cole o link Amazon, ASIN ou descreva o produto que você quer ver no site."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-[#f3a847]"
                required
              />

              {suggestionMessage ? (
                <p className="text-sm font-medium text-[#565959]">{suggestionMessage}</p>
              ) : null}

              <button
                type="submit"
                disabled={suggesting}
                className="h-11 w-full rounded-xl border border-[#d5d9d9] bg-white text-sm font-black text-[#0F1111] transition hover:bg-[#F7FAFA] disabled:opacity-70"
              >
                {suggesting ? "Enviando..." : "Enviar sugestão"}
              </button>
            </form>
          </section>
        </div>
      </section>
    </div>
  );
}

export default SiteAccountWorkspace;

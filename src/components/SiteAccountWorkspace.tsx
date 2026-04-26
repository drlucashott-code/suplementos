"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Globe, Lock, Trash2, Upload, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import BestDealProductCard from "@/components/BestDealProductCard";
import { getOptimizedAmazonUrl } from "@/lib/utils";

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

type ListDetails = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  items: Array<{
    id: string;
    note: string | null;
    sortOrder: number;
    product: {
      id: string;
      asin: string;
      name: string;
      imageUrl: string | null;
      totalPrice: number;
      averagePrice30d: number | null;
      url: string;
      category: {
        name: string;
        group: string;
        slug: string;
      };
    };
  }>;
};

type SiteAccountWorkspaceProps = {
  currentUser: {
    id: string;
    email: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  };
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

function favoriteToCardItem(favorite: FavoriteEntry) {
  const averagePrice30d = favorite.product.averagePrice30d ?? favorite.product.totalPrice;
  const discountPercent =
    averagePrice30d > favorite.product.totalPrice
      ? Math.round(((averagePrice30d - favorite.product.totalPrice) / averagePrice30d) * 100)
      : 0;

  return {
    id: favorite.product.id,
    asin: favorite.product.asin,
    name: favorite.product.name,
    imageUrl: favorite.product.imageUrl ?? "",
    url: favorite.product.url,
    totalPrice: favorite.product.totalPrice,
    averagePrice30d,
    discountPercent,
    ratingAverage: null,
    ratingCount: null,
    likeCount: 0,
    dislikeCount: 0,
    categoryName: favorite.product.category.name,
    categoryGroup: favorite.product.category.group,
    categorySlug: favorite.product.category.slug,
    savedAt: favorite.savedAt,
    attributes: {},
  };
}

export function SiteAccountWorkspace({
  currentUser,
  favorites: initialFavorites,
  lists: initialLists,
}: SiteAccountWorkspaceProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropPreviewRef = useRef<HTMLImageElement | null>(null);
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
  const [openListId, setOpenListId] = useState<string | null>(null);
  const [listDetailsMap, setListDetailsMap] = useState<Record<string, ListDetails>>({});
  const [loadingListId, setLoadingListId] = useState<string | null>(null);
  const [pendingListAction, setPendingListAction] = useState<string | null>(null);
  const [profileDisplayName, setProfileDisplayName] = useState(currentUser.displayName);
  const [profileUsername, setProfileUsername] = useState(currentUser.username ?? "");
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState(currentUser.avatarUrl ?? "");
  const [profileMessage, setProfileMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropImageSize, setCropImageSize] = useState({ width: 0, height: 0 });

  const publicLists = useMemo(() => lists.filter((list) => list.isPublic), [lists]);
  const favoriteCards = useMemo(() => favorites.map(favoriteToCardItem), [favorites]);
  const openedList = openListId ? listDetailsMap[openListId] ?? null : null;

  useEffect(() => {
    if (!cropSource) {
      setCropZoom(1);
      setCropX(0);
      setCropY(0);
      setCropImageSize({ width: 0, height: 0 });
    }
  }, [cropSource]);

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage("");

    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: profileDisplayName,
          username: profileUsername,
          email: profileEmail,
          avatarUrl: profileAvatarUrl,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "profile_update_failed");
      }

      setProfileMessage("Perfil atualizado com sucesso.");
      router.refresh();
    } catch (error) {
      console.error("profile_update_failed", error);
      setProfileMessage(
        error instanceof Error && error.message && error.message !== "profile_update_failed"
          ? error.message
          : "Não foi possível atualizar o perfil agora."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  function openAvatarPicker() {
    fileInputRef.current?.click();
  }

  function handleAvatarFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setCropSource(reader.result);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function applyAvatarCrop() {
    if (!cropSource || !cropPreviewRef.current) return;

    const image = cropPreviewRef.current;
    const canvas = document.createElement("canvas");
    const size = 320;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return;

    const scale = cropZoom;
    const drawWidth = cropImageSize.width * scale;
    const drawHeight = cropImageSize.height * scale;
    const offsetX = (size - drawWidth) / 2 + cropX;
    const offsetY = (size - drawHeight) / 2 + cropY;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setProfileAvatarUrl(dataUrl);
    setCropSource(null);
    setProfileMessage("Imagem pronta. Agora é só clicar em salvar perfil.");
  }

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

      setLists((current) => [createdList, ...current]);
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

      setListDetailsMap((current) => {
        const details = current[listId];
        if (!details || !data.created) return current;
        const favorite = favorites.find((item) => item.product.id === productId);
        if (!favorite) return current;

        return {
          ...current,
          [listId]: {
            ...details,
            items: [
              ...details.items,
              {
                id: `${listId}:${productId}`,
                note: null,
                sortOrder: details.items.length,
                product: favorite.product,
              },
            ],
          },
        };
      });

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

  async function loadListDetails(listId: string) {
    setLoadingListId(listId);
    setListMessage("");

    try {
      const response = await fetch(`/api/account/lists/${listId}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as { ok?: boolean; list?: ListDetails };

      if (!response.ok || !data.ok || !data.list) {
        throw new Error("list_load_failed");
      }

      setListDetailsMap((current) => ({
        ...current,
        [listId]: data.list!,
      }));
      setOpenListId(listId);
    } catch (error) {
      console.error("list_load_failed", error);
      setListMessage("Não foi possível abrir a lista agora.");
    } finally {
      setLoadingListId(null);
    }
  }

  async function toggleListPublic(listId: string, nextValue: boolean) {
    setPendingListAction(`visibility:${listId}`);
    setListMessage("");

    try {
      const response = await fetch(`/api/account/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: nextValue }),
      });

      const data = (await response.json()) as { ok?: boolean; list?: ListEntry };
      if (!response.ok || !data.ok || !data.list) {
        throw new Error("list_visibility_failed");
      }

      setLists((current) =>
        current.map((list) =>
          list.id === listId ? { ...list, isPublic: data.list!.isPublic } : list
        )
      );
      setListDetailsMap((current) => {
        const details = current[listId];
        if (!details) return current;
        return {
          ...current,
          [listId]: {
            ...details,
            isPublic: data.list!.isPublic,
          },
        };
      });
      setListMessage(
        data.list.isPublic ? "Lista pública ativada." : "Lista agora está privada."
      );
    } catch (error) {
      console.error("toggle_list_public_failed", error);
      setListMessage("Não foi possível atualizar a visibilidade da lista.");
    } finally {
      setPendingListAction(null);
    }
  }

  async function removeListItem(listId: string, productId: string) {
    setPendingListAction(`item:${listId}:${productId}`);
    setListMessage("");

    try {
      const response = await fetch(`/api/account/lists/${listId}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = (await response.json()) as { ok?: boolean };

      if (!response.ok || !data.ok) {
        throw new Error("list_item_delete_failed");
      }

      setLists((current) =>
        current.map((list) =>
          list.id === listId
            ? { ...list, itemsCount: Math.max(0, list.itemsCount - 1) }
            : list
        )
      );
      setListDetailsMap((current) => {
        const details = current[listId];
        if (!details) return current;
        return {
          ...current,
          [listId]: {
            ...details,
            items: details.items.filter((item) => item.product.id !== productId),
          },
        };
      });
      setListMessage("Produto removido da lista.");
    } catch (error) {
      console.error("remove_list_item_failed", error);
      setListMessage("Não foi possível remover o produto da lista.");
    } finally {
      setPendingListAction(null);
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
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileChange}
      />

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#d5d9d9] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#667085]">
            Favoritos
          </p>
          <p className="mt-3 text-4xl font-black text-[#0F1111]">{favorites.length}</p>
          <p className="mt-2 text-sm text-[#565959]">
            Os mesmos produtos salvos que você acompanha na sua conta.
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
        <div className="space-y-6">
          <div className="rounded-3xl border border-[#d5d9d9] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#0F1111]">Produtos salvos</h2>
                <p className="mt-1 text-sm text-[#565959]">
                  Aqui ficam os mesmos favoritos da sua conta, já no visual de card para acompanhar preço e desconto.
                </p>
              </div>

              <Link
                href="/salvos"
                className="rounded-xl border border-[#d5d9d9] px-4 py-2 text-sm font-semibold text-[#0F1111] transition hover:bg-[#F7FAFA]"
              >
                Ver página de salvos
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {favorites.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-[#F8FAFA] px-4 py-8 text-center text-sm text-[#565959]">
                  Nenhum favorito na conta ainda. Ao salvar produtos logado, eles passam a aparecer aqui.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                    {favoriteCards.map((favoriteCard) => (
                      <BestDealProductCard
                        key={favoriteCard.asin}
                        item={favoriteCard}
                        category="salvos"
                      />
                    ))}
                  </div>

                  <div className="space-y-3">
                    {favorites.map((favorite) => (
                      <div key={favorite.id} className="rounded-2xl border border-gray-100 bg-[#FCFCFD] p-4">
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
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <section className="rounded-3xl border border-[#d5d9d9] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-[#0F1111]">Minhas listas</h2>
                <p className="mt-1 text-sm text-[#565959]">
                  Abra uma lista para gerenciar os produtos, remover itens e definir se ela é pública.
                </p>
              </div>
            </div>

            {listMessage ? (
              <p className="mt-4 rounded-xl bg-[#F8FAFA] px-4 py-3 text-sm font-medium text-[#565959]">
                {listMessage}
              </p>
            ) : null}

            <div className="mt-4 space-y-3">
              {lists.length === 0 ? (
                <p className="text-sm text-[#565959]">Você ainda não criou nenhuma lista.</p>
              ) : (
                lists.map((list) => (
                  <div key={list.id} className="rounded-2xl border border-gray-100 bg-[#FCFCFD] p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-black text-[#0F1111]">{list.title}</p>
                        <p className="mt-1 text-sm text-[#565959]">
                          {list.itemsCount} item(ns) · {list.isPublic ? "Pública" : "Privada"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {list.isPublic ? (
                          <Link
                            href={`/listas/${list.slug}`}
                            className="rounded-xl border border-[#d5d9d9] px-3 py-2 text-xs font-semibold text-[#0F1111] transition hover:bg-white"
                          >
                            Ver pública
                          </Link>
                        ) : null}

                        <button
                          type="button"
                          onClick={() =>
                            openListId === list.id ? setOpenListId(null) : void loadListDetails(list.id)
                          }
                          disabled={loadingListId === list.id}
                          className="rounded-xl border border-[#d5d9d9] px-3 py-2 text-xs font-semibold text-[#0F1111] transition hover:bg-white disabled:opacity-60"
                        >
                          {loadingListId === list.id
                            ? "Abrindo..."
                            : openListId === list.id
                              ? "Fechar"
                              : "Abrir"}
                        </button>
                      </div>
                    </div>

                    {openListId === list.id && openedList ? (
                      <div className="mt-5 space-y-5 border-t border-gray-200 pt-5">
                        <div className="flex flex-col gap-3 rounded-2xl border border-[#d5d9d9] bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-sm font-black text-[#0F1111]">{openedList.title}</p>
                            <p className="mt-1 text-sm text-[#565959]">
                              {openedList.description || "Sem descrição."}
                            </p>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              onClick={() => toggleListPublic(openedList.id, !openedList.isPublic)}
                              disabled={pendingListAction === `visibility:${openedList.id}`}
                              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-60 ${
                                openedList.isPublic
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border border-gray-200 bg-white text-[#0F1111]"
                              }`}
                            >
                              {openedList.isPublic ? (
                                <Globe className="h-4 w-4" />
                              ) : (
                                <Lock className="h-4 w-4" />
                              )}
                              {pendingListAction === `visibility:${openedList.id}`
                                ? "Salvando..."
                                : openedList.isPublic
                                  ? "Lista pública"
                                  : "Lista privada"}
                            </button>

                            {openedList.isPublic ? (
                              <Link
                                href={`/listas/${openedList.slug}`}
                                className="inline-flex items-center gap-2 rounded-xl border border-[#d5d9d9] px-4 py-2 text-sm font-semibold text-[#0F1111] transition hover:bg-[#F7FAFA]"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Abrir página
                              </Link>
                            ) : null}
                          </div>
                        </div>

                        {openedList.items.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-gray-200 bg-[#F8FAFA] px-4 py-8 text-center text-sm text-[#565959]">
                            Essa lista ainda não tem produtos.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {openedList.items.map((item) => (
                              <div
                                key={item.id}
                                className="rounded-2xl border border-[#d5d9d9] bg-white p-4 shadow-sm"
                              >
                                <div className="flex gap-4">
                                  <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-white">
                                    {item.product.imageUrl ? (
                                      <Image
                                        src={getOptimizedAmazonUrl(item.product.imageUrl, 220)}
                                        alt={item.product.name}
                                        fill
                                        sizes="96px"
                                        className="object-contain p-2"
                                        unoptimized
                                      />
                                    ) : null}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="line-clamp-2 text-sm font-black text-[#0F1111]">
                                      {item.product.name}
                                    </p>
                                    <p className="mt-1 text-sm text-[#565959]">
                                      {item.product.category.name}
                                    </p>
                                    <p className="mt-2 text-lg font-black text-[#0F1111]">
                                      {formatCurrency(item.product.totalPrice)}
                                    </p>
                                    {item.product.averagePrice30d ? (
                                      <p className="mt-1 text-xs text-[#565959]">
                                        Média 30d {formatCurrency(item.product.averagePrice30d)}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>

                                {item.note ? (
                                  <p className="mt-3 rounded-xl bg-[#F8FAFA] px-3 py-2 text-sm text-[#344054]">
                                    {item.note}
                                  </p>
                                ) : null}

                                <div className="mt-4 flex flex-wrap gap-2">
                                  <a
                                    href={item.product.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-xl border border-[#d5d9d9] px-3 py-2 text-xs font-semibold text-[#0F1111] transition hover:bg-[#F7FAFA]"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Ver na Amazon
                                  </a>

                                  <button
                                    type="button"
                                    onClick={() => removeListItem(openedList.id, item.product.id)}
                                    disabled={pendingListAction === `item:${openedList.id}:${item.product.id}`}
                                    className="inline-flex items-center gap-2 rounded-xl border border-[#fecdca] bg-[#fef3f2] px-3 py-2 text-xs font-semibold text-[#B42318] transition hover:bg-[#fee4e2] disabled:opacity-60"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {pendingListAction === `item:${openedList.id}:${item.product.id}`
                                      ? "Removendo..."
                                      : "Excluir produto"}
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-[#d5d9d9] bg-white p-5 shadow-sm">
            <h2 className="text-2xl font-black text-[#0F1111]">Perfil público</h2>
            <p className="mt-1 text-sm text-[#565959]">
              O nome e o username aparecem nos comentários como Nome @username.
            </p>

            <form onSubmit={saveProfile} className="mt-5 space-y-3">
              <div className="flex items-center gap-3 rounded-2xl border border-[#d5d9d9] bg-[#F8FAFA] p-3">
                {profileAvatarUrl ? (
                  <Image
                    src={profileAvatarUrl}
                    alt={profileDisplayName || "Avatar"}
                    width={56}
                    height={56}
                    className="h-14 w-14 rounded-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-xs font-bold text-[#667085]">
                    Sem foto
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-[#0F1111]">Imagem do perfil</p>
                  <p className="mt-1 text-xs text-[#565959]">
                    Faça upload, ajuste o recorte quadrado e salve.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openAvatarPicker}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#d5d9d9] bg-white px-3 py-2 text-sm font-semibold text-[#0F1111] transition hover:bg-[#F7FAFA]"
                >
                  <Upload className="h-4 w-4" />
                  Enviar imagem
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={profileDisplayName}
                  onChange={(event) => setProfileDisplayName(event.target.value)}
                  placeholder="Nome"
                  className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#f3a847]"
                  required
                />
                <input
                  type="text"
                  value={profileUsername}
                  onChange={(event) => setProfileUsername(event.target.value)}
                  placeholder="username"
                  className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#f3a847]"
                  required
                />
              </div>

              <input
                type="email"
                value={profileEmail}
                onChange={(event) => setProfileEmail(event.target.value)}
                placeholder="Email"
                className="h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none transition focus:border-[#f3a847]"
                required
              />

              {profileMessage ? (
                <p className="text-sm font-medium text-[#565959]">{profileMessage}</p>
              ) : null}

              <button
                type="submit"
                disabled={savingProfile}
                className="h-11 w-full rounded-xl border border-[#d5d9d9] bg-white text-sm font-black text-[#0F1111] transition hover:bg-[#F7FAFA] disabled:opacity-70"
              >
                {savingProfile ? "Salvando..." : "Salvar perfil"}
              </button>
            </form>
          </section>

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

      {cropSource ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 px-4"
          onClick={() => setCropSource(null)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-[#0F1111]">Ajustar foto do perfil</h3>
                <p className="mt-1 text-sm text-[#565959]">
                  Posicione a imagem dentro da área quadrada que será usada como ícone.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCropSource(null)}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-5 md:grid-cols-[1fr_220px]">
              <div>
                <div className="relative mx-auto h-[320px] w-[320px] overflow-hidden rounded-3xl bg-[#F3F4F6] shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={cropPreviewRef}
                    src={cropSource}
                    alt="Recorte do avatar"
                    className="absolute left-1/2 top-1/2 max-w-none select-none"
                    style={{
                      width: cropImageSize.width ? `${cropImageSize.width * cropZoom}px` : "auto",
                      height: cropImageSize.height ? `${cropImageSize.height * cropZoom}px` : "auto",
                      transform: `translate(calc(-50% + ${cropX}px), calc(-50% + ${cropY}px))`,
                    }}
                    onLoad={(event) => {
                      const element = event.currentTarget;
                      const baseSize = 320;
                      const scale = Math.max(baseSize / element.naturalWidth, baseSize / element.naturalHeight);
                      setCropImageSize({
                        width: element.naturalWidth * scale,
                        height: element.naturalHeight * scale,
                      });
                    }}
                    draggable={false}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#344054]">Zoom</label>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.01}
                    value={cropZoom}
                    onChange={(event) => setCropZoom(Number(event.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#344054]">Horizontal</label>
                  <input
                    type="range"
                    min={-160}
                    max={160}
                    step={1}
                    value={cropX}
                    onChange={(event) => setCropX(Number(event.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#344054]">Vertical</label>
                  <input
                    type="range"
                    min={-160}
                    max={160}
                    step={1}
                    value={cropY}
                    onChange={(event) => setCropY(Number(event.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="rounded-2xl border border-[#d5d9d9] bg-[#F8FAFA] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">
                    Prévia do ícone
                  </p>
                  <div className="mt-3 flex justify-center">
                    <div className="relative h-16 w-16 overflow-hidden rounded-full border border-white bg-white shadow">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cropSource}
                        alt="Prévia do avatar"
                        className="absolute left-1/2 top-1/2 max-w-none"
                        style={{
                          width: cropImageSize.width ? `${cropImageSize.width * cropZoom * 0.2}px` : "auto",
                          height: cropImageSize.height ? `${cropImageSize.height * cropZoom * 0.2}px` : "auto",
                          transform: `translate(calc(-50% + ${cropX * 0.2}px), calc(-50% + ${cropY * 0.2}px))`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCropSource(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[#2162A1] hover:text-[#174e87]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyAvatarCrop}
                className="rounded-xl bg-[#FFD814] px-4 py-2 text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00]"
              >
                Usar esta imagem
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default SiteAccountWorkspace;

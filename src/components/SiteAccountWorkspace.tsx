"use client";

import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ExternalLink,
  Globe,
  GripVertical,
  Heart,
  ListPlus,
  Lock,
  MessageCircle,
  PencilLine,
  Plus,
  Shield,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BestDealProductCard from "@/components/BestDealProductCard";

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
    availabilityStatus?: string | null;
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

type SavedListEntry = ListEntry & {
  ownerDisplayName: string;
  ownerUsername: string | null;
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

type ActivityItem = {
  id: string;
  title?: string;
  body: string | null;
  href: string;
  createdAt: string;
  productName?: string;
};

type SiteAccountWorkspaceProps = {
  currentUser: {
    id: string;
    email: string;
    displayName: string;
    username: string | null;
    avatarUrl: string | null;
  };
  profileStats: {
    memberSince: string;
    commentsCount: number;
    commentReactionsCount: number;
  };
  favorites: FavoriteEntry[];
  lists: ListEntry[];
  savedLists: SavedListEntry[];
};

type ListFormState = {
  title: string;
  description: string;
};

function formatDate(dateIso: string) {
  return new Date(dateIso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatRelativeTime(dateIso: string) {
  const diffMs = Date.now() - new Date(dateIso).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} d`;
}

function favoriteToCardItem(favorite: FavoriteEntry) {
  const averagePrice30d = favorite.product.averagePrice30d ?? favorite.product.totalPrice;
  const discountPercent =
    averagePrice30d > favorite.product.totalPrice && favorite.product.totalPrice > 0
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
    attributes: {
      availabilityStatus: favorite.product.availabilityStatus ?? "",
    },
  };
}

function createInitialListForms(lists: ListEntry[]) {
  return lists.reduce<Record<string, ListFormState>>((accumulator, list) => {
    accumulator[list.id] = {
      title: list.title,
      description: list.description ?? "",
    };
    return accumulator;
  }, {});
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export default function SiteAccountWorkspace({
  currentUser,
  profileStats,
  favorites: initialFavorites,
  lists: initialLists,
  savedLists: initialSavedLists,
}: SiteAccountWorkspaceProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropPreviewRef = useRef<HTMLImageElement | null>(null);

  const [favorites, setFavorites] = useState(initialFavorites);
  const [lists, setLists] = useState(initialLists);
  const [savedLists, setSavedLists] = useState(initialSavedLists);
  const [listDetailsMap, setListDetailsMap] = useState<Record<string, ListDetails>>({});
  const [openListId, setOpenListId] = useState<string | null>(null);
  const [loadingListId, setLoadingListId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [workspaceMessage, setWorkspaceMessage] = useState("");

  const [showProfileEditor, setShowProfileEditor] = useState(false);
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

  const [showCreateList, setShowCreateList] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [listDescription, setListDescription] = useState("");
  const [listPublic, setListPublic] = useState(false);
  const [creatingList, setCreatingList] = useState(false);

  const [selectedListId, setSelectedListId] = useState<string | null>(initialLists[0]?.id ?? null);
  const [selectedFavoriteIds, setSelectedFavoriteIds] = useState<string[]>([]);
  const [listPickerOpen, setListPickerOpen] = useState(false);

  const [listEditorId, setListEditorId] = useState<string | null>(null);
  const [listForms, setListForms] = useState<Record<string, ListFormState>>(
    createInitialListForms(initialLists)
  );
  const [draggingProductId, setDraggingProductId] = useState<string | null>(null);
  const [listTab, setListTab] = useState<"mine" | "saved">("mine");

  const [activityMode, setActivityMode] = useState<"comments" | "reactions" | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityComments, setActivityComments] = useState<ActivityItem[]>([]);
  const [activityReactions, setActivityReactions] = useState<ActivityItem[]>([]);

  const favoriteCards = useMemo(() => favorites.map(favoriteToCardItem), [favorites]);
  const openedList = openListId ? listDetailsMap[openListId] ?? null : null;
  const selectedList = selectedListId ? lists.find((list) => list.id === selectedListId) : null;

  function setMessage(message: string) {
    setWorkspaceMessage(message);
  }

  async function loadActivity(mode: "comments" | "reactions") {
    setActivityMode(mode);
    if (activityComments.length > 0 || activityReactions.length > 0) {
      return;
    }

    setActivityLoading(true);
    try {
      const response = await fetch("/api/account/activity", { cache: "no-store" });
      const data = (await response.json()) as {
        ok?: boolean;
        comments?: ActivityItem[];
        reactions?: ActivityItem[];
      };

      if (!response.ok || !data.ok) {
        throw new Error("activity_load_failed");
      }

      setActivityComments(data.comments ?? []);
      setActivityReactions(data.reactions ?? []);
    } catch (error) {
      console.error("activity_load_failed", error);
      setMessage("Nao foi possivel carregar a atividade agora.");
    } finally {
      setActivityLoading(false);
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

    const drawWidth = cropImageSize.width * cropZoom;
    const drawHeight = cropImageSize.height * cropZoom;
    const offsetX = (size - drawWidth) / 2 + cropX;
    const offsetY = (size - drawHeight) / 2 + cropY;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setProfileAvatarUrl(dataUrl);
    setCropSource(null);
    setProfileMessage("Imagem pronta. Agora e so salvar o perfil.");
  }

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
      setProfileMessage("Nao foi possivel atualizar o perfil agora.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function sendPasswordResetLink() {
    setPendingAction("security:reset");
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: profileEmail }),
      });
      const data = (await response.json()) as { ok?: boolean };

      if (!response.ok || !data.ok) {
        throw new Error("forgot_password_failed");
      }

      setMessage("Enviamos um link para redefinir sua senha no email da conta.");
    } catch (error) {
      console.error("forgot_password_failed", error);
      setMessage("Nao foi possivel enviar o link de redefinicao agora.");
    } finally {
      setPendingAction(null);
    }
  }

  async function createList(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingList(true);
    setMessage("");

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

      setLists((current) => [data.list!, ...current]);
      setListForms((current) => ({
        ...current,
        [data.list!.id]: {
          title: data.list!.title,
          description: data.list!.description ?? "",
        },
      }));
      setSelectedListId((current) => current ?? data.list!.id);
      setListTitle("");
      setListDescription("");
      setListPublic(false);
      setShowCreateList(false);
      setMessage("Lista criada com sucesso.");
    } catch (error) {
      console.error("list_create_failed", error);
      setMessage("Nao foi possivel criar a lista agora.");
    } finally {
      setCreatingList(false);
    }
  }

  async function loadListDetails(listId: string) {
    setLoadingListId(listId);
    setMessage("");

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
      setMessage("Nao foi possivel abrir a lista agora.");
    } finally {
      setLoadingListId(null);
    }
  }

  async function openListEditor(listId: string) {
    await loadListDetails(listId);
    setListEditorId(listId);
  }

  async function toggleListPublic(listId: string, nextValue: boolean) {
    setPendingAction(`visibility:${listId}`);
    setMessage("");

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
      setMessage(data.list.isPublic ? "Lista publica ativada." : "Lista agora esta privada.");
    } catch (error) {
      console.error("toggle_list_public_failed", error);
      setMessage("Nao foi possivel atualizar a visibilidade da lista.");
    } finally {
      setPendingAction(null);
    }
  }

  async function saveListEdits(listId: string) {
    const form = listForms[listId];
    if (!form) return;

    setPendingAction(`edit:${listId}`);
    setMessage("");

    try {
      const response = await fetch(`/api/account/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; list?: ListEntry };
      if (!response.ok || !data.ok || !data.list) {
        throw new Error("list_edit_failed");
      }

      setLists((current) =>
        current.map((list) =>
          list.id === listId
            ? {
                ...list,
                title: data.list!.title,
                description: data.list!.description ?? null,
              }
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
            title: data.list!.title,
            description: data.list!.description ?? null,
          },
        };
      });
      setListEditorId(null);
      setMessage("Lista atualizada.");
    } catch (error) {
      console.error("list_edit_failed", error);
      setMessage("Nao foi possivel editar a lista.");
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteList(listId: string) {
    setPendingAction(`delete:${listId}`);
    setMessage("");

    try {
      const response = await fetch(`/api/account/lists/${listId}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { ok?: boolean };

      if (!response.ok || !data.ok) {
        throw new Error("list_delete_failed");
      }

      setLists((current) => current.filter((list) => list.id !== listId));
      setListDetailsMap((current) => {
        const next = { ...current };
        delete next[listId];
        return next;
      });
      if (openListId === listId) setOpenListId(null);
      if (listEditorId === listId) setListEditorId(null);
      if (selectedListId === listId) {
        const remaining = lists.filter((list) => list.id !== listId);
        setSelectedListId(remaining[0]?.id ?? null);
      }
      setMessage("Lista excluida.");
    } catch (error) {
      console.error("list_delete_failed", error);
      setMessage("Nao foi possivel excluir a lista.");
    } finally {
      setPendingAction(null);
    }
  }

  async function toggleSaveList(listId: string, isSaved: boolean) {
    setPendingAction(`save-list:${listId}`);
    setMessage("");

    try {
      const response = await fetch("/api/account/saved-lists", {
        method: isSaved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId }),
      });
      const data = (await response.json()) as { ok?: boolean };

      if (!response.ok || !data.ok) {
        throw new Error("save_list_failed");
      }

      if (isSaved) {
        setSavedLists((current) => current.filter((list) => list.id !== listId));
        setMessage("Lista removida das salvas.");
      } else {
        const sourceList = lists.find((list) => list.id === listId);
        if (sourceList) {
          setSavedLists((current) => [
            {
              ...sourceList,
              ownerDisplayName: currentUser.displayName,
              ownerUsername: currentUser.username,
            },
            ...current,
          ]);
        }
        setMessage("Lista salva.");
      }
    } catch (error) {
      console.error("save_list_failed", error);
      setMessage("Nao foi possivel atualizar a lista salva.");
    } finally {
      setPendingAction(null);
    }
  }

  async function addFavoriteToList(listId: string, productId: string) {
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
          ? { ...list, itemsCount: data.created ? list.itemsCount + 1 : list.itemsCount }
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
  }

  async function addSelectedFavoritesToList() {
    if (!selectedListId || selectedFavoriteIds.length === 0) {
      setMessage("Escolha uma lista e selecione pelo menos um produto.");
      return;
    }

    setPendingAction(`bulk-add:${selectedListId}`);
    setMessage("");

    try {
      for (const productId of selectedFavoriteIds) {
        await addFavoriteToList(selectedListId, productId);
      }
      setSelectedFavoriteIds([]);
      setListPickerOpen(false);
      setMessage("Produtos adicionados a lista.");
    } catch (error) {
      console.error("bulk_add_failed", error);
      setMessage("Nao foi possivel adicionar os produtos selecionados.");
    } finally {
      setPendingAction(null);
    }
  }

  function toggleFavoriteSelection(productId: string) {
    setSelectedFavoriteIds((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }

  async function removeFavorite(productId: string) {
    setPendingAction(`favorite:${productId}`);
    setMessage("");

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
      setSelectedFavoriteIds((current) => current.filter((id) => id !== productId));
      setMessage("Favorito removido.");
    } catch (error) {
      console.error("favorite_delete_failed", error);
      setMessage("Nao foi possivel remover o favorito.");
    } finally {
      setPendingAction(null);
    }
  }

  async function removeListItem(listId: string, productId: string) {
    setPendingAction(`item:${listId}:${productId}`);
    setMessage("");

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
          list.id === listId ? { ...list, itemsCount: Math.max(0, list.itemsCount - 1) } : list
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
      setMessage("Produto removido da lista.");
    } catch (error) {
      console.error("list_item_delete_failed", error);
      setMessage("Nao foi possivel remover o produto da lista.");
    } finally {
      setPendingAction(null);
    }
  }

  async function saveListOrder(listId: string, orderedProductIds: string[]) {
    setPendingAction(`reorder:${listId}`);
    setMessage("");

    try {
      const response = await fetch(`/api/account/lists/${listId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedProductIds }),
      });
      const data = (await response.json()) as { ok?: boolean };

      if (!response.ok || !data.ok) {
        throw new Error("list_reorder_failed");
      }

      setMessage("Ordem da lista atualizada.");
    } catch (error) {
      console.error("list_reorder_failed", error);
      setMessage("Nao foi possivel salvar a nova ordem.");
    } finally {
      setPendingAction(null);
    }
  }

  function handleDragStart(productId: string) {
    setDraggingProductId(productId);
  }

  async function handleDropOnItem(targetProductId: string) {
    if (!openListId || !draggingProductId || draggingProductId === targetProductId) return;
    const currentList = listDetailsMap[openListId];
    if (!currentList) return;

    const fromIndex = currentList.items.findIndex((item) => item.product.id === draggingProductId);
    const toIndex = currentList.items.findIndex((item) => item.product.id === targetProductId);
    if (fromIndex < 0 || toIndex < 0) return;

    const reorderedItems = moveItem(currentList.items, fromIndex, toIndex).map((item, index) => ({
      ...item,
      sortOrder: index,
    }));

    setListDetailsMap((current) => ({
      ...current,
      [openListId]: {
        ...currentList,
        items: reorderedItems,
      },
    }));
    setDraggingProductId(null);
    await saveListOrder(
      openListId,
      reorderedItems.map((item) => item.product.id)
    );
  }

  const isListSaved = (listId: string) => savedLists.some((list) => list.id === listId);

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarFileChange}
      />

      <section className="overflow-hidden rounded-[32px] border border-[#d5d9d9] bg-white shadow-sm">
        <div className="bg-[linear-gradient(135deg,#10131A_0%,#253243_52%,#384657_100%)] px-6 py-8 text-white md:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative">
                {profileAvatarUrl ? (
                  <Image
                    src={profileAvatarUrl}
                    alt={profileDisplayName || "Perfil"}
                    width={112}
                    height={112}
                    className="h-28 w-28 rounded-full border-4 border-white/15 object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white/15 bg-[#9F43BF] text-4xl font-black text-white">
                    {(profileDisplayName || currentUser.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}

                <button
                  type="button"
                  onClick={openAvatarPicker}
                  className="absolute bottom-1 right-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/70 bg-white text-[#FF8F1F] shadow-sm transition hover:scale-[1.02]"
                  aria-label="Trocar foto"
                >
                  <Upload className="h-4 w-4" />
                </button>
              </div>

              <div>
                <p className="text-sm font-bold uppercase tracking-[0.22em] text-[#FFD37A]">
                  Minha conta
                </p>
                <h2 className="mt-3 text-3xl font-black leading-tight text-white md:text-4xl">
                  {profileDisplayName}
                </h2>
                <p className="mt-2 text-xl font-semibold text-white/85">
                  @{profileUsername || "sem-username"}
                </p>
              </div>
            </div>

            <div className="w-full max-w-[320px] space-y-3">
              <button
                type="button"
                onClick={() => setShowProfileEditor((current) => !current)}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-5 text-sm font-bold text-white transition hover:bg-white/15"
              >
                <PencilLine className="h-4 w-4" />
                {showProfileEditor ? "Fechar edicao" : "Editar perfil"}
              </button>

              <div className="rounded-[28px] border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-white/75">
                  <Shield className="h-4 w-4 text-[#FFD37A]" />
                  Seguranca
                </div>
                <div className="mt-3 space-y-2">
                  <button
                    type="button"
                    onClick={sendPasswordResetLink}
                    disabled={pendingAction === "security:reset"}
                    className="inline-flex h-10 w-full items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
                  >
                    {pendingAction === "security:reset" ? "Enviando link..." : "Trocar senha"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/8 px-4 py-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-[#FFD37A]" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                    Membro desde
                  </p>
                  <p className="mt-1 text-lg font-black text-white">
                    {formatDate(profileStats.memberSince)}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadActivity("comments")}
              className="rounded-3xl border border-white/10 bg-white/8 px-4 py-4 text-left backdrop-blur-sm transition hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <MessageCircle className="h-5 w-5 text-[#FFD37A]" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                    Comentarios
                  </p>
                  <p className="mt-1 text-lg font-black text-white">
                    {profileStats.commentsCount}
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => void loadActivity("reactions")}
              className="rounded-3xl border border-white/10 bg-white/8 px-4 py-4 text-left backdrop-blur-sm transition hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <Heart className="h-5 w-5 text-[#FFD37A]" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/60">
                    Reacoes a comentarios
                  </p>
                  <p className="mt-1 text-lg font-black text-white">
                    {profileStats.commentReactionsCount}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {showProfileEditor ? (
          <div className="border-t border-[#EAECF0] px-6 py-6 md:px-8">
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#344054]">Nome</span>
                  <input
                    type="text"
                    value={profileDisplayName}
                    onChange={(event) => setProfileDisplayName(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-[#D0D5DD] px-4 text-sm outline-none transition focus:border-[#F3A847]"
                    required
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#344054]">Username</span>
                  <input
                    type="text"
                    value={profileUsername}
                    onChange={(event) => setProfileUsername(event.target.value)}
                    className="h-12 w-full rounded-2xl border border-[#D0D5DD] px-4 text-sm outline-none transition focus:border-[#F3A847]"
                    required
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#344054]">Email</span>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(event) => setProfileEmail(event.target.value)}
                  className="h-12 w-full rounded-2xl border border-[#D0D5DD] px-4 text-sm outline-none transition focus:border-[#F3A847]"
                  required
                />
              </label>

              {profileMessage ? (
                <p className="text-sm font-medium text-[#475467]">{profileMessage}</p>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={openAvatarPicker}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#D0D5DD] bg-white px-4 text-sm font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA]"
                >
                  <Upload className="h-4 w-4" />
                  Enviar imagem
                </button>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#FFD814] px-5 text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00] disabled:opacity-70"
                >
                  {savingProfile ? "Salvando..." : "Salvar perfil"}
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </section>

      {workspaceMessage ? (
        <div className="rounded-2xl border border-[#d5d9d9] bg-white px-4 py-3 text-sm font-medium text-[#475467] shadow-sm">
          {workspaceMessage}
        </div>
      ) : null}

      <section className="rounded-[32px] border border-[#d5d9d9] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#FF8F1F]">
              Favoritos
            </p>
            <h3 className="mt-2 text-3xl font-black text-[#0F1111]">Produtos acompanhados</h3>
            <p className="mt-2 max-w-3xl text-sm text-[#565959]">
              Acompanhe os produtos que voce salvou e organize tudo em listas quando quiser.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setListPickerOpen((current) => !current);
              setSelectedFavoriteIds([]);
            }}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#0F1111] px-4 text-sm font-bold text-[#0F1111] transition hover:bg-[#F8FAFA]"
          >
            <ListPlus className="h-4 w-4" />
            {listPickerOpen ? "Fechar listas" : "Adicionar a lista"}
          </button>
        </div>

        {listPickerOpen ? (
          <div className="mt-6 rounded-[28px] border border-[#E4E7EC] bg-[#FFF9E8] p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#B54708]">
                  Adicionar favoritos a uma lista
                </p>
                <p className="mt-2 text-sm text-[#7A271A]">
                  Escolha uma lista e clique nos produtos que voce quer incluir.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {lists.map((list) => (
                  <button
                    key={list.id}
                    type="button"
                    onClick={() => setSelectedListId(list.id)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                      selectedListId === list.id
                        ? "bg-[#FF8F1F] text-white"
                        : "border border-[#F3D6A3] bg-white text-[#7A271A]"
                    }`}
                  >
                    {list.title}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-[#F3D6A3] bg-white px-4 py-2 text-sm text-[#7A271A]">
                Lista atual: <span className="font-bold">{selectedList?.title ?? "Nenhuma"}</span>
              </div>
              <div className="rounded-full border border-[#F3D6A3] bg-white px-4 py-2 text-sm text-[#7A271A]">
                Selecionados: <span className="font-bold">{selectedFavoriteIds.length}</span>
              </div>
              <button
                type="button"
                onClick={addSelectedFavoritesToList}
                disabled={!selectedListId || selectedFavoriteIds.length === 0 || !!pendingAction}
                className="inline-flex h-10 items-center justify-center rounded-full bg-[#FF8F1F] px-4 text-sm font-bold text-white transition hover:bg-[#E07A13] disabled:opacity-60"
              >
                {pendingAction?.startsWith("bulk-add:") ? "Adicionando..." : "Adicionar selecionados"}
              </button>
            </div>
          </div>
        ) : null}

        {favorites.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-[#D0D5DD] bg-[#F8FAFA] px-4 py-10 text-center text-sm text-[#565959]">
            Nenhum favorito salvo na conta ainda.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {favoriteCards.map((favoriteCard) => {
              const favorite = favorites.find((entry) => entry.product.id === favoriteCard.id)!;
              const isSelected = selectedFavoriteIds.includes(favoriteCard.id);

              return (
                <div key={favoriteCard.asin} className="space-y-2">
                  <div
                    className={`relative rounded-xl transition ${
                      isSelected ? "ring-2 ring-[#FF8F1F] ring-offset-2 ring-offset-[#E3E6E6]" : ""
                    }`}
                  >
                    <BestDealProductCard item={favoriteCard} category="salvos" showActions={false} />

                    {listPickerOpen ? (
                      <>
                        <button
                          type="button"
                          onClick={() => toggleFavoriteSelection(favoriteCard.id)}
                          className="absolute inset-0 z-20 rounded-xl"
                          aria-label={`Selecionar ${favoriteCard.name}`}
                        />
                        <div className="pointer-events-none absolute left-2 top-2 z-30">
                          <div
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${
                              isSelected
                                ? "bg-[#FF8F1F] text-white"
                                : "border border-[#D0D5DD] bg-white text-[#344054]"
                            }`}
                          >
                            {isSelected ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                            {isSelected ? "Selecionado" : "Selecionar"}
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFavorite(favorite.product.id)}
                    disabled={pendingAction === `favorite:${favorite.product.id}`}
                    className="w-full rounded-xl border border-[#FECDCA] bg-[#FEF3F2] px-3 py-2 text-xs font-bold text-[#B42318] transition hover:bg-[#FEE4E2] disabled:opacity-60"
                  >
                    {pendingAction === `favorite:${favorite.product.id}` ? "Removendo..." : "Remover"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-[32px] border border-[#d5d9d9] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#FF8F1F]">Listas</p>
            <h3 className="mt-2 text-3xl font-black text-[#0F1111]">Organize e compartilhe</h3>
            <p className="mt-2 max-w-3xl text-sm text-[#565959]">
              Crie listas proprias, edite ordem de produtos e acompanhe tambem as listas que voce salvou.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateList((current) => !current)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#FFD814] px-4 text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00]"
          >
            <Plus className="h-4 w-4" />
            {showCreateList ? "Fechar criacao" : "Nova lista"}
          </button>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => setListTab("mine")}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              listTab === "mine"
                ? "bg-[#0F1111] text-white"
                : "border border-[#D0D5DD] bg-white text-[#344054]"
            }`}
          >
            Minhas listas
          </button>
          <button
            type="button"
            onClick={() => setListTab("saved")}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              listTab === "saved"
                ? "bg-[#0F1111] text-white"
                : "border border-[#D0D5DD] bg-white text-[#344054]"
            }`}
          >
            Listas salvas
          </button>
        </div>

        {showCreateList && listTab === "mine" ? (
          <form onSubmit={createList} className="mt-6 rounded-[28px] border border-[#EAECF0] bg-[#F8FAFA] p-5">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
              <input
                type="text"
                value={listTitle}
                onChange={(event) => setListTitle(event.target.value)}
                placeholder="Ex.: Wheys para testar"
                className="h-12 rounded-2xl border border-[#D0D5DD] px-4 text-sm outline-none transition focus:border-[#F3A847]"
                required
              />
              <input
                type="text"
                value={listDescription}
                onChange={(event) => setListDescription(event.target.value)}
                placeholder="Descricao opcional"
                className="h-12 rounded-2xl border border-[#D0D5DD] px-4 text-sm outline-none transition focus:border-[#F3A847]"
              />
              <label className="inline-flex items-center gap-2 rounded-2xl border border-[#D0D5DD] bg-white px-4 text-sm font-medium text-[#344054]">
                <input
                  type="checkbox"
                  checked={listPublic}
                  onChange={(event) => setListPublic(event.target.checked)}
                />
                Publica
              </label>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={creatingList}
                className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#0F1111] px-5 text-sm font-bold text-white transition hover:bg-[#1F2937] disabled:opacity-70"
              >
                {creatingList ? "Criando..." : "Criar lista"}
              </button>
            </div>
          </form>
        ) : null}

        {listTab === "mine" ? (
          lists.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-[#D0D5DD] bg-[#F8FAFA] px-4 py-10 text-center text-sm text-[#565959]">
              Nenhuma lista criada ainda.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {lists.map((list) => {
                const isEditing = listEditorId === list.id;
                const form = listForms[list.id] ?? {
                  title: list.title,
                  description: list.description ?? "",
                };

                return (
                  <div key={list.id} className="rounded-[28px] border border-[#EAECF0] bg-[#FCFCFD] p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
                            <input
                              type="text"
                              value={form.title}
                              onChange={(event) =>
                                setListForms((current) => ({
                                  ...current,
                                  [list.id]: { ...form, title: event.target.value },
                                }))
                              }
                              className="h-11 rounded-2xl border border-[#D0D5DD] px-4 text-sm outline-none transition focus:border-[#F3A847]"
                            />
                            <input
                              type="text"
                              value={form.description}
                              onChange={(event) =>
                                setListForms((current) => ({
                                  ...current,
                                  [list.id]: { ...form, description: event.target.value },
                                }))
                              }
                              className="h-11 rounded-2xl border border-[#D0D5DD] px-4 text-sm outline-none transition focus:border-[#F3A847]"
                              placeholder="Descricao"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="text-2xl font-black text-[#0F1111]">{list.title}</h4>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                                  list.isPublic
                                    ? "bg-[#ECFDF3] text-[#027A48]"
                                    : "bg-[#F2F4F7] text-[#475467]"
                                }`}
                              >
                                {list.isPublic ? <Globe className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                                {list.isPublic ? "Publica" : "Privada"}
                              </span>
                              <span className="rounded-full bg-[#F2F4F7] px-3 py-1 text-xs font-bold text-[#344054]">
                                {list.itemsCount} produto{list.itemsCount === 1 ? "" : "s"}
                              </span>
                            </div>
                            {list.description ? (
                              <p className="mt-2 text-sm text-[#565959]">{list.description}</p>
                            ) : (
                              <p className="mt-2 text-sm text-[#98A2B3]">Sem descricao.</p>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => saveListEdits(list.id)}
                              disabled={pendingAction === `edit:${list.id}`}
                              className="inline-flex h-10 items-center justify-center rounded-2xl bg-[#0F1111] px-4 text-sm font-bold text-white transition hover:bg-[#1F2937] disabled:opacity-60"
                            >
                              {pendingAction === `edit:${list.id}` ? "Salvando..." : "Salvar"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setListEditorId(null);
                                setListForms((current) => ({
                                  ...current,
                                  [list.id]: {
                                    title: list.title,
                                    description: list.description ?? "",
                                  },
                                }));
                              }}
                              className="inline-flex h-10 items-center justify-center rounded-2xl border border-[#D0D5DD] px-4 text-sm font-semibold text-[#344054] transition hover:bg-white"
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => void openListEditor(list.id)}
                              disabled={loadingListId === list.id}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#D0D5DD] px-4 text-sm font-semibold text-[#0F1111] transition hover:bg-white disabled:opacity-60"
                            >
                              <PencilLine className="h-4 w-4" />
                              {loadingListId === list.id ? "Abrindo..." : "Editar"}
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleListPublic(list.id, !list.isPublic)}
                              disabled={pendingAction === `visibility:${list.id}`}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#D0D5DD] px-4 text-sm font-semibold text-[#0F1111] transition hover:bg-white disabled:opacity-60"
                            >
                              {list.isPublic ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                              {list.isPublic ? "Privada" : "Publica"}
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteList(list.id)}
                              disabled={pendingAction === `delete:${list.id}`}
                              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#FECDCA] bg-[#FEF3F2] px-4 text-sm font-bold text-[#B42318] transition hover:bg-[#FEE4E2] disabled:opacity-60"
                            >
                              <Trash2 className="h-4 w-4" />
                              {pendingAction === `delete:${list.id}` ? "Excluindo..." : "Excluir"}
                            </button>

                            {list.isPublic ? (
                              <Link
                                href={`/listas/${list.slug}`}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#D0D5DD] px-4 text-sm font-semibold text-[#0F1111] transition hover:bg-white"
                              >
                                <ExternalLink className="h-4 w-4" />
                                Abrir link
                              </Link>
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : savedLists.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-[#D0D5DD] bg-[#F8FAFA] px-4 py-10 text-center text-sm text-[#565959]">
            Nenhuma lista salva ainda.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {savedLists.map((list) => (
              <div key={list.id} className="rounded-[28px] border border-[#EAECF0] bg-[#FCFCFD] p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-2xl font-black text-[#0F1111]">{list.title}</h4>
                      <span className="rounded-full bg-[#F2F4F7] px-3 py-1 text-xs font-bold text-[#344054]">
                        {list.itemsCount} produto{list.itemsCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    {list.description ? (
                      <p className="mt-2 text-sm text-[#565959]">{list.description}</p>
                    ) : null}
                    <p className="mt-2 text-sm text-[#667085]">
                      Lista criada por {list.ownerDisplayName}
                      {list.ownerUsername ? ` @${list.ownerUsername}` : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSaveList(list.id, true)}
                      disabled={pendingAction === `save-list:${list.id}`}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#D0D5DD] px-4 text-sm font-semibold text-[#0F1111] transition hover:bg-white disabled:opacity-60"
                    >
                      <Heart className="h-4 w-4" />
                      Remover das salvas
                    </button>
                    <Link
                      href={`/listas/${list.slug}`}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-[#D0D5DD] px-4 text-sm font-semibold text-[#0F1111] transition hover:bg-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Abrir link
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {openedList && listEditorId === openedList.id ? (
          <div className="mt-8 rounded-[28px] border border-[#EAECF0] bg-[#F8FAFA] p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#FF8F1F]">
                  Editando lista
                </p>
                <h4 className="mt-2 text-2xl font-black text-[#0F1111]">{openedList.title}</h4>
                <p className="mt-1 text-sm text-[#565959]">
                  Arraste os produtos para alterar a ordem em que aparecem na lista publica.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setListEditorId(null);
                  setOpenListId(null);
                  setDraggingProductId(null);
                }}
                className="inline-flex h-10 items-center justify-center rounded-2xl border border-[#D0D5DD] px-4 text-sm font-semibold text-[#344054] transition hover:bg-white"
              >
                Fechar edicao
              </button>
            </div>

            {openedList.items.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-dashed border-[#D0D5DD] bg-white px-4 py-10 text-center text-sm text-[#565959]">
                Essa lista ainda nao tem produtos.
              </div>
            ) : (
              <div className="mt-6 space-y-3">
                {openedList.items.map((item, index) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item.product.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => void handleDropOnItem(item.product.id)}
                    className={`flex flex-col gap-4 rounded-[24px] border border-[#D0D5DD] bg-white p-4 shadow-sm lg:flex-row lg:items-center ${
                      draggingProductId === item.product.id ? "opacity-70" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3 lg:w-[360px]">
                      <div className="rounded-xl border border-[#EAECF0] bg-[#F8FAFA] p-2 text-[#667085]">
                        <GripVertical className="h-5 w-5" />
                      </div>

                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-[#F8FAFA]">
                        {item.product.imageUrl ? (
                          <Image
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            width={64}
                            height={64}
                            className="h-full w-full object-contain p-2"
                            unoptimized
                          />
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#98A2B3]">
                          Posicao {index + 1}
                        </p>
                        <p className="line-clamp-2 text-sm font-bold text-[#0F1111]">
                          {item.product.name}
                        </p>
                      </div>
                    </div>

                    <div className="flex-1">
                      <p className="text-sm text-[#565959]">{item.product.category.name}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={item.product.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-[#D0D5DD] px-4 text-sm font-semibold text-[#0F1111] transition hover:bg-white"
                      >
                        Amazon
                      </a>
                      <button
                        type="button"
                        onClick={() => removeListItem(openedList.id, item.product.id)}
                        disabled={pendingAction === `item:${openedList.id}:${item.product.id}`}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-[#FECDCA] bg-[#FEF3F2] px-4 text-sm font-bold text-[#B42318] transition hover:bg-[#FEE4E2] disabled:opacity-60"
                      >
                        {pendingAction === `item:${openedList.id}:${item.product.id}`
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
      </section>

      {activityMode ? (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 px-4"
          onClick={() => setActivityMode(null)}
        >
          <div
            className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-[#0F1111]">
                  {activityMode === "comments" ? "Comentarios" : "Reacoes aos comentarios"}
                </h3>
                <p className="mt-1 text-sm text-[#565959]">
                  Clique em um item para abrir o post correspondente.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActivityMode(null)}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {activityLoading ? (
                <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-[#F8FAFA] px-4 py-10 text-center text-sm text-[#565959]">
                  Carregando atividade...
                </div>
              ) : (
                (activityMode === "comments" ? activityComments : activityReactions).map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="block rounded-2xl border border-[#EAECF0] bg-[#FCFCFD] px-4 py-4 transition hover:bg-white"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-[#0F1111]">
                          {activityMode === "comments"
                            ? item.productName ?? "Comentario"
                            : item.title ?? "Interacao"}
                        </p>
                        {item.body ? (
                          <p className="mt-1 line-clamp-2 text-sm text-[#565959]">{item.body}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-[#98A2B3]">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </div>
                  </Link>
                ))
              )}

              {!activityLoading &&
              (activityMode === "comments" ? activityComments.length === 0 : activityReactions.length === 0) ? (
                <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-[#F8FAFA] px-4 py-10 text-center text-sm text-[#565959]">
                  Nenhum item encontrado.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

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
                  Posicione a imagem dentro da area quadrada que sera usada como icone.
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
                      const scale = Math.max(
                        baseSize / element.naturalWidth,
                        baseSize / element.naturalHeight
                      );
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
                    Previa do icone
                  </p>
                  <div className="mt-3 flex justify-center">
                    <div className="relative h-16 w-16 overflow-hidden rounded-full border border-white bg-white shadow">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={cropSource}
                        alt="Previa do avatar"
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

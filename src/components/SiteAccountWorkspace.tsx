"use client";

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Globe,
  GripVertical,
  Heart,
  ListPlus,
  Lock,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AccountListPickerModal from "@/components/AccountListPickerModal";
import BestDealProductCard from "@/components/BestDealProductCard";
import { buildPublicListPath } from "@/lib/siteSocial";

type FavoriteEntry = {
  id: string;
  savedAt: string;
  sortOrder: number;
  product: {
    id: string;
    asin: string;
    name: string;
    totalPrice: number;
    imageUrl: string | null;
    url: string;
    averagePrice30d: number | null;
    ratingAverage: number | null;
    ratingCount: number | null;
    availabilityStatus?: string | null;
    category: {
      name: string;
      group: string;
      slug: string;
    };
  };
};

type MonitoredProductEntry = {
  id: string;
  savedAt: string;
  sortOrder: number;
  product: {
    id: string;
    asin: string;
    name: string;
    totalPrice: number;
    imageUrl: string | null;
    url: string;
    averagePrice30d: number | null;
    ratingAverage: number | null;
    ratingCount: number | null;
    availabilityStatus?: string | null;
    programAndSavePrice?: number | null;
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
  isDefault: boolean;
  itemsCount: number;
};

type SavedListEntry = ListEntry & {
  ownerDisplayName: string;
  ownerUsername: string | null;
  items: ListDetails["items"];
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
    source: "catalog" | "monitored";
      product: {
        id: string;
        asin: string;
        name: string;
        imageUrl: string | null;
        totalPrice: number;
        averagePrice30d: number | null;
        ratingAverage: number | null;
        ratingCount: number | null;
        url: string;
        availabilityStatus?: string | null;
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
    isEmailVerified: boolean;
  };
  profileStats: {
    memberSince: string;
    commentsCount: number;
    commentReactionsCount: number;
  };
  favorites: FavoriteEntry[];
  monitoredProducts: MonitoredProductEntry[];
  lists: ListEntry[];
  savedLists: SavedListEntry[];
};

type ListFormState = {
  title: string;
  description: string;
  isPublic: boolean;
};

type ComparatorPromptState = {
  asin: string;
  amazonUrl: string;
  name: string;
};

type ListMoveContext = {
  listId: string;
  itemId: string;
  productId?: string | null;
  monitoredProductId?: string | null;
  resolvedProduct?: FavoriteEntry["product"] | MonitoredProductEntry["product"] | null;
  productName: string;
};

type ListItemOrderChange = {
  listId: string;
  orderedItemIds: string[];
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

function extractAmazonAsinFromInput(input: string) {
  const normalized = input.trim();
  if (!normalized) return null;

  const directAsinMatch = normalized.match(/\b([A-Z0-9]{10})\b/i);
  const dpMatch = normalized.match(/\/dp\/([A-Z0-9]{10})/i);
  const gpMatch = normalized.match(/\/gp\/product\/([A-Z0-9]{10})/i);

  const asin = dpMatch?.[1] || gpMatch?.[1] || directAsinMatch?.[1];
  return asin ? asin.toUpperCase() : null;
}

function formatAsinList(asins: string[]) {
  return asins.length > 0 ? ` (${asins.join(", ")})` : "";
}

function pushUnique(values: string[], value: string) {
  if (!values.includes(value)) {
    values.push(value);
  }
}

function reorderListItemsByIds(items: ListDetails["items"], orderedItemIds: string[]) {
  const orderMap = new Map(orderedItemIds.map((id, index) => [id, index]));
  const fallbackIndex = orderedItemIds.length + 1;

  return [...items]
    .sort((left, right) => (orderMap.get(left.id) ?? fallbackIndex) - (orderMap.get(right.id) ?? fallbackIndex))
    .map((item, index) => ({
      ...item,
      sortOrder: index,
    }));
}

function sameItemOrder(items: ListDetails["items"], orderedItemIds: string[]) {
  if (items.length !== orderedItemIds.length) return false;
  return items.every((item, index) => item.id === orderedItemIds[index]);
}

function getListItemBestDeal(item: ListDetails["items"][number]) {
  const product = item.product;
  const category = product.category ?? null;
  const averagePrice30d = product.averagePrice30d ?? product.totalPrice;
  const discountPercent =
    product.totalPrice > 0 && averagePrice30d > product.totalPrice
      ? Math.round(((averagePrice30d - product.totalPrice) / averagePrice30d) * 100)
      : 0;

  return {
    id: product.id,
    asin: product.asin,
    name: product.name || `Produto Amazon ${product.asin}`,
    imageUrl: product.imageUrl,
    url: product.url || `https://www.amazon.com.br/dp/${product.asin}`,
    totalPrice: product.totalPrice,
    averagePrice30d,
    discountPercent,
    ratingAverage: product.ratingAverage ?? null,
    ratingCount: product.ratingCount ?? null,
    likeCount: 0,
    dislikeCount: 0,
    categoryName: category?.name ?? "Sem categoria",
    categoryGroup: category?.group ?? "geral",
    categorySlug: category?.slug ?? "geral",
    attributes: {
      availabilityStatus: product.availabilityStatus ?? "",
    },
  };
}

function SortableListCard({
  sortableId,
  item,
  menuOpen,
  onToggleMenu,
  onMoveToAnotherList,
  onRemove,
  removeDisabled,
}: {
  sortableId: string;
  item: ReturnType<typeof getListItemBestDeal>;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onMoveToAnotherList: () => void;
  onRemove: () => void;
  removeDisabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: sortableId,
    });

  const transformStyle = transform
    ? CSS.Transform.toString({
        ...transform,
        scaleX: isDragging ? (transform.scaleX ?? 1) * 1.02 : transform.scaleX,
        scaleY: isDragging ? (transform.scaleY ?? 1) * 1.02 : transform.scaleY,
      })
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: transformStyle,
        transition,
        opacity: isDragging ? 0.92 : 1,
        zIndex: isDragging ? 20 : 0,
      }}
      className="overflow-hidden rounded-[24px] border border-[#E6EAF0] bg-white shadow-[0_6px_18px_rgba(15,17,17,0.03)]"
      data-list-item-menu-root={sortableId}
    >
      <div className="relative">
        <div className="absolute left-3 top-3 z-30">
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            {...listeners}
            className="inline-flex h-9 w-9 cursor-grab items-center justify-center rounded-full border border-[#D0D5DD] bg-white text-[#344054] shadow-sm transition hover:bg-[#F8FAFA] active:cursor-grabbing"
            aria-label="Arraste para reordenar"
            title="Arraste para reordenar"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>

        <div className="absolute right-3 top-3 z-30">
          <button
            type="button"
            onClick={onToggleMenu}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D0D5DD] bg-white text-[#344054] shadow-sm transition hover:bg-[#F8FAFA]"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen ? (
            <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-2xl border border-[#D0D5DD] bg-white shadow-[0_18px_40px_rgba(15,17,17,0.12)]">
              <button
                type="button"
                onClick={onMoveToAnotherList}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA]"
              >
                <ListPlus className="h-4 w-4 text-[#667085]" />
                Mover para outra lista
              </button>
              <button
                type="button"
                onClick={onRemove}
                disabled={removeDisabled}
                className="flex w-full items-center gap-3 border-t border-[#EAECF0] px-4 py-3 text-left text-sm font-semibold text-[#B42318] transition hover:bg-[#FEF3F2] disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {removeDisabled ? "Removendo..." : "Excluir"}
              </button>
            </div>
          ) : null}
        </div>

        <BestDealProductCard item={item} category="lista_aberta" compact showActions={false} />
      </div>
    </div>
  );
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
    imageUrl: favorite.product.imageUrl,
    url: favorite.product.url,
    totalPrice: favorite.product.totalPrice,
    averagePrice30d,
    discountPercent,
    ratingAverage: favorite.product.ratingAverage ?? null,
    ratingCount: favorite.product.ratingCount ?? null,
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

function monitoredProductToCardItem(monitoredProduct: MonitoredProductEntry) {
  const averagePrice30d =
    monitoredProduct.product.averagePrice30d && monitoredProduct.product.averagePrice30d > 0
      ? monitoredProduct.product.averagePrice30d
      : monitoredProduct.product.totalPrice;
  const discountPercent =
    averagePrice30d > monitoredProduct.product.totalPrice && monitoredProduct.product.totalPrice > 0
      ? Math.round(((averagePrice30d - monitoredProduct.product.totalPrice) / averagePrice30d) * 100)
      : 0;

  return {
    id: monitoredProduct.product.id,
    asin: monitoredProduct.product.asin,
    name: monitoredProduct.product.name,
    imageUrl: monitoredProduct.product.imageUrl,
    url: monitoredProduct.product.url,
    totalPrice: monitoredProduct.product.totalPrice,
    averagePrice30d,
    discountPercent,
    ratingAverage: monitoredProduct.product.ratingAverage ?? null,
    ratingCount: monitoredProduct.product.ratingCount ?? null,
    likeCount: 0,
    dislikeCount: 0,
    categoryName: "Amazon",
    categoryGroup: "amazon",
    categorySlug: "monitorado",
    attributes: {
      availabilityStatus: monitoredProduct.product.availabilityStatus ?? "",
    },
  };
}

function createInitialListForms(lists: ListEntry[]) {
  return lists.reduce<Record<string, ListFormState>>((accumulator, list) => {
    accumulator[list.id] = {
      title: list.title,
      description: list.description ?? "",
      isPublic: list.isPublic,
    };
    return accumulator;
  }, {});
}

export default function SiteAccountWorkspace({
  currentUser,
  profileStats,
  favorites: initialFavorites,
  monitoredProducts: initialMonitoredProducts,
  lists: initialLists,
  savedLists: initialSavedLists,
}: SiteAccountWorkspaceProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cropPreviewRef = useRef<HTMLImageElement | null>(null);

  const [favorites, setFavorites] = useState(initialFavorites);
  const [monitoredProducts, setMonitoredProducts] = useState(initialMonitoredProducts);
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
  const [verificationMessage, setVerificationMessage] = useState("");
  const [resendingVerification, setResendingVerification] = useState(false);

  const [cropSource, setCropSource] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [cropImageSize, setCropImageSize] = useState({ width: 0, height: 0 });

  const [showCreateList, setShowCreateList] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(initialLists[0]?.id ?? null);
  const [selectedSavedListId, setSelectedSavedListId] = useState<string | null>(
    initialSavedLists[0]?.id ?? null
  );
  const [showInlineListAddProduct, setShowInlineListAddProduct] = useState(false);
  const [selectedTrackedKeys, setSelectedTrackedKeys] = useState<string[]>([]);
  const [listPickerOpen, setListPickerOpen] = useState(false);
  const [trackedReorderMode, setTrackedReorderMode] = useState(false);
  const [trackedSortMode, setTrackedSortMode] = useState<"manual" | "discount">("manual");
  const [trackedReorderSelection, setTrackedReorderSelection] = useState<string[]>([]);
  const [showOutOfStockInTracked, setShowOutOfStockInTracked] = useState(false);
  const [monitoredProductUrl, setMonitoredProductUrl] = useState("");
  const [addingMonitoredProduct, setAddingMonitoredProduct] = useState(false);
  const [listMoveContext, setListMoveContext] = useState<ListMoveContext | null>(null);
  const [comparatorPrompt, setComparatorPrompt] = useState<ComparatorPromptState | null>(null);

  const [listEditorId, setListEditorId] = useState<string | null>(null);
  const [listForms, setListForms] = useState<Record<string, ListFormState>>(
    createInitialListForms(initialLists)
  );
  const [listOrderMode, setListOrderMode] = useState(false);
  const [listSortMode, setListSortMode] = useState<
    "manual" | "discount" | "price_asc" | "price_desc" | "alpha"
  >("manual");
  const [listStockFilter, setListStockFilter] = useState<"in_stock" | "out_of_stock" | "all">(
    "in_stock"
  );
  const [listSearchQuery, setListSearchQuery] = useState("");
  const [listTab, setListTab] = useState<"mine" | "saved">("mine");
  const [activeListItemId, setActiveListItemId] = useState<string | null>(null);

  const [activityMode, setActivityMode] = useState<"comments" | "reactions" | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityComments, setActivityComments] = useState<ActivityItem[]>([]);
  const [activityReactions, setActivityReactions] = useState<ActivityItem[]>([]);
  const [suggestionUrl, setSuggestionUrl] = useState("");
  const [suggestionNotes, setSuggestionNotes] = useState("");
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const [showSuggestionComposer, setShowSuggestionComposer] = useState(false);
  const listOrderSaveTimerRef = useRef<number | null>(null);
  const listOrderSaveRequestRef = useRef<ListItemOrderChange | null>(null);
  const listOrderSavingRef = useRef(false);
  const listOrderStockFilterBeforeEditRef = useRef<"in_stock" | "out_of_stock" | "all" | null>(
    null
  );

  useEffect(() => {
    if (!activeListItemId) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const menuRoot = target.closest("[data-list-item-menu-root]");
      if (!menuRoot || menuRoot.getAttribute("data-list-item-menu-root") !== activeListItemId) {
        setActiveListItemId(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [activeListItemId]);
  const defaultList = lists.find((list) => list.isDefault) ?? null;
  const otherLists = lists.filter((list) => !list.isDefault);
  const addListOptions = useMemo(() => {
    const orderedLists = defaultList ? [defaultList, ...otherLists] : otherLists;
    const uniqueLists = new Map<string, (typeof orderedLists)[number]>();

    for (const list of orderedLists) {
      if (!uniqueLists.has(list.id)) {
        uniqueLists.set(list.id, list);
      }
    }

    return Array.from(uniqueLists.values());
  }, [defaultList, otherLists]);
  const trackedProductCards = useMemo(() => {
    const favoriteEntries = favorites.map((favorite) => ({
      key: `favorite:${favorite.product.id}`,
      source: "favorite" as const,
      savedAt: favorite.savedAt,
      entryId: favorite.id,
      productId: favorite.product.id,
      monitoredProductId: null,
      sortOrder: favorite.sortOrder,
      card: favoriteToCardItem(favorite),
    }));

    const monitoredEntries = monitoredProducts.map((monitoredProduct) => ({
      key: `monitored:${monitoredProduct.id}`,
      source: "monitored" as const,
      savedAt: monitoredProduct.savedAt,
      entryId: monitoredProduct.id,
      productId: null,
      monitoredProductId: monitoredProduct.id,
      sortOrder: monitoredProduct.sortOrder,
      card: monitoredProductToCardItem(monitoredProduct),
    }));

    const merged = [...favoriteEntries, ...monitoredEntries];

    if (trackedSortMode === "discount" && !trackedReorderMode) {
      return merged.sort((left, right) => {
        const leftOutOfStock =
          (left.card.attributes?.availabilityStatus ?? "") === "OUT_OF_STOCK" ||
          left.card.totalPrice <= 0;
        const rightOutOfStock =
          (right.card.attributes?.availabilityStatus ?? "") === "OUT_OF_STOCK" ||
          right.card.totalPrice <= 0;

        if (leftOutOfStock !== rightOutOfStock) {
          return leftOutOfStock ? 1 : -1;
        }
        if ((right.card.discountPercent ?? 0) !== (left.card.discountPercent ?? 0)) {
          return (right.card.discountPercent ?? 0) - (left.card.discountPercent ?? 0);
        }
        if ((right.card.averagePrice30d ?? 0) !== (left.card.averagePrice30d ?? 0)) {
          return (right.card.averagePrice30d ?? 0) - (left.card.averagePrice30d ?? 0);
        }
        return left.card.totalPrice - right.card.totalPrice;
      });
    }

    return merged.sort((left, right) => {
      if ((left.sortOrder ?? 0) !== (right.sortOrder ?? 0)) {
        return (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
      }
      return new Date(left.savedAt).getTime() - new Date(right.savedAt).getTime();
    });
  }, [favorites, monitoredProducts, trackedReorderMode, trackedSortMode]);
  const openedList = openListId ? listDetailsMap[openListId] ?? null : null;
  const selectedList = selectedListId ? lists.find((list) => list.id === selectedListId) : null;
  const selectedSavedList = selectedSavedListId
    ? savedLists.find((list) => list.id === selectedSavedListId)
    : null;
  const sortedOpenedListItems = useMemo(() => {
    if (!openedList) return [];
    if (listOrderMode || listSortMode === "manual") return openedList.items;

    return [...openedList.items].sort((left, right) => {
      const leftAverage = left.product.averagePrice30d ?? left.product.totalPrice;
      const rightAverage = right.product.averagePrice30d ?? right.product.totalPrice;
      const leftDiscount =
        left.product.totalPrice > 0 && leftAverage > left.product.totalPrice
          ? Math.round(((leftAverage - left.product.totalPrice) / leftAverage) * 100)
          : 0;
      const rightDiscount =
        right.product.totalPrice > 0 && rightAverage > right.product.totalPrice
          ? Math.round(((rightAverage - right.product.totalPrice) / rightAverage) * 100)
          : 0;
      const leftOutOfStock =
        left.product.availabilityStatus === "OUT_OF_STOCK" || left.product.totalPrice <= 0;
      const rightOutOfStock =
        right.product.availabilityStatus === "OUT_OF_STOCK" || right.product.totalPrice <= 0;

      if (leftOutOfStock !== rightOutOfStock) {
        return leftOutOfStock ? 1 : -1;
      }

      if (listSortMode === "price_asc") {
        return left.product.totalPrice - right.product.totalPrice;
      }

      if (listSortMode === "price_desc") {
        return right.product.totalPrice - left.product.totalPrice;
      }

      if (listSortMode === "alpha") {
        return left.product.name.localeCompare(right.product.name, "pt-BR");
      }

      if (rightDiscount !== leftDiscount) {
        return rightDiscount - leftDiscount;
      }

      return left.product.totalPrice - right.product.totalPrice;
    });
  }, [openedList, listSortMode, listOrderMode]);
  const visibleOpenedListItems = useMemo(() => {
    if (!sortedOpenedListItems.length) return [];
    if (listStockFilter === "all") return sortedOpenedListItems;

    if (listStockFilter === "out_of_stock") {
      return sortedOpenedListItems.filter(
        (item) =>
          item.product.availabilityStatus === "OUT_OF_STOCK" || item.product.totalPrice <= 0
      );
    }

    return sortedOpenedListItems.filter(
      (item) =>
        item.product.availabilityStatus !== "OUT_OF_STOCK" &&
        item.product.totalPrice > 0
    );
  }, [listStockFilter, sortedOpenedListItems]);
  const filteredOpenedListItems = useMemo(() => {
    const query = listSearchQuery.trim().toLowerCase();
    if (!query) return visibleOpenedListItems;

    return visibleOpenedListItems.filter((item) => {
      const searchTarget = [
        item.product.name,
        item.product.asin,
        item.product.category.name,
        item.note ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchTarget.includes(query);
    });
  }, [visibleOpenedListItems, listSearchQuery]);
  const sortedSavedListItems = useMemo(() => {
    if (!selectedSavedList) return [];
    if (listSortMode === "manual") return selectedSavedList.items;

    return [...selectedSavedList.items].sort((left, right) => {
      const leftAverage = left.product.averagePrice30d ?? left.product.totalPrice;
      const rightAverage = right.product.averagePrice30d ?? right.product.totalPrice;
      const leftDiscount =
        left.product.totalPrice > 0 && leftAverage > left.product.totalPrice
          ? Math.round(((leftAverage - left.product.totalPrice) / leftAverage) * 100)
          : 0;
      const rightDiscount =
        right.product.totalPrice > 0 && rightAverage > right.product.totalPrice
          ? Math.round(((rightAverage - right.product.totalPrice) / rightAverage) * 100)
          : 0;
      const leftOutOfStock =
        left.product.availabilityStatus === "OUT_OF_STOCK" || left.product.totalPrice <= 0;
      const rightOutOfStock =
        right.product.availabilityStatus === "OUT_OF_STOCK" || right.product.totalPrice <= 0;

      if (leftOutOfStock !== rightOutOfStock) {
        return leftOutOfStock ? 1 : -1;
      }

      if (listSortMode === "price_asc") {
        return left.product.totalPrice - right.product.totalPrice;
      }

      if (listSortMode === "price_desc") {
        return right.product.totalPrice - left.product.totalPrice;
      }

      if (listSortMode === "alpha") {
        return left.product.name.localeCompare(right.product.name, "pt-BR");
      }

      if (rightDiscount !== leftDiscount) {
        return rightDiscount - leftDiscount;
      }

      return left.product.totalPrice - right.product.totalPrice;
    });
  }, [selectedSavedList, listSortMode]);
  const visibleSavedListItems = useMemo(() => {
    if (!sortedSavedListItems.length) return [];
    if (listStockFilter === "all") return sortedSavedListItems;

    if (listStockFilter === "out_of_stock") {
      return sortedSavedListItems.filter(
        (item) =>
          item.product.availabilityStatus === "OUT_OF_STOCK" || item.product.totalPrice <= 0
      );
    }

    return sortedSavedListItems.filter(
      (item) =>
        item.product.availabilityStatus !== "OUT_OF_STOCK" &&
        item.product.totalPrice > 0
    );
  }, [listStockFilter, sortedSavedListItems]);
  const filteredSavedListItems = useMemo(() => {
    const query = listSearchQuery.trim().toLowerCase();
    if (!query) return visibleSavedListItems;

    return visibleSavedListItems.filter((item) => {
      const searchTarget = [
        item.product.name,
        item.product.asin,
        item.product.category.name,
        item.note ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchTarget.includes(query);
    });
  }, [visibleSavedListItems, listSearchQuery]);
  const visibleTrackedProductCards = useMemo(() => {
    if (showOutOfStockInTracked || trackedSortMode === "discount" || trackedReorderMode) {
      return trackedProductCards;
    }

    return trackedProductCards.filter(
      (item) =>
        (item.card.attributes?.availabilityStatus ?? "") !== "OUT_OF_STOCK" &&
        item.card.totalPrice > 0
    );
  }, [trackedProductCards, trackedSortMode, trackedReorderMode, showOutOfStockInTracked]);
  const currentOpenedList =
    selectedListId && openListId === selectedListId ? listDetailsMap[selectedListId] ?? null : null;
  const editingList = listEditorId ? listDetailsMap[listEditorId] ?? null : null;
  const canDragListItems = listSortMode === "manual";
  const isCurrentListLoading = Boolean(
    selectedListId && loadingListId === selectedListId && openListId !== selectedListId
  );

  useEffect(() => {
    if (listTab !== "mine" || !selectedListId || openListId === selectedListId || loadingListId) {
      return;
    }

    void openListViewer(selectedListId);
  }, [listTab, selectedListId, openListId, loadingListId]);
  useEffect(() => {
    if (listTab !== "saved") return;
    if (selectedSavedListId && savedLists.some((list) => list.id === selectedSavedListId)) return;
    setSelectedSavedListId(savedLists[0]?.id ?? null);
  }, [listTab, savedLists, selectedSavedListId]);
  useEffect(() => {
    if (!currentOpenedList) return;
    setShowInlineListAddProduct(false);
  }, [currentOpenedList]);
  const listOrderSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(
    () => () => {
      if (listOrderSaveTimerRef.current) {
        window.clearTimeout(listOrderSaveTimerRef.current);
      }
    },
    []
  );

  function setMessage(message: string) {
    setWorkspaceMessage(message);
  }

  async function handleResendVerificationEmail() {
    setVerificationMessage("");
    setResendingVerification(true);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        sent?: boolean;
        alreadyVerified?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "resend_failed");
      }

      if (data.alreadyVerified) {
        setVerificationMessage("Seu email já foi confirmado. Atualize a página para seguir normalmente.");
        return;
      }

      setVerificationMessage(
        data.sent
          ? "Enviamos um novo link de confirmação para o seu email."
          : "Não foi possível reenviar a confirmação agora."
      );
    } catch (error) {
      setVerificationMessage(
        error instanceof Error && error.message !== "resend_failed"
          ? error.message
          : "Não foi possível reenviar a confirmação agora."
      );
    } finally {
      setResendingVerification(false);
    }
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

  async function submitSuggestion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittingSuggestion(true);
    setSuggestionMessage("");

    try {
      const response = await fetch("/api/account/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amazonUrl: suggestionUrl,
          notes: suggestionNotes,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "suggestion_create_failed");
      }

      setSuggestionUrl("");
      setSuggestionNotes("");
      setSuggestionMessage("Sugestao enviada. Vamos revisar antes de adicionar ao site.");
    } catch (error) {
      setSuggestionMessage(
        error instanceof Error && error.message !== "suggestion_create_failed"
          ? error.message
          : "Nao foi possivel enviar sua sugestao agora."
      );
    } finally {
      setSubmittingSuggestion(false);
    }
  }

  async function addMonitoredProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentOpenedList) {
      setMessage("Abra uma lista para adicionar produtos.");
      return;
    }
    const amazonInputs = monitoredProductUrl
      .split(",")
      .map((input) => input.trim())
      .filter(Boolean);

    if (amazonInputs.length === 0) {
      setMessage("Cole um link da Amazon ou ASIN para adicionar.");
      return;
    }

    const targetList = currentOpenedList;
    const targetListKnownAsins = new Set<string>();
    const targetListDetails = listDetailsMap[targetList.id];
    if (targetListDetails) {
      for (const item of targetListDetails.items) {
        targetListKnownAsins.add(item.product.asin.toUpperCase());
      }
    }

    setAddingMonitoredProduct(true);
    setMessage("");

    try {
      const seenAsinsInBatch = new Set<string>();
      const addedAsins: string[] = [];
      const existingAsins: string[] = [];
      const errorAsins: string[] = [];
      let latestComparatorPrompt: ComparatorPromptState | null = null;
      const selectedListTitle = targetList.title;

      for (const amazonInput of amazonInputs) {
        const asin = extractAmazonAsinFromInput(amazonInput) ?? amazonInput;
        const normalizedAsin = asin.toUpperCase();

        if (seenAsinsInBatch.has(normalizedAsin)) {
          pushUnique(existingAsins, normalizedAsin);
          continue;
        }
        seenAsinsInBatch.add(normalizedAsin);

        if (targetListKnownAsins.has(normalizedAsin)) {
          pushUnique(existingAsins, normalizedAsin);
          continue;
        }

        try {
          const response = await fetch("/api/account/monitored-products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amazonUrl: amazonInput, listId: targetList?.id }),
          });
          const data = (await response.json()) as {
            ok?: boolean;
            error?: string;
            errorDetail?: string;
            asin?: string | null;
            source?: "catalog" | "amazon";
            canSuggestComparator?: boolean;
            created?: boolean;
            listId?: string | null;
            favorite?: FavoriteEntry;
            monitoredProduct?: MonitoredProductEntry;
          };

          if (!response.ok || !data.ok) {
            throw new Error(data.errorDetail || data.error || "monitored_product_create_failed");
          }

          const isCatalogResponse = data.source === "catalog" && Boolean(data.favorite);
          const isAmazonResponse = data.source === "amazon" && Boolean(data.monitoredProduct);

          if (isCatalogResponse && data.favorite) {
            const favoriteAsin = data.favorite.product.asin.toUpperCase();
            const resolvedListId = data.listId ?? targetList?.id ?? null;
            setFavorites((current) => {
              const withoutSameProduct = current.filter(
                (entry) => entry.product.id !== data.favorite!.product.id
              );
              return [data.favorite!, ...withoutSameProduct];
            });
            if (data.created && resolvedListId) {
              setLists((current) =>
                current.map((list) =>
                  list.id === resolvedListId ? { ...list, itemsCount: list.itemsCount + 1 } : list
                )
              );
              setListDetailsMap((current) => {
                const details = current[resolvedListId];
                if (!details) return current;
                return {
                  ...current,
                  [resolvedListId]: {
                    ...details,
                    items: [
                      ...details.items,
                      {
                        id: `${resolvedListId}:${data.favorite!.product.id}`,
                        note: null,
                        sortOrder: details.items.length,
                        source: "catalog",
                        product: data.favorite!.product,
                      },
                    ],
                  },
                };
              });
            }
            latestComparatorPrompt = null;
            if (data.created) {
              pushUnique(addedAsins, favoriteAsin);
            } else {
              pushUnique(existingAsins, favoriteAsin);
            }
          } else if (isAmazonResponse && data.monitoredProduct) {
            const monitoredAsin = data.monitoredProduct.product.asin.toUpperCase();
            const resolvedProduct = data.monitoredProduct.product;
            const resolvedListId = data.listId ?? targetList?.id ?? null;
            setMonitoredProducts((current) => {
              const withoutSameAsin = current.filter(
                (entry) => entry.product.asin !== data.monitoredProduct!.product.asin
              );
              return [data.monitoredProduct!, ...withoutSameAsin];
            });
            let addedToList: { created: boolean } | null = null;
            if (resolvedListId) {
              try {
                addedToList = await addTrackedProductToList(resolvedListId, {
                  monitoredProductId: data.monitoredProduct.id,
                  resolvedProduct,
                });
              } catch (listError) {
                console.warn("monitored_product_list_link_failed", {
                  asin: monitoredAsin,
                  listId: resolvedListId,
                  listError,
                });
              }
            }
            latestComparatorPrompt = data.canSuggestComparator
              ? {
                  asin: data.monitoredProduct.product.asin,
                  amazonUrl: data.monitoredProduct.product.url,
                  name: data.monitoredProduct.product.name,
                }
              : null;
            if (addedToList?.created) {
              pushUnique(addedAsins, monitoredAsin);
            } else if (addedToList) {
              pushUnique(existingAsins, monitoredAsin);
            } else {
              pushUnique(addedAsins, monitoredAsin);
            }
            targetListKnownAsins.add(monitoredAsin);
          } else if (data.monitoredProduct) {
            const monitoredAsin = data.monitoredProduct.product.asin.toUpperCase();
            const resolvedProduct = data.monitoredProduct.product;
            const resolvedListId = data.listId ?? targetList?.id ?? null;
            setMonitoredProducts((current) => {
              const withoutSameAsin = current.filter(
                (entry) => entry.product.asin !== data.monitoredProduct!.product.asin
              );
              return [data.monitoredProduct!, ...withoutSameAsin];
            });
            let addedToList: { created: boolean } | null = null;
            if (resolvedListId) {
              try {
                addedToList = await addTrackedProductToList(resolvedListId, {
                  monitoredProductId: data.monitoredProduct.id,
                  resolvedProduct,
                });
              } catch (listError) {
                console.warn("monitored_product_list_link_failed", {
                  asin: monitoredAsin,
                  listId: resolvedListId,
                  listError,
                });
              }
            }
            latestComparatorPrompt = data.canSuggestComparator
              ? {
                  asin: data.monitoredProduct.product.asin,
                  amazonUrl: data.monitoredProduct.product.url,
                  name: data.monitoredProduct.product.name,
                }
              : null;
            if (addedToList?.created) {
              pushUnique(addedAsins, monitoredAsin);
            } else if (addedToList) {
              pushUnique(existingAsins, monitoredAsin);
            } else {
              pushUnique(addedAsins, monitoredAsin);
            }
            targetListKnownAsins.add(monitoredAsin);
          } else {
            throw new Error(
              data.errorDetail || data.error || "monitored_product_create_failed"
            );
          }
        } catch (error) {
          const cause = error instanceof Error ? error.message : "monitored_product_create_failed";
          if (targetListKnownAsins.has(normalizedAsin)) {
            pushUnique(existingAsins, normalizedAsin);
            continue;
          }
          pushUnique(errorAsins, normalizedAsin);
          console.error("monitored_product_create_failed", {
            amazonInput,
            asin: normalizedAsin,
            cause,
            error,
          });
        }
      }

      setComparatorPrompt(latestComparatorPrompt);

      setMonitoredProductUrl("");
      setShowInlineListAddProduct(false);

      const addedPart = `${addedAsins.length} produto${
        addedAsins.length === 1 ? "" : "s"
      } adicionad${addedAsins.length === 1 ? "o" : "os"}${formatAsinList(addedAsins)}`;
      const existingPart = `${existingAsins.length} produto${
        existingAsins.length === 1 ? "" : "s"
      } ja existente${existingAsins.length === 1 ? "" : "s"}${formatAsinList(existingAsins)}`;
      const errorPart = `${errorAsins.length} produto${
        errorAsins.length === 1 ? "" : "s"
      } apresentaram erro${formatAsinList(errorAsins)}`;

      if (addedAsins.length === 1 && existingAsins.length === 0 && errorAsins.length === 0) {
        setMessage(`Salvo em ${selectedListTitle}.`);
      } else if (addedAsins.length === 0 && existingAsins.length === 1 && errorAsins.length === 0) {
        setMessage("Produto ja esta nesta lista.");
      } else {
        setMessage([addedPart, existingPart, errorPart].join(" | "));
      }
    } catch (error) {
      console.error("monitored_product_create_failed", error);
      setMessage("Nao foi possivel adicionar esses produtos agora.");
    } finally {
      setAddingMonitoredProduct(false);
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

  async function createListRecord(input: {
    title: string;
    description?: string;
    isPublic?: boolean;
  }) {
    const response = await fetch("/api/account/lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
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
        isPublic: data.list!.isPublic,
      },
    }));

    return data.list!;
  }

  async function createList(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingList(true);
    setMessage("");

    try {
      const createdList = await createListRecord({
        title: listTitle,
        isPublic: false,
      });
      setSelectedListId((current) => current ?? createdList.id);
      setListTitle("");
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
    setListOrderMode(false);
    setActiveListItemId(null);
  }

  async function openListViewer(listId: string) {
    await loadListDetails(listId);
    setListEditorId(null);
    setListOrderMode(false);
    setActiveListItemId(null);
  }

  async function openListReorder(listId: string) {
    await loadListDetails(listId);
    setListEditorId(listId);
    setListSortMode("manual");
    setListOrderMode(true);
    setListSearchQuery("");
    setActiveListItemId(null);
    listOrderStockFilterBeforeEditRef.current = listStockFilter;
    setListStockFilter("all");
    setMessage("");
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
          isPublic: form.isPublic,
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
              slug: data.list!.slug,
              title: data.list!.title,
              description: data.list!.description ?? null,
              isPublic: data.list!.isPublic,
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
            slug: data.list!.slug,
            title: data.list!.title,
            description: data.list!.description ?? null,
            isPublic: data.list!.isPublic,
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
    if (typeof window !== "undefined") {
      const confirmed = window.confirm("Tem certeza que deseja excluir esta lista?");
      if (!confirmed) {
        return;
      }
    }

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
        if (selectedSavedListId === listId) {
          const remaining = savedLists.filter((list) => list.id !== listId);
          setSelectedSavedListId(remaining[0]?.id ?? null);
        }
        setMessage("Lista removida das salvas.");
      } else {
        const sourceList = lists.find((list) => list.id === listId);
        if (sourceList) {
          setSavedLists((current) => [
            {
              ...sourceList,
              ownerDisplayName: currentUser.displayName,
              ownerUsername: currentUser.username,
              items: [],
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

  async function addTrackedProductToList(
    listId: string,
    input: {
      productId?: string | null;
      monitoredProductId?: string | null;
      resolvedProduct?: FavoriteEntry["product"] | MonitoredProductEntry["product"] | null;
    }
  ): Promise<{ created: boolean }> {
    const response = await fetch(`/api/account/lists/${listId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    const data = (await response.json()) as {
      ok?: boolean;
      created?: boolean;
      error?: string;
      errorDetail?: string;
    };
    if (!response.ok || !data.ok) {
      throw new Error(data.errorDetail || data.error || "list_item_create_failed");
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
      const favorite = input.productId
        ? favorites.find((item) => item.product.id === input.productId)
        : null;
      const monitoredProduct = input.monitoredProductId
        ? monitoredProducts.find((item) => item.id === input.monitoredProductId)
        : null;
      const source = favorite ? "catalog" : "monitored";
      const resolvedProduct = input.resolvedProduct ?? favorite?.product ?? monitoredProduct?.product;
      if (!resolvedProduct) return current;

      return {
        ...current,
        [listId]: {
          ...details,
          items: [
            ...details.items,
            {
              id: `${listId}:${input.productId ?? input.monitoredProductId}`,
              note: null,
              sortOrder: details.items.length,
              source,
              product: resolvedProduct,
            },
          ],
        },
      };
    });

    return { created: Boolean(data.created) };
  }

  async function addSelectedFavoritesToList() {
    if (!selectedListId || selectedTrackedKeys.length === 0) {
      setMessage("Escolha uma lista e selecione pelo menos um produto.");
      return;
    }

    setPendingAction(`bulk-add:${selectedListId}`);
    setMessage("");

    try {
      const orderedSelectedItems = selectedTrackedKeys
        .map((trackedKey) => trackedProductCards.find((item) => item.key === trackedKey))
        .filter((item): item is (typeof trackedProductCards)[number] => Boolean(item));

      for (const trackedItem of orderedSelectedItems) {
        await addTrackedProductToList(selectedListId, {
          productId: trackedItem.productId,
          monitoredProductId: trackedItem.monitoredProductId,
        });
      }
      setSelectedTrackedKeys([]);
      setListPickerOpen(false);
      setMessage("Produtos adicionados a lista na ordem selecionada.");
    } catch (error) {
      console.error("bulk_add_failed", error);
      setMessage(
        error instanceof Error && error.message !== "list_item_create_failed"
          ? `Nao foi possivel adicionar os produtos selecionados: ${error.message}`
          : "Nao foi possivel adicionar os produtos selecionados."
      );
    } finally {
      setPendingAction(null);
    }
  }

  function toggleTrackedSelection(trackedKey: string) {
    setSelectedTrackedKeys((current) =>
      current.includes(trackedKey)
        ? current.filter((id) => id !== trackedKey)
        : [...current, trackedKey]
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
      setSelectedTrackedKeys((current) => current.filter((id) => id !== `favorite:${productId}`));
      setMessage("Favorito removido.");
    } catch (error) {
      console.error("favorite_delete_failed", error);
      setMessage("Nao foi possivel remover o favorito.");
    } finally {
      setPendingAction(null);
    }
  }

  async function removeMonitoredProduct(monitoredProductId: string) {
    setPendingAction(`monitored:${monitoredProductId}`);
    setMessage("");

    try {
      const response = await fetch("/api/account/monitored-products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monitoredProductId }),
      });
      const data = (await response.json()) as { ok?: boolean };

      if (!response.ok || !data.ok) {
        throw new Error("monitored_product_delete_failed");
      }

      setMonitoredProducts((current) => current.filter((item) => item.id !== monitoredProductId));
      setSelectedTrackedKeys((current) =>
        current.filter((id) => id !== `monitored:${monitoredProductId}`)
      );
      setMessage("Produto removido do monitoramento.");
    } catch (error) {
      console.error("monitored_product_delete_failed", error);
      setMessage("Nao foi possivel remover o produto monitorado.");
    } finally {
      setPendingAction(null);
    }
  }

  async function saveTrackedProductsOrder(
    orderedItems: Array<{ source: "favorite" | "monitored"; id: string }>
  ) {
    setPendingAction("reorder:tracked");
    setMessage("");

    try {
      const response = await fetch("/api/account/tracked-products/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedItems }),
      });
      const data = (await response.json()) as { ok?: boolean };

      if (!response.ok || !data.ok) {
        throw new Error("tracked_product_reorder_failed");
      }

      setMessage("Ordem dos produtos monitorados atualizada.");
    } catch (error) {
      console.error("tracked_product_reorder_failed", error);
      setMessage("Nao foi possivel salvar a nova ordem dos produtos monitorados.");
    } finally {
      setPendingAction(null);
    }
  }

  function applyTrackedOrderByKeys(orderedKeys: string[]) {
    const keyOrder = new Map(orderedKeys.map((key, index) => [key, index]));
    const reorderedTrackedItems = [...trackedProductCards]
      .sort((left, right) => (keyOrder.get(left.key) ?? 0) - (keyOrder.get(right.key) ?? 0))
      .map((item, index) => ({
        ...item,
        sortOrder: index,
      }));

    setFavorites((current) =>
      current
        .map((favorite) => {
          const reordered = reorderedTrackedItems.find(
            (item) => item.source === "favorite" && item.entryId === favorite.id
          );
          return reordered ? { ...favorite, sortOrder: reordered.sortOrder ?? favorite.sortOrder } : favorite;
        })
        .sort((left, right) => left.sortOrder - right.sortOrder)
    );
    setMonitoredProducts((current) =>
      current
        .map((monitoredProduct) => {
          const reordered = reorderedTrackedItems.find(
            (item) => item.source === "monitored" && item.entryId === monitoredProduct.id
          );
          return reordered
            ? { ...monitoredProduct, sortOrder: reordered.sortOrder ?? monitoredProduct.sortOrder }
            : monitoredProduct;
        })
        .sort((left, right) => left.sortOrder - right.sortOrder)
    );
  }

  function toggleTrackedReorderSelection(trackedKey: string) {
    setTrackedReorderSelection((current) =>
      current.includes(trackedKey)
        ? current.filter((key) => key !== trackedKey)
        : [...current, trackedKey]
    );
  }

  async function finishTrackedReorder() {
    const orderedKeys = [
      ...trackedReorderSelection,
      ...trackedProductCards
        .map((item) => item.key)
        .filter((key) => !trackedReorderSelection.includes(key)),
    ];

    applyTrackedOrderByKeys(orderedKeys);
    await saveTrackedProductsOrder(
      orderedKeys
        .map((key) => trackedProductCards.find((item) => item.key === key))
        .filter((item): item is (typeof trackedProductCards)[number] => !!item)
        .map((item) => ({
          source: item.source,
          id: item.entryId,
        }))
    );
    setTrackedReorderSelection([]);
    setTrackedReorderMode(false);
  }

  async function suggestComparatorForPrompt() {
    if (!comparatorPrompt) return;

    setPendingAction(`suggest:${comparatorPrompt.asin}`);
    setMessage("");

    try {
      const response = await fetch("/api/account/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asin: comparatorPrompt.asin,
          amazonUrl: comparatorPrompt.amazonUrl,
          title: comparatorPrompt.name,
          notes: "Sugestao enviada a partir de produto monitorado pelo usuario.",
        }),
      });
      const data = (await response.json()) as { ok?: boolean; alreadyExists?: boolean; error?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "suggestion_create_failed");
      }

      setComparatorPrompt(null);
      setMessage(
        data.alreadyExists
          ? "Esse produto ja estava sugerido para o comparador."
          : "Produto enviado para avaliacao de entrada no comparador."
      );
    } catch (error) {
      console.error("suggestion_create_failed", error);
      setMessage("Nao foi possivel enviar a sugestao para o comparador agora.");
    } finally {
      setPendingAction(null);
    }
  }

  async function removeListItem(
    listId: string,
    input: { itemId: string; productId?: string | null; monitoredProductId?: string | null }
  ) {
    setPendingAction(`item:${listId}:${input.itemId}`);
    setMessage("");

    try {
      const response = await fetch(`/api/account/lists/${listId}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: input.itemId,
          productId: input.productId,
          monitoredProductId: input.monitoredProductId,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; errorDetail?: string };

      if (!response.ok || !data.ok) {
        throw new Error(data.errorDetail || data.error || "list_item_delete_failed");
      }

      setLists((current) =>
        current.map((list) =>
          list.id === listId ? { ...list, itemsCount: Math.max(0, list.itemsCount - 1) } : list
        )
      );
      const currentDetails = listDetailsMap[listId];
      const nextItemIds = currentDetails
        ? currentDetails.items
            .filter((item) => item.id !== input.itemId)
            .map((item) => item.id)
        : [];

      if (nextItemIds.length > 0) {
        queueListOrderSave(listId, nextItemIds);
      } else if (listOrderSaveTimerRef.current) {
        window.clearTimeout(listOrderSaveTimerRef.current);
        listOrderSaveTimerRef.current = null;
        listOrderSaveRequestRef.current = null;
      }

      setListDetailsMap((current) => {
        const details = current[listId];
        if (!details) return current;
        return {
          ...current,
          [listId]: {
            ...details,
            items: details.items.filter((item) => item.id !== input.itemId),
          },
        };
      });
      setMessage("Produto removido da lista.");
    } catch (error) {
      console.error("list_item_delete_failed", error);
      setMessage(
        error instanceof Error && error.message !== "list_item_delete_failed"
          ? `Nao foi possivel remover o produto da lista: ${error.message}`
          : "Nao foi possivel remover o produto da lista."
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function moveListItemToList(
    targetListId: string,
    input: ListMoveContext
  ) {
    if (targetListId === input.listId) {
      setMessage("O produto já está nessa lista.");
      return;
    }

    setPendingAction(`move:${input.itemId}`);
    setMessage("");

    try {
      await addTrackedProductToList(targetListId, {
        productId: input.productId,
        monitoredProductId: input.monitoredProductId,
        resolvedProduct: input.resolvedProduct,
      });

      await removeListItem(input.listId, {
        itemId: input.itemId,
        productId: input.productId,
        monitoredProductId: input.monitoredProductId,
      });

      setMessage("Produto movido para a outra lista.");
    } catch (error) {
      console.error("move_list_item_failed", error);
      setMessage("Nao foi possivel mover o produto agora.");
    } finally {
      setPendingAction(null);
      setListMoveContext(null);
    }
  }

  function updateListOrderInState(listId: string, orderedItemIds: string[]) {
    setListDetailsMap((current) => {
      const details = current[listId];
      if (!details) return current;
      if (sameItemOrder(details.items, orderedItemIds)) return current;

      return {
        ...current,
        [listId]: {
          ...details,
          items: reorderListItemsByIds(details.items, orderedItemIds),
        },
      };
    });
  }

  function queueListOrderSave(listId: string, orderedItemIds: string[]) {
    listOrderSaveRequestRef.current = { listId, orderedItemIds };

    if (listOrderSaveTimerRef.current) {
      window.clearTimeout(listOrderSaveTimerRef.current);
    }

    listOrderSaveTimerRef.current = window.setTimeout(() => {
      void flushListOrderSave();
    }, 500);
  }

  async function flushListOrderSave() {
    const pending = listOrderSaveRequestRef.current;
    if (!pending) return;

    if (listOrderSavingRef.current) {
      if (listOrderSaveTimerRef.current) {
        window.clearTimeout(listOrderSaveTimerRef.current);
      }
      listOrderSaveTimerRef.current = window.setTimeout(() => {
        void flushListOrderSave();
      }, 250);
      return;
    }

    if (listOrderSaveTimerRef.current) {
      window.clearTimeout(listOrderSaveTimerRef.current);
      listOrderSaveTimerRef.current = null;
    }

    listOrderSavingRef.current = true;
    try {
      await saveListOrder(pending.listId, pending.orderedItemIds, { silent: true });
      if (listOrderSaveRequestRef.current === pending) {
        listOrderSaveRequestRef.current = null;
      }
    } finally {
      listOrderSavingRef.current = false;
    }
  }

  async function saveListOrder(
    listId: string,
    orderedItemIds: string[],
    options?: { silent?: boolean }
  ) {
    try {
      const response = await fetch(`/api/account/lists/${listId}/items`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedItemIds }),
      });
      const data = (await response.json()) as { ok?: boolean };

      if (!response.ok || !data.ok) {
        throw new Error("list_reorder_failed");
      }

      if (!options?.silent) {
        setMessage("Ordem da lista atualizada.");
      }
    } catch (error) {
      console.error("list_reorder_failed", error);
      setMessage("Nao foi possivel salvar a nova ordem.");
    }
  }

  function commitListOrder(
    listId: string,
    orderedItemIds: string[],
    options?: { persist?: boolean }
  ) {
    const currentList = listDetailsMap[listId];
    if (currentList && sameItemOrder(currentList.items, orderedItemIds)) {
      return;
    }
    updateListOrderInState(listId, orderedItemIds);
    if (options?.persist !== false) {
      queueListOrderSave(listId, orderedItemIds);
    }
  }

  function beginListReorder() {
    if (!openedList) return;
    setListSortMode("manual");
    setListOrderMode(true);
    listOrderStockFilterBeforeEditRef.current = listStockFilter;
    setListStockFilter("all");
    setMessage("");
  }

  async function finishListReorder() {
    if (!openListId) return;
    const currentList = listDetailsMap[openListId];
    if (!currentList) return;

    const orderedItemIds = currentList.items.map((item) => item.id);

    if (listOrderSaveTimerRef.current) {
      window.clearTimeout(listOrderSaveTimerRef.current);
      listOrderSaveTimerRef.current = null;
    }
    listOrderSaveRequestRef.current = null;

    await saveListOrder(openListId, orderedItemIds, { silent: true });
    setActiveListItemId(null);
    setListOrderMode(false);
    if (listOrderStockFilterBeforeEditRef.current !== null) {
      setListStockFilter(listOrderStockFilterBeforeEditRef.current);
      listOrderStockFilterBeforeEditRef.current = null;
    }
  }

  function getCurrentListItemIds(listId: string) {
    const currentList = listDetailsMap[listId];
    return currentList ? currentList.items.map((item) => item.id) : [];
  }

  function reorderCurrentList(listId: string, orderedItemIds: string[], persist = true) {
    commitListOrder(listId, orderedItemIds, { persist });
  }

  function moveListItem(listId: string, itemId: string, direction: -1 | 1) {
    const currentIds = getCurrentListItemIds(listId);
    const fromIndex = currentIds.indexOf(itemId);
    const toIndex = fromIndex + direction;

    if (fromIndex < 0 || toIndex < 0 || toIndex >= currentIds.length) {
      return;
    }

    const nextIds = arrayMove(currentIds, fromIndex, toIndex);
    reorderCurrentList(listId, nextIds);
  }

  function sortCurrentList(
    listId: string,
    sortMode: "price" | "discount" | "alpha"
  ) {
    const currentList = listDetailsMap[listId];
    if (!currentList) return;

    const nextIds = [...currentList.items]
      .sort((left, right) => {
        if (sortMode === "price") {
          return left.product.totalPrice - right.product.totalPrice;
        }
        if (sortMode === "alpha") {
          return left.product.name.localeCompare(right.product.name, "pt-BR");
        }

        const leftAverage = left.product.averagePrice30d ?? left.product.totalPrice;
        const rightAverage = right.product.averagePrice30d ?? right.product.totalPrice;
        const leftDiscount =
          left.product.totalPrice > 0 && leftAverage > left.product.totalPrice
            ? Math.round(((leftAverage - left.product.totalPrice) / leftAverage) * 100)
            : 0;
        const rightDiscount =
          right.product.totalPrice > 0 && rightAverage > right.product.totalPrice
            ? Math.round(((rightAverage - right.product.totalPrice) / rightAverage) * 100)
            : 0;

        if (rightDiscount !== leftDiscount) {
          return rightDiscount - leftDiscount;
        }

        return left.product.totalPrice - right.product.totalPrice;
      })
      .map((item) => item.id);

    reorderCurrentList(listId, nextIds);
  }

  function handleListDragStart(event: DragStartEvent) {
    setActiveListItemId(String(event.active.id));
  }

  function handleListDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveListItemId(null);

    if (!openListId || !openedList || !over) return;
    if (active.id === over.id) {
      return;
    }

    const currentIds = getCurrentListItemIds(openListId);
    const fromIndex = currentIds.indexOf(String(active.id));
    const toIndex = currentIds.indexOf(String(over.id));

    if (fromIndex < 0 || toIndex < 0) return;

    const nextIds = arrayMove(currentIds, fromIndex, toIndex);
    commitListOrder(openListId, nextIds);
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

      <section className="overflow-hidden rounded-[32px] border border-[#d5d9d9] bg-white shadow-sm">
        <div className="bg-[linear-gradient(135deg,#10131A_0%,#253243_52%,#384657_100%)] px-5 py-6 text-white sm:px-6 sm:py-7 md:px-8 md:py-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative">
                {profileAvatarUrl ? (
                  <Image
                    src={profileAvatarUrl}
                    alt={profileDisplayName || "Perfil"}
                    width={112}
                    height={112}
                    className="h-20 w-20 rounded-full border-4 border-white/15 object-cover sm:h-24 sm:w-24 md:h-28 md:w-28"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white/15 bg-[#9F43BF] text-3xl font-black text-white sm:h-24 sm:w-24 md:h-28 md:w-28 md:text-4xl">
                    {(profileDisplayName || currentUser.email || "U").charAt(0).toUpperCase()}
                  </div>
                )}

                <button
                  type="button"
                  onClick={openAvatarPicker}
                  className="absolute bottom-0 right-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white text-[#FF8F1F] shadow-sm transition hover:scale-[1.02] sm:h-9 sm:w-9 md:bottom-1 md:right-1 md:h-10 md:w-10"
                  aria-label="Trocar foto"
                >
                  <Upload className="h-4 w-4" />
                </button>
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#FFD37A] sm:text-xs sm:uppercase sm:tracking-[0.22em]">
                  Minha conta
                </p>
                <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl md:mt-3 md:text-4xl">
                  {profileDisplayName}
                </h2>
                <p className="mt-1 text-lg font-semibold text-white/85 sm:mt-2 sm:text-xl">
                  @{profileUsername || "sem-username"}
                </p>
              </div>
            </div>

            <div className="w-full sm:max-w-[320px]">
              <button
                type="button"
                onClick={() => setShowProfileEditor((current) => !current)}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15 sm:h-12 sm:px-5"
              >
                <Pencil className="h-4 w-4" />
                <span className="sm:hidden">{showProfileEditor ? "Fechar" : "Editar"}</span>
                <span className="hidden sm:inline">
                  {showProfileEditor ? "Fechar edicao" : "Editar perfil"}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 sm:mt-6 md:mt-8">
            <div className="rounded-3xl border border-white/10 bg-white/8 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <CalendarDays className="h-4 w-4 shrink-0 text-[#FFD37A] sm:h-5 sm:w-5" />
                <div>
                  <p className="text-[10px] font-bold text-white/60 sm:text-xs sm:uppercase sm:tracking-[0.16em]">
                    <span className="sm:hidden">Desde</span>
                    <span className="hidden sm:inline">Membro desde</span>
                  </p>
                  <p className="mt-1 text-sm font-black text-white sm:text-lg">
                    {formatDate(profileStats.memberSince)}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void loadActivity("comments")}
              className="rounded-3xl border border-white/10 bg-white/8 px-3 py-3 text-left backdrop-blur-sm transition hover:bg-white/10 sm:px-4 sm:py-4"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <MessageCircle className="h-4 w-4 shrink-0 text-[#FFD37A] sm:h-5 sm:w-5" />
                <div>
                  <p className="text-[10px] font-bold text-white/60 sm:text-xs sm:uppercase sm:tracking-[0.16em]">
                    Comentários
                  </p>
                  <p className="mt-1 text-sm font-black text-white sm:text-lg">
                    {profileStats.commentsCount}
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => void loadActivity("reactions")}
              className="rounded-3xl border border-white/10 bg-white/8 px-3 py-3 text-left backdrop-blur-sm transition hover:bg-white/10 sm:px-4 sm:py-4"
            >
              <div className="flex items-center gap-2 sm:gap-3">
                <Heart className="h-4 w-4 shrink-0 text-[#FFD37A] sm:h-5 sm:w-5" />
                <div>
                  <p className="text-[10px] font-bold text-white/60 sm:text-xs sm:uppercase sm:tracking-[0.16em]">
                    <span className="sm:hidden">Reações</span>
                    <span className="hidden sm:inline">Reações a comentários</span>
                  </p>
                  <p className="mt-1 text-sm font-black text-white sm:text-lg">
                    {profileStats.commentReactionsCount}
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {!currentUser.isEmailVerified ? (
          <div className="border-t border-[#EAECF0] bg-[#FFF7E6] px-6 py-5 md:px-8">
            <div className="flex flex-col gap-3 rounded-3xl border border-[#F7B955] bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#B54708]">
                  Confirmacao pendente
                </p>
                <p className="mt-2 text-sm font-medium text-[#7A2E0E]">
                  Para ativarmos a sua conta na Amazonpicks, precisamos que voce confirme o seu
                  endereco de email em <span className="font-bold">{currentUser.email}</span>.
                </p>
                <p className="mt-2 text-sm text-[#7A2E0E]">
                  Enquanto essa confirmação não for feita, listas, produtos salvos, comentários e
                  outras interações ficam bloqueadas.
                </p>
                {verificationMessage ? (
                  <p className="mt-2 text-sm font-semibold text-[#B54708]">{verificationMessage}</p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => void handleResendVerificationEmail()}
                disabled={resendingVerification}
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-2xl border border-[#F7B955] bg-[#FFF1CC] px-4 text-sm font-bold text-[#B54708] transition hover:bg-[#FFE7A3] disabled:opacity-60"
              >
                {resendingVerification ? "Reenviando..." : "Reenviar confirmacao"}
              </button>
            </div>
          </div>
        ) : null}

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
                  type="button"
                  onClick={sendPasswordResetLink}
                  disabled={pendingAction === "security:reset"}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#D0D5DD] bg-white px-4 text-sm font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA] disabled:opacity-60"
                >
                  {pendingAction === "security:reset" ? "Enviando link..." : "Trocar senha"}
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

      <section className="rounded-[32px] border border-[#d5d9d9] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="mt-2 text-3xl font-black text-[#0F1111]">Listas</h3>
            <p className="mt-2 max-w-3xl text-sm text-[#565959]">
              Crie listas personalizadas, acompanhe produtos e compartilhe facilmente quando quiser.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setListTab("mine");
              setShowCreateList(true);
            }}
            className="inline-flex h-10 items-center justify-center rounded-full px-1 text-sm font-semibold text-[#2162A1] transition hover:text-[#174e87]"
          >
            Criar uma lista
          </button>
        </div>

        <div className="mt-6 border-b border-[#EAECF0]">
          <div className="-mb-px flex gap-6 overflow-x-auto">
            <button
              type="button"
              onClick={() => {
                setListTab("mine");
                setShowCreateList(false);
              }}
              className={`border-b-2 px-1 pb-3 text-base font-bold transition ${
                listTab === "mine"
              ? "border-[#2162A1] text-[#0F1111]"
                  : "border-transparent text-[#667085] hover:text-[#0F1111]"
              }`}
            >
              Suas listas
            </button>
            <button
              type="button"
              onClick={() => {
                setListTab("saved");
                setShowCreateList(false);
              }}
              className={`border-b-2 px-1 pb-3 text-base font-bold transition ${
                listTab === "saved"
                  ? "border-[#2162A1] text-[#0F1111]"
                  : "border-transparent text-[#667085] hover:text-[#0F1111]"
              }`}
            >
              Listas salvas
            </button>
          </div>
        </div>

        {showCreateList && listTab === "mine" ? (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/55 px-4 py-6">
            <div className="w-full max-w-[640px] overflow-hidden rounded-[18px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
              <div className="flex items-center justify-between border-b border-[#D5D9D9] px-5 py-4">
                <h4 className="text-[22px] font-black text-[#0F1111]">Criar uma nova lista</h4>
                <button
                  type="button"
                  onClick={() => setShowCreateList(false)}
                  className="rounded-full p-1 text-[#565959] transition hover:bg-[#F5F5F5] hover:text-[#0F1111]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form
                onSubmit={createList}
                className="space-y-5 px-5 py-5 md:px-6 md:py-6"
              >
                <div>
                  <label className="mb-2 block text-sm font-semibold text-[#0F1111]">
                    Nome da lista (obrigatório)
                  </label>
                  <input
                    type="text"
                    value={listTitle}
                    onChange={(event) => setListTitle(event.target.value)}
                    placeholder="Lista de Compras 3"
                    className="h-12 w-full rounded-2xl border border-[#D0D5DD] px-4 text-sm outline-none transition focus:border-[#2162A1]"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <p className="text-sm leading-6 text-[#0F1111]">
                    Use listas para salvar itens para mais tarde. Todas as listas são privadas,
                    a menos que você as compartilhe com outras pessoas.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateList(false)}
                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#D0D5DD] bg-white px-5 text-sm font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingList}
                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#FFD814] px-5 text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00] disabled:opacity-70"
                  >
                    {creatingList ? "Criando..." : "Criar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {listTab === "mine" ? (
          lists.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-[#D0D5DD] bg-[#F8FAFA] px-4 py-10 text-center text-sm text-[#565959]">
              Nenhuma lista criada ainda.
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-[30px] border border-[#D8DEE6] bg-white shadow-sm">
              <div className="grid xl:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="border-b border-[#EAECF0] bg-[#FAFBFC] xl:border-b-0 xl:border-r">
                  <div className="px-3 py-3">
                    <div className="flex gap-3 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible">
                      {lists.map((list) => {
                        const selected = selectedListId === list.id;
                        return (
                          <button
                            key={list.id}
                            type="button"
                            onClick={() => {
                              setSelectedListId(list.id);
                              void openListViewer(list.id);
                            }}
                            className={`min-w-[240px] rounded-[18px] border px-4 py-3 text-left transition xl:min-w-0 ${
                              selected
                                ? "border-[#D8DEE6] bg-[#F3F4F6]"
                                : "border-[#E5E7EB] bg-white hover:border-[#D0D5DD] hover:bg-[#FCFCFD]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-[#0F1111]">
                                  {list.title}
                                </p>
                                <p className="mt-1 line-clamp-1 text-xs text-[#667085]">
                                  {list.description ?? (list.isDefault ? "Lista padrão" : "Sem descrição")}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                                  list.isPublic
                                    ? "bg-[#ECFDF3] text-[#027A48]"
                                    : "bg-[#F2F4F7] text-[#475467]"
                                }`}
                              >
                                {list.isPublic ? "Pública" : "Privada"}
                              </span>
                            </div>
                            {selected ? (
                              <div className="mt-2 text-xs font-semibold text-[#2162A1]">Selecionada</div>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </aside>

                <div className="min-w-0 bg-white">
                  {isCurrentListLoading ? (
                    <div className="space-y-4 p-4 md:p-5">
                      <div className="h-6 w-32 animate-pulse rounded-full bg-[#EEF2F6]" />
                      <div className="h-10 w-72 animate-pulse rounded-2xl bg-[#EEF2F6]" />
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_220px]">
                        <div className="h-11 animate-pulse rounded-2xl bg-[#EEF2F6]" />
                        <div className="h-11 animate-pulse rounded-2xl bg-[#EEF2F6]" />
                        <div className="h-11 animate-pulse rounded-2xl bg-[#EEF2F6]" />
                      </div>
                      <div className="space-y-3">
                        {[0, 1].map((item) => (
                          <div
                            key={item}
                            className="grid gap-4 rounded-[24px] border border-[#EAECF0] p-4 lg:grid-cols-[104px_minmax(0,1fr)_210px]"
                          >
                            <div className="aspect-square animate-pulse rounded-2xl bg-[#EEF2F6]" />
                            <div className="space-y-2">
                              <div className="h-4 w-24 animate-pulse rounded-full bg-[#EEF2F6]" />
                              <div className="h-6 w-3/4 animate-pulse rounded-full bg-[#EEF2F6]" />
                              <div className="h-4 w-1/2 animate-pulse rounded-full bg-[#EEF2F6]" />
                            </div>
                            <div className="space-y-2">
                              <div className="h-14 animate-pulse rounded-2xl bg-[#EEF2F6]" />
                              <div className="h-10 animate-pulse rounded-full bg-[#EEF2F6]" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : currentOpenedList ? (
                    <>
                      <div className="border-b border-[#EAECF0] px-4 py-4 md:px-5">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                                  currentOpenedList.isPublic
                                    ? "bg-[#ECFDF3] text-[#027A48]"
                                    : "bg-[#F2F4F7] text-[#475467]"
                                }`}
                              >
                                {currentOpenedList.isPublic ? (
                                  <Globe className="h-3.5 w-3.5" />
                                ) : (
                                  <Lock className="h-3.5 w-3.5" />
                                )}
                                {currentOpenedList.isPublic ? "Pública" : "Privada"}
                              </span>
                              {currentOpenedList.isPublic ? (
                                <Link
                                  href={
                                    currentUser.username
                                      ? buildPublicListPath(
                                          currentUser.username,
                                          currentOpenedList.slug
                                        )
                                      : `/listas/${currentOpenedList.slug}`
                                  }
                                  className="inline-flex h-8 items-center justify-center gap-2 rounded-full border border-[#D0D5DD] bg-white px-3 text-xs font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA]"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Abrir link
                                </Link>
                              ) : null}
                            </div>
                            <h4 className="mt-3 text-[24px] font-black leading-tight text-[#0F1111]">
                              {currentOpenedList.title}
                            </h4>
                            {currentOpenedList.description ? (
                              <p className="mt-2 max-w-3xl text-sm text-[#565959]">
                                {currentOpenedList.description}
                              </p>
                            ) : (
                              <p className="mt-2 text-sm text-[#98A2B3]">Sem descrição.</p>
                            )}
                          </div>

                          <div className="relative flex flex-wrap items-start gap-2">
                            {!listOrderMode ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setMonitoredProductUrl("");
                                  setShowInlineListAddProduct(true);
                                }}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#D0D5DD] bg-white px-4 text-sm font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA]"
                              >
                                <Plus className="h-4 w-4" />
                                Adicionar produto
                              </button>
                            ) : null}

                            {listEditorId === currentOpenedList.id && !listOrderMode ? (
                              <button
                                type="button"
                                onClick={() => setListEditorId(null)}
                                className="inline-flex h-10 items-center justify-center rounded-full border border-[#D0D5DD] bg-white px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#F8FAFA]"
                              >
                                Cancelar edição
                              </button>
                            ) : null}

                            <button
                              type="button"
                              onClick={() => {
                                void openListEditor(currentOpenedList.id);
                              }}
                              aria-label="Editar lista"
                              disabled={loadingListId === currentOpenedList.id}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D0D5DD] bg-white text-[#0F1111] transition hover:bg-[#F8FAFA] disabled:opacity-60"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {showInlineListAddProduct && !listOrderMode ? (
                          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#0F1111]/45 px-4 py-6">
                            <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-[#D8DEE6] bg-white shadow-[0_24px_70px_rgba(15,17,17,0.22)]">
                              <div className="flex items-start justify-between gap-4 border-b border-[#EAECF0] px-5 py-4">
                                <div>
                                  <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#007185]">
                                    Adicionar à lista
                                  </p>
                                  <h4 className="mt-2 text-[20px] font-black text-[#0F1111]">
                                    {currentOpenedList.title}
                                  </h4>
                                  <p className="mt-1 text-sm text-[#667085]">
                                    Cole um link da Amazon ou o ASIN. O produto entra direto nesta lista.
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowInlineListAddProduct(false)}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#D0D5DD] text-[#344054] transition hover:bg-[#F8FAFA]"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>

                              <form onSubmit={addMonitoredProduct} className="space-y-4 px-5 py-5">
                                <input
                                  autoFocus
                                  type="text"
                                  value={monitoredProductUrl}
                                  onChange={(event) => setMonitoredProductUrl(event.target.value)}
                                  placeholder="Cole o link ou o ASIN do produto da Amazon"
                                  className="h-12 w-full rounded-2xl border border-[#D0D5DD] bg-white px-4 text-sm text-[#0F1111] outline-none transition focus:border-[#F3A847]"
                                />

                                <div className="flex items-center justify-end gap-3">
                                  <button
                                    type="button"
                                    onClick={() => setShowInlineListAddProduct(false)}
                                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#D0D5DD] px-4 text-sm font-semibold text-[#344054] transition hover:bg-[#F8FAFA]"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="submit"
                                    disabled={addingMonitoredProduct}
                                    className="inline-flex h-11 items-center justify-center rounded-full bg-[#FFD814] px-5 text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00] disabled:opacity-70"
                                  >
                                    {addingMonitoredProduct ? "Adicionando..." : "Adicionar"}
                                  </button>
                                </div>
                              </form>
                            </div>
                          </div>
                        ) : null}

                        {editingList && listEditorId === editingList.id && !listOrderMode ? (
                          <div className="fixed inset-0 z-[125] flex items-center justify-center bg-[#0F1111]/45 px-4 py-6">
                            <div className="w-full max-w-[640px] overflow-hidden rounded-[18px] bg-white shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                              <div className="flex items-center justify-between border-b border-[#D5D9D9] px-5 py-4">
                                <h4 className="text-[22px] font-black text-[#0F1111]">Editar lista</h4>
                                <button
                                  type="button"
                                  onClick={() => setListEditorId(null)}
                                  className="rounded-full p-1 text-[#565959] transition hover:bg-[#F5F5F5] hover:text-[#0F1111]"
                                >
                                  <X className="h-5 w-5" />
                                </button>
                              </div>

                              <form
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  void saveListEdits(editingList.id);
                                }}
                                className="space-y-5 px-5 py-5 md:px-6 md:py-6"
                              >
                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-[#0F1111]">
                                    Nome da lista
                                  </label>
                                  <input
                                    type="text"
                                    value={listForms[editingList.id]?.title ?? editingList.title}
                                    onChange={(event) =>
                                      setListForms((current) => ({
                                        ...current,
                                        [editingList.id]: {
                                          title: event.target.value,
                                          description:
                                            current[editingList.id]?.description ??
                                            editingList.description ??
                                            "",
                                          isPublic:
                                            current[editingList.id]?.isPublic ?? editingList.isPublic,
                                        },
                                      }))
                                    }
                                    className="h-12 w-full rounded-2xl border border-[#D0D5DD] px-4 text-sm outline-none transition focus:border-[#2162A1]"
                                    placeholder="Nome da lista"
                                  />
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-[#0F1111]">
                                    Privacidade
                                  </label>
                                  <div className="grid grid-cols-2 gap-3">
                                    {[
                                      { value: false, label: "Particular" },
                                      { value: true, label: "Pública" },
                                    ].map((option) => {
                                      const checked =
                                        (listForms[editingList.id]?.isPublic ?? editingList.isPublic) ===
                                        option.value;

                                      return (
                                        <label
                                          key={option.label}
                                          className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                                            checked
                                              ? "border-[#2162A1] bg-[#EEF5FC] text-[#0F1111]"
                                              : "border-[#D0D5DD] bg-white text-[#344054] hover:bg-[#F8FAFA]"
                                          }`}
                                        >
                                          <span>{option.label}</span>
                                          <input
                                            type="radio"
                                            name={`list-privacy-${editingList.id}`}
                                            checked={checked}
                                            onChange={() =>
                                              setListForms((current) => ({
                                                ...current,
                                                [editingList.id]: {
                                                  title:
                                                    current[editingList.id]?.title ?? editingList.title,
                                                  description:
                                                    current[editingList.id]?.description ??
                                                    editingList.description ??
                                                    "",
                                                  isPublic: option.value,
                                                },
                                              }))
                                            }
                                            className="h-4 w-4 accent-[#2162A1]"
                                          />
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>

                                <div>
                                  <label className="mb-2 block text-sm font-semibold text-[#0F1111]">
                                    Descrição
                                  </label>
                                  <textarea
                                    value={
                                      listForms[editingList.id]?.description ??
                                      editingList.description ??
                                      ""
                                    }
                                    onChange={(event) =>
                                      setListForms((current) => ({
                                        ...current,
                                        [editingList.id]: {
                                          title:
                                            current[editingList.id]?.title ?? editingList.title,
                                          description: event.target.value,
                                          isPublic:
                                            current[editingList.id]?.isPublic ?? editingList.isPublic,
                                        },
                                      }))
                                    }
                                    rows={4}
                                    placeholder="Descrição opcional"
                                    className="w-full rounded-2xl border border-[#D0D5DD] px-4 py-3 text-sm outline-none transition focus:border-[#2162A1]"
                                  />
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setListEditorId(null);
                                    }}
                                    className="inline-flex h-11 items-center justify-center rounded-full border border-[#D0D5DD] bg-white px-5 text-sm font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA]"
                                  >
                                    Cancelar
                                  </button>

                                  <div className="flex flex-wrap items-center gap-3">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        setListEditorId(null);
                                        await deleteList(editingList.id);
                                      }}
                                      className="inline-flex h-11 items-center justify-center rounded-full border border-[#FECDCA] bg-white px-5 text-sm font-semibold text-[#B42318] transition hover:bg-[#FEF3F2]"
                                    >
                                      Excluir lista
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void saveListEdits(editingList.id)}
                                      disabled={pendingAction === `edit:${editingList.id}`}
                                      className="inline-flex h-11 items-center justify-center rounded-full bg-[#FFD814] px-5 text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00] disabled:opacity-60"
                                    >
                                      {pendingAction === `edit:${editingList.id}`
                                        ? "Salvando..."
                                        : "Salvar alterações"}
                                    </button>
                                  </div>
                                </div>
                              </form>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="px-4 py-4 md:px-5">
                        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_220px]">
                          <label className="relative block">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                            <input
                              type="search"
                              value={listSearchQuery}
                              onChange={(event) => setListSearchQuery(event.target.value)}
                              placeholder="Buscar nesta lista"
                              className="h-11 w-full rounded-2xl border border-[#D0D5DD] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#F3A847] disabled:opacity-60"
                            />
                          </label>
                          <select
                            value={listStockFilter}
                            onChange={(event) =>
                              setListStockFilter(
                                event.target.value === "out_of_stock" ||
                                  event.target.value === "all"
                                  ? event.target.value
                                  : "in_stock"
                              )
                            }
                            className="h-11 rounded-2xl border border-[#D0D5DD] bg-white px-4 text-sm outline-none transition focus:border-[#F3A847] disabled:opacity-60"
                          >
                            <option value="in_stock">Mostrar: Em estoque</option>
                            <option value="out_of_stock">Mostrar: Sem estoque</option>
                            <option value="all">Mostrar: Todos os itens</option>
                          </select>
                          <select
                            value={listSortMode}
                            onChange={(event) =>
                              setListSortMode(
                                event.target.value === "discount" ||
                                  event.target.value === "price_asc" ||
                                  event.target.value === "price_desc" ||
                                  event.target.value === "alpha" ||
                                  event.target.value === "manual"
                                  ? event.target.value
                                  : "manual"
                              )
                            }
                            className="h-11 rounded-2xl border border-[#D0D5DD] bg-white px-4 text-sm outline-none transition focus:border-[#F3A847] disabled:opacity-60"
                          >
                            <option value="manual">Classificar por: personalizado</option>
                            <option value="discount">Classificar por: melhor desconto</option>
                            <option value="price_asc">Classificar por: preço menor</option>
                            <option value="price_desc">Classificar por: preço maior</option>
                            <option value="alpha">Classificar por: nome</option>
                          </select>
                        </div>

                        {currentOpenedList.items.length === 0 ? (
                          <div className="mt-5 rounded-3xl border border-dashed border-[#D0D5DD] bg-[#F8FAFA] px-4 py-10 text-center text-sm text-[#565959]">
                            Essa lista ainda nao tem produtos.
                          </div>
                        ) : canDragListItems ? (
                          <div className="mt-5">
                            <DndContext
                              sensors={listOrderSensors}
                              collisionDetection={closestCenter}
                              onDragStart={handleListDragStart}
                              onDragEnd={handleListDragEnd}
                            >
                              <SortableContext
                                items={filteredOpenedListItems.map((item) => item.id)}
                                strategy={rectSortingStrategy}
                              >
                                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                                  {filteredOpenedListItems.map((item, index) => (
                                    <SortableListCard
                                      key={item.id}
                                      sortableId={item.id}
                                      item={getListItemBestDeal(item)}
                                      menuOpen={activeListItemId === item.id}
                                      onToggleMenu={() =>
                                        setActiveListItemId((current) =>
                                          current === item.id ? null : item.id
                                        )
                                      }
                                      onMoveToAnotherList={() => {
                                        setActiveListItemId(null);
                                        setListMoveContext({
                                          listId: currentOpenedList.id,
                                          itemId: item.id,
                                          productId: item.source === "catalog" ? item.product.id : null,
                                          monitoredProductId:
                                            item.source === "monitored" ? item.product.id : null,
                                          resolvedProduct: item.product,
                                          productName: item.product.name,
                                        });
                                      }}
                                      onRemove={() => {
                                        setActiveListItemId(null);
                                        void removeListItem(currentOpenedList.id, {
                                          itemId: item.id,
                                          productId: item.source === "catalog" ? item.product.id : null,
                                          monitoredProductId:
                                            item.source === "monitored" ? item.product.id : null,
                                        });
                                      }}
                                      removeDisabled={pendingAction === `item:${currentOpenedList.id}:${item.id}`}
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          </div>
                        ) : filteredOpenedListItems.length === 0 ? (
                          <div className="mt-5 rounded-3xl border border-dashed border-[#D0D5DD] bg-[#F8FAFA] px-4 py-10 text-center text-sm text-[#565959]">
                            Nenhum produto encontrado com estes filtros.
                          </div>
                        ) : (
                          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-3 2xl:grid-cols-4">
                            {filteredOpenedListItems.map((item, index) => {
                              const itemMenuOpen = activeListItemId === item.id;
                              const bestDealItem = getListItemBestDeal(item);

                              return (
                                <div
                                  key={item.id}
                                  className="overflow-hidden rounded-[24px] border border-[#E6EAF0] bg-white shadow-[0_6px_18px_rgba(15,17,17,0.03)]"
                                >
                                  <div className="relative" data-list-item-menu-root={item.id}>
                                    <div className="absolute right-3 top-3 z-30">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setActiveListItemId((current) =>
                                            current === item.id ? null : item.id
                                          )
                                        }
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#D0D5DD] bg-white text-[#344054] shadow-sm transition hover:bg-[#F8FAFA]"
                                        aria-haspopup="menu"
                                        aria-expanded={itemMenuOpen}
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </button>

                                      {itemMenuOpen ? (
                                        <div className="absolute right-0 top-11 z-20 w-56 overflow-hidden rounded-2xl border border-[#D0D5DD] bg-white shadow-[0_18px_40px_rgba(15,17,17,0.12)]">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveListItemId(null);
                                              setListMoveContext({
                                                listId: currentOpenedList.id,
                                                itemId: item.id,
                                                productId: item.source === "catalog" ? item.product.id : null,
                                                monitoredProductId:
                                                  item.source === "monitored" ? item.product.id : null,
                                                resolvedProduct: item.product,
                                                productName: item.product.name,
                                              });
                                            }}
                                            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA]"
                                          >
                                            <ListPlus className="h-4 w-4 text-[#667085]" />
                                            Mover para outra lista
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveListItemId(null);
                                              void removeListItem(currentOpenedList.id, {
                                                itemId: item.id,
                                                productId: item.source === "catalog" ? item.product.id : null,
                                                monitoredProductId:
                                                  item.source === "monitored" ? item.product.id : null,
                                              });
                                            }}
                                            disabled={pendingAction === `item:${currentOpenedList.id}:${item.id}`}
                                            className="flex w-full items-center gap-3 border-t border-[#EAECF0] px-4 py-3 text-left text-sm font-semibold text-[#B42318] transition hover:bg-[#FEF3F2] disabled:opacity-60"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                            {pendingAction === `item:${currentOpenedList.id}:${item.id}`
                                              ? "Removendo..."
                                              : "Excluir"}
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>

                                    <BestDealProductCard
                                      item={bestDealItem}
                                      category="lista_aberta"
                                      compact
                                      showActions={false}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-[420px] items-center justify-center px-6 py-10 text-center">
                      <div className="max-w-md">
                        <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#007185]">
                          Selecione uma lista
                        </p>
                        <h4 className="mt-2 text-2xl font-black text-[#0F1111]">
                          Abra uma lista para visualizar os produtos
                        </h4>
                        <p className="mt-2 text-sm leading-6 text-[#667085]">
                          Use a lateral para trocar entre as suas listas. O conteúdo abre aqui na mesma tela.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        ) : savedLists.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-[#D0D5DD] bg-[#F8FAFA] px-4 py-10 text-center text-sm text-[#565959]">
            Nenhuma lista salva ainda.
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-[30px] border border-[#D8DEE6] bg-white shadow-sm">
            <div className="grid xl:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="border-b border-[#EAECF0] bg-[#FAFBFC] xl:border-b-0 xl:border-r">
                <div className="px-3 py-3">
                  <div className="flex gap-3 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible">
                    {savedLists.map((list) => {
                      const selected = selectedSavedListId === list.id;
                      return (
                        <button
                          key={list.id}
                          type="button"
                          onClick={() => setSelectedSavedListId(list.id)}
                          className={`min-w-[240px] rounded-[18px] border px-4 py-3 text-left transition xl:min-w-0 ${
                            selected
                              ? "border-[#D8DEE6] bg-[#F3F4F6]"
                              : "border-[#E5E7EB] bg-white hover:border-[#D0D5DD] hover:bg-[#FCFCFD]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-[#0F1111]">{list.title}</p>
                              <p className="mt-1 line-clamp-1 text-xs text-[#667085]">
                                {list.ownerDisplayName}
                                {list.ownerUsername ? ` @${list.ownerUsername}` : ""}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-full bg-[#F2F4F7] px-2.5 py-1 text-[10px] font-bold text-[#344054]">
                              {list.itemsCount}
                            </span>
                          </div>
                          {selected ? (
                            <div className="mt-2 text-xs font-semibold text-[#2162A1]">Selecionada</div>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </aside>

              <div className="min-w-0 bg-white">
                {selectedSavedList ? (
                  <>
                    <div className="border-b border-[#EAECF0] px-4 py-4 md:px-5">
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-bold text-[#027A48]">
                              <Globe className="h-3.5 w-3.5" />
                              Pública
                            </span>
                            <span className="rounded-full bg-[#F2F4F7] px-3 py-1 text-xs font-bold text-[#344054]">
                              {selectedSavedList.itemsCount} item
                              {selectedSavedList.itemsCount === 1 ? "" : "s"}
                            </span>
                            <Link
                              href={
                                selectedSavedList.ownerUsername
                                  ? buildPublicListPath(
                                      selectedSavedList.ownerUsername,
                                      selectedSavedList.slug
                                    )
                                  : `/listas/${selectedSavedList.slug}`
                              }
                              className="inline-flex h-8 items-center justify-center gap-2 rounded-full border border-[#D0D5DD] bg-white px-3 text-xs font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA]"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Abrir link
                            </Link>
                          </div>
                          <h4 className="mt-3 text-[24px] font-black leading-tight text-[#0F1111]">
                            {selectedSavedList.title}
                          </h4>
                          {selectedSavedList.description ? (
                            <p className="mt-2 max-w-3xl text-sm text-[#565959]">
                              {selectedSavedList.description}
                            </p>
                          ) : (
                            <p className="mt-2 text-sm text-[#98A2B3]">Sem descrição.</p>
                          )}
                          <p className="mt-2 text-sm text-[#667085]">
                            Lista criada por {selectedSavedList.ownerDisplayName}
                            {selectedSavedList.ownerUsername
                              ? ` @${selectedSavedList.ownerUsername}`
                              : ""}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-start gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSaveList(selectedSavedList.id, true)}
                            disabled={pendingAction === `save-list:${selectedSavedList.id}`}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#D0D5DD] bg-white px-4 text-sm font-semibold text-[#0F1111] transition hover:bg-[#F8FAFA] disabled:opacity-60"
                          >
                            <Heart className="h-4 w-4" />
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-4 md:px-5">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px_220px]">
                        <label className="relative block">
                          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98A2B3]" />
                          <input
                            type="search"
                            value={listSearchQuery}
                            onChange={(event) => setListSearchQuery(event.target.value)}
                            placeholder="Buscar nesta lista"
                            className="h-11 w-full rounded-2xl border border-[#D0D5DD] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#F3A847] disabled:opacity-60"
                          />
                        </label>
                        <select
                          value={listStockFilter}
                          onChange={(event) =>
                            setListStockFilter(
                              event.target.value === "out_of_stock" || event.target.value === "all"
                                ? event.target.value
                                : "in_stock"
                            )
                          }
                          className="h-11 rounded-2xl border border-[#D0D5DD] bg-white px-4 text-sm outline-none transition focus:border-[#F3A847] disabled:opacity-60"
                        >
                          <option value="in_stock">Mostrar: Em estoque</option>
                          <option value="out_of_stock">Mostrar: Sem estoque</option>
                          <option value="all">Mostrar: Todos os itens</option>
                        </select>
                        <select
                          value={listSortMode}
                          onChange={(event) =>
                            setListSortMode(
                              event.target.value === "discount" ||
                                event.target.value === "price_asc" ||
                                event.target.value === "price_desc" ||
                                event.target.value === "alpha" ||
                                event.target.value === "manual"
                                ? event.target.value
                                : "manual"
                            )
                          }
                          className="h-11 rounded-2xl border border-[#D0D5DD] bg-white px-4 text-sm outline-none transition focus:border-[#F3A847] disabled:opacity-60"
                        >
                          <option value="manual">Classificar por: personalizado</option>
                          <option value="discount">Classificar por: melhor desconto</option>
                          <option value="price_asc">Classificar por: preço menor</option>
                          <option value="price_desc">Classificar por: preço maior</option>
                          <option value="alpha">Classificar por: nome</option>
                        </select>
                      </div>

                      {filteredSavedListItems.length === 0 ? (
                        <div className="mt-5 rounded-3xl border border-dashed border-[#D0D5DD] bg-[#F8FAFA] px-4 py-10 text-center text-sm text-[#565959]">
                          {selectedSavedList.items.length === 0
                            ? "Essa lista ainda nao tem produtos."
                            : listSearchQuery
                              ? "Nenhum produto encontrado com estes filtros."
                              : "Todos os produtos desta lista estao sem estoque no momento."}
                        </div>
                      ) : (
                        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
                          {filteredSavedListItems.map((item) => {
                            const bestDealItem = getListItemBestDeal(item);
                            return (
                              <BestDealProductCard
                                key={item.id}
                                item={bestDealItem}
                                category="lista_salva"
                                compact
                                showActions={false}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[240px] items-center justify-center rounded-[24px] border border-dashed border-[#D0D5DD] bg-[#F8FAFA] px-6 py-10 text-center">
                    <div className="max-w-sm">
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-[#007185]">
                        Selecione uma lista salva
                      </p>
                      <h4 className="mt-2 text-2xl font-black text-[#0F1111]">
                        Abra uma lista para ver os produtos
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-[#667085]">
                        Escolha uma coleção salva na lateral para abrir a visualização à direita.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

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

      {false ? (
        <section className="rounded-[32px] border border-[#d5d9d9] bg-white p-6 shadow-sm md:p-8">
          <div className="flex justify-start">
            <button
              type="button"
              onClick={() => setShowSuggestionComposer((current) => !current)}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[#D0D5DD] bg-white px-4 text-sm font-bold text-[#0F1111] transition hover:bg-[#F8FAFA]"
            >
              <span>Deseja adicionar um item ao nosso comparador</span>
              <Plus
                className={`h-4 w-4 transition-transform ${showSuggestionComposer ? "rotate-45" : ""}`}
              />
            </button>
          </div>

          {showSuggestionComposer ? (
            <form onSubmit={submitSuggestion} className="mt-6 space-y-4">
              <div className="max-w-3xl">
                <p className="text-sm text-[#565959]">
                  Envie o link da Amazon e uma descricao rapida. Vamos revisar e avaliar se esse
                  item faz sentido no catalogo.
                </p>
              </div>

              <div className="grid gap-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-[#344054]">Link da Amazon</span>
                  <input
                    type="url"
                    value={suggestionUrl}
                    onChange={(event) => setSuggestionUrl(event.target.value)}
                    placeholder="https://www.amazon.com.br/..."
                    className="h-12 w-full rounded-2xl border border-[#D0D5DD] px-4 text-sm outline-none transition focus:border-[#F3A847]"
                  />
                </label>
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#344054]">Por que vale adicionar?</span>
                <textarea
                  value={suggestionNotes}
                  onChange={(event) => setSuggestionNotes(event.target.value)}
                  placeholder="Conte o que e o produto, em qual categoria ele entraria ou qualquer detalhe util."
                  rows={4}
                  className="w-full rounded-2xl border border-[#D0D5DD] px-4 py-3 text-sm outline-none transition focus:border-[#F3A847]"
                  required
                />
              </label>

              {suggestionMessage ? (
                <p className="text-sm font-medium text-[#475467]">{suggestionMessage}</p>
              ) : null}

              <button
                type="submit"
                disabled={submittingSuggestion}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#FFD814] px-5 text-sm font-black text-[#0F1111] transition hover:bg-[#F7CA00] disabled:opacity-60"
              >
                {submittingSuggestion ? "Enviando sugestao..." : "Enviar sugestao"}
              </button>
            </form>
          ) : suggestionMessage ? (
            <p className="mt-6 text-sm font-medium text-[#475467]">{suggestionMessage}</p>
          ) : null}
        </section>
      ) : null}

      {listMoveContext ? (
        <AccountListPickerModal
          open={Boolean(listMoveContext)}
          productId={listMoveContext.productId ?? undefined}
          monitoredProductId={listMoveContext.monitoredProductId ?? undefined}
          productName={listMoveContext.productName}
          initialSelectedListIds={[]}
          selectionMode="single"
          actionLabel="Mover"
          onConfirmSingleList={async (list) => {
            await moveListItemToList(list.id, listMoveContext);
          }}
          onClose={() => setListMoveContext(null)}
        />
      ) : null}
    </div>
  );
}

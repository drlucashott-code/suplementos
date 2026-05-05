"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import BestDealProductCard from "@/components/BestDealProductCard";
import type { BestDeal } from "@/lib/bestDeals";

type ListOrderProductCardProps = {
  sortableId: string;
  item: BestDeal;
  index: number;
  editMode: boolean;
  disableNavigation?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  canMoveDown?: boolean;
  removeDisabled?: boolean;
};

export default function ListOrderProductCard({
  sortableId,
  item,
  index,
  editMode,
  disableNavigation = false,
  onMoveUp,
  onMoveDown,
  onRemove,
  canMoveDown = true,
  removeDisabled = false,
}: ListOrderProductCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: sortableId,
      disabled: !editMode,
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
        opacity: isDragging ? 0.9 : 1,
        zIndex: isDragging ? 20 : 0,
      }}
      className={`space-y-2 rounded-2xl ${editMode ? "bg-[#ECFDF3] ring-2 ring-[#16A34A] ring-offset-2 ring-offset-[#E3E6E6]" : ""}`}
    >
      <div className="relative rounded-xl">
        <BestDealProductCard
          item={item}
          category="edicao_lista"
          showActions={false}
          disableNavigation={disableNavigation || editMode}
        />

        <div className="pointer-events-none absolute left-2 top-2 z-30">
          <div className="inline-flex items-center gap-1 rounded-full border border-[#D0D5DD] bg-white px-2.5 py-1 text-xs font-bold text-[#344054] shadow-sm">
            <span>Pos.</span>
            <span>{index + 1}</span>
          </div>
        </div>

        {editMode ? (
          <div className="absolute right-2 top-2 z-30">
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
        ) : null}

        {isDragging ? (
          <div className="pointer-events-none absolute inset-0 z-20 rounded-xl border-2 border-dashed border-[#16A34A] bg-[#DCFCE7]/20" />
        ) : null}
      </div>

      {editMode ? (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-[#D0D5DD] bg-white px-3 text-xs font-bold text-[#344054] transition hover:bg-[#F8FAFA] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Mover para cima"
          >
            <ArrowUp className="h-3.5 w-3.5" />
            <span>Subir</span>
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-[#D0D5DD] bg-white px-3 text-xs font-bold text-[#344054] transition hover:bg-[#F8FAFA] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Mover para baixo"
          >
            <ArrowDown className="h-3.5 w-3.5" />
            <span>Descer</span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onRemove}
          disabled={removeDisabled}
          className="inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#FECDCA] bg-[#FEF3F2] px-3 text-xs font-bold text-[#B42318] transition hover:bg-[#FEE4E2] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Remover da lista
        </button>
      )}
    </div>
  );
}

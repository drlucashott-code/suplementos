// Espelha a FloatingFiltersBar real: barra sticky full-width, controles
// alinhados à direita no desktop (botão de filtros + "Classificar" + select).
export function FloatingFiltersBarSkeleton() {
  return (
    <div className="sticky top-14 z-30 border-b border-zinc-200 bg-white px-3 py-2 shadow-sm">
      <div className="flex w-full animate-pulse items-center gap-3 lg:justify-end">
        {/* Botão de filtros (mobile) */}
        <div className="h-[38px] w-[42px] shrink-0 rounded-lg bg-gray-200 lg:hidden" />

        <div className="flex flex-1 items-center gap-2 lg:flex-none">
          {/* Label "Classificar:" (desktop) */}
          <div className="hidden h-3 w-20 rounded bg-gray-200 lg:block" />
          {/* Select */}
          <div className="h-[38px] flex-1 rounded-lg border border-gray-200 bg-gray-100 lg:w-[280px] lg:flex-none" />
        </div>
      </div>
    </div>
  );
}

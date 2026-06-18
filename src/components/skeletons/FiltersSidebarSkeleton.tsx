// Espelha a DesktopFiltersSidebar real: seções (título + lista de opções com
// checkbox), até ~6 itens visíveis por seção e um "Ver mais".
function FilterSectionSkeleton({ rows }: { rows: number }) {
  return (
    <div>
      <div className="mb-2 h-4 w-24 rounded bg-gray-200" />
      <ul className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <li key={index} className="flex items-center gap-2">
            <span className="h-4 w-4 shrink-0 rounded border border-[#888C8C] bg-white" />
            <span
              className="h-3 rounded bg-gray-200"
              style={{ width: `${55 + ((index * 13) % 35)}%` }}
            />
          </li>
        ))}
      </ul>
      <div className="mt-2 h-3 w-20 rounded bg-gray-100" />
    </div>
  );
}

export function DesktopFiltersSidebarSkeleton() {
  return (
    <div className="animate-pulse space-y-4 pr-1">
      <FilterSectionSkeleton rows={6} />
      <FilterSectionSkeleton rows={4} />
      <FilterSectionSkeleton rows={6} />
      <FilterSectionSkeleton rows={5} />
    </div>
  );
}

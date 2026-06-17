"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Props = {
  totalItems: number;
  pageSize: number;
  currentPage: number;
};

function buildPageList(current: number, total: number): (number | "...")[] {
  const pages: (number | "...")[] = [];
  const push = (value: number | "...") => pages.push(value);

  const windowStart = Math.max(2, current - 1);
  const windowEnd = Math.min(total - 1, current + 1);

  push(1);
  if (windowStart > 2) push("...");
  for (let page = windowStart; page <= windowEnd; page += 1) push(page);
  if (windowEnd < total - 1) push("...");
  if (total > 1) push(total);

  return pages;
}

export function Pagination({ totalItems, pageSize, currentPage }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalPages <= 1) return null;

  const hrefFor = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page <= 1) params.delete("page");
    else params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  const pages = buildPageList(currentPage, totalPages);
  const baseBox =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-3 text-[13px] transition";
  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
      aria-label="Paginação"
    >
      {prevDisabled ? (
        <span className={`${baseBox} cursor-not-allowed border-[#E3E6E6] text-[#aaa]`}>
          ‹ Anterior
        </span>
      ) : (
        <Link
          href={hrefFor(currentPage - 1)}
          scroll
          className={`${baseBox} border-[#D5D9D9] text-[#0F1111] hover:bg-[#F7FAFA]`}
        >
          ‹ Anterior
        </Link>
      )}

      {pages.map((page, index) =>
        page === "..." ? (
          <span
            key={`ellipsis-${index}`}
            className="inline-flex h-9 min-w-9 items-center justify-center px-1 text-[13px] text-[#888]"
          >
            …
          </span>
        ) : page === currentPage ? (
          <span
            key={page}
            aria-current="page"
            className={`${baseBox} border-[#E47911] bg-[#FEF8F2] font-bold text-[#0F1111]`}
          >
            {page}
          </span>
        ) : (
          <Link
            key={page}
            href={hrefFor(page)}
            scroll
            className={`${baseBox} border-[#D5D9D9] text-[#0F1111] hover:bg-[#F7FAFA]`}
          >
            {page}
          </Link>
        )
      )}

      {nextDisabled ? (
        <span className={`${baseBox} cursor-not-allowed border-[#E3E6E6] text-[#aaa]`}>
          Próximo ›
        </span>
      ) : (
        <Link
          href={hrefFor(currentPage + 1)}
          scroll
          className={`${baseBox} border-[#D5D9D9] text-[#0F1111] hover:bg-[#F7FAFA]`}
        >
          Próximo ›
        </Link>
      )}
    </nav>
  );
}

export default Pagination;

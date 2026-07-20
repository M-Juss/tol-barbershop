"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getPaginationPages } from "@/lib/table-query";
import { cn } from "@/lib/utils";

type TablePaginationProps = {
  currentPage: number;
  lastPage: number;
  getPageHref: (page: number) => string;
  onPageChange: (page: number) => void;
  disabled?: boolean;
};

export function TablePagination({
  currentPage,
  lastPage,
  getPageHref,
  onPageChange,
  disabled = false,
}: TablePaginationProps) {
  if (lastPage <= 1) return null;

  const navigate = (
    event: React.MouseEvent<HTMLAnchorElement>,
    page: number,
  ) => {
    event.preventDefault();
    if (!disabled && page !== currentPage) onPageChange(page);
  };
  const previousPage = Math.max(1, currentPage - 1);
  const nextPage = Math.min(lastPage, currentPage + 1);

  return (
    <Pagination className="overflow-hidden px-1">
      <PaginationContent className="flex-nowrap gap-0.5">
        <PaginationItem>
          <PaginationPrevious
            href={getPageHref(previousPage)}
            className={cn(
              "h-8 w-8 sm:h-9 sm:w-auto",
              (disabled || currentPage === 1) && "pointer-events-none opacity-50",
            )}
            text=""
            aria-disabled={disabled || currentPage === 1}
            tabIndex={disabled || currentPage === 1 ? -1 : undefined}
            onClick={(event) => navigate(event, previousPage)}
          />
        </PaginationItem>
        {getPaginationPages(currentPage, lastPage).map((page, index) =>
          page === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${index}`}>
              <PaginationEllipsis className="size-7 sm:size-8" />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <PaginationLink
                href={getPageHref(page)}
                isActive={page === currentPage}
                className={cn(
                  "h-7 w-7 rounded-lg text-xs font-medium sm:h-8 sm:w-8 sm:text-sm",
                  disabled && "pointer-events-none opacity-50",
                )}
                aria-disabled={disabled}
                tabIndex={disabled ? -1 : undefined}
                onClick={(event) => navigate(event, page)}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          ),
        )}
        <PaginationItem>
          <PaginationNext
            href={getPageHref(nextPage)}
            className={cn(
              "h-8 w-8 sm:h-9 sm:w-auto",
              (disabled || currentPage === lastPage) &&
                "pointer-events-none opacity-50",
            )}
            text=""
            aria-disabled={disabled || currentPage === lastPage}
            tabIndex={disabled || currentPage === lastPage ? -1 : undefined}
            onClick={(event) => navigate(event, nextPage)}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}

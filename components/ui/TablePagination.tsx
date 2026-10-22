"use client";

import React, { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
  itemLabel?: string; // e.g. "รายการ", "แปลง", "คน"
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 30, 50, 100],
  onPageChange,
  onPageSizeChange,
  className = "",
  itemLabel = "รายการ",
}: TablePaginationProps) {
  const safeCurrentPage = Math.min(Math.max(1, currentPage), Math.max(1, totalPages));
  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const pageNumbers = useMemo(() => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) {
        pages.push("ellipsis");
      }
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) {
        pages.push("ellipsis");
      }
      pages.push(totalPages);
    }
    return pages;
  }, [safeCurrentPage, totalPages]);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 ${className}`}
    >
      {/* Left side: Item count info & Page size selector */}
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div className="text-slate-500 font-medium">
          แสดง{" "}
          <strong className="text-slate-900 dark:text-white font-bold">
            {startItem.toLocaleString()}
          </strong>{" "}
          -{" "}
          <strong className="text-slate-900 dark:text-white font-bold">
            {endItem.toLocaleString()}
          </strong>{" "}
          จากทั้งหมด{" "}
          <strong className="text-slate-900 dark:text-white font-bold">
            {totalItems.toLocaleString()}
          </strong>{" "}
          {itemLabel}
        </div>

        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-slate-400">แสดงหน้าละ:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-xs"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <span className="text-slate-400">{itemLabel}</span>
        </div>
      </div>

      {/* Right side: Page navigation */}
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage <= 1}
          className="h-8 w-8 p-0 rounded-lg border-slate-200 dark:border-slate-700"
          title="หน้าแรก"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          className="h-8 w-8 p-0 rounded-lg border-slate-200 dark:border-slate-700"
          title="หน้าก่อนหน้า"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (p === "ellipsis") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 text-slate-400 select-none font-bold"
                >
                  …
                </span>
              );
            }
            const isActive = p === safeCurrentPage;
            return (
              <Button
                key={p}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(p)}
                className={`h-8 min-w-[32px] px-2 rounded-lg font-bold text-xs ${
                  isActive
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
                }`}
              >
                {p}
              </Button>
            );
          })}
        </div>

        {/* Mobile current page indicator */}
        <span className="sm:hidden px-2 font-semibold text-slate-700 dark:text-slate-300">
          {safeCurrentPage} / {totalPages}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
          className="h-8 w-8 p-0 rounded-lg border-slate-200 dark:border-slate-700"
          title="หน้าถัดไป"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage >= totalPages}
          className="h-8 w-8 p-0 rounded-lg border-slate-200 dark:border-slate-700"
          title="หน้าสุดท้าย"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * Reusable client-side pagination hook
 */
export function useTablePagination<T>(
  items: T[],
  defaultPageSize: number = 10,
  pageSizeOptions: number[] = [10, 20, 30, 50, 100]
) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(defaultPageSize);

  const totalItems = items?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  // If page is out of range when items change, auto-adjust safely
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages >= 1) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedItems = useMemo(() => {
    if (!items || items.length === 0) return [];
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, safeCurrentPage, pageSize]);

  const handlePageChange = React.useCallback(
    (page: number) => {
      setCurrentPage(Math.min(Math.max(1, page), totalPages));
    },
    [totalPages]
  );

  const handlePageSizeChange = React.useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  return {
    currentPage: safeCurrentPage,
    pageSize,
    totalPages,
    totalItems,
    paginatedItems,
    pageSizeOptions,
    setCurrentPage: handlePageChange,
    setPageSize: handlePageSizeChange,
    resetPage: () => setCurrentPage(1),
  };
}

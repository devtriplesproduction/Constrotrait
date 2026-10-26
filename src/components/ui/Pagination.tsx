"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Dropdown } from "./Dropdown";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
  siblingCount?: number;
  showFirstLast?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  itemLabel = "entries",
  className,
  siblingCount = 1,
  showFirstLast = false,
}: PaginationProps) {
  // If no items or only 1 page without page size changer, we can return null if totalPages <= 1 and no totalItems
  if (totalPages <= 1 && (!pageSizeOptions || pageSizeOptions.length === 0) && (!totalItems || totalItems === 0)) {
    return null;
  }

  // Calculate start & end index for "Showing X to Y of Z"
  const startItem = totalItems && pageSize ? (currentPage - 1) * pageSize + 1 : null;
  const endItem = totalItems && pageSize ? Math.min(currentPage * pageSize, totalItems) : null;

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const totalPageNumbers = siblingCount * 2 + 5; // siblingCount + first + last + current + 2*dots

    if (totalPages <= totalPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
      return [...leftRange, "...", totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = Array.from(
        { length: rightItemCount },
        (_, i) => totalPages - rightItemCount + i + 1
      );
      return [1, "...", ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [1, "...", ...middleRange, "...", totalPages];
    }

    return [];
  };

  const pages = getPageNumbers();

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/80 shadow-xs text-xs text-slate-600 transition-all",
        className
      )}
    >
      {/* Information & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-2.5">
        {totalItems !== undefined && startItem !== null && endItem !== null ? (
          <span className="font-medium text-slate-600">
            Showing <span className="font-semibold text-slate-900">{totalItems > 0 ? startItem : 0}</span> to{" "}
            <span className="font-semibold text-slate-900">{endItem}</span> of{" "}
            <span className="font-semibold text-slate-900">{totalItems}</span> {itemLabel}
          </span>
        ) : (
          <span className="font-medium text-slate-600">
            Page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
            <span className="font-semibold text-slate-900">{Math.max(1, totalPages)}</span>
          </span>
        )}

        {pageSizeOptions && pageSizeOptions.length > 0 && onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-[11px] text-slate-400">|</span>
            <span className="text-[11px] text-slate-500 font-medium">Show</span>
            <div className="w-[74px]">
              <Dropdown
                options={pageSizeOptions.map((opt) => ({
                  label: String(opt),
                  value: String(opt),
                }))}
                value={pageSize ? String(pageSize) : undefined}
                onChange={(val) => onPageSizeChange(Number(val))}
                buttonClassName="h-7 text-xs font-semibold px-2 py-0 bg-slate-50 hover:bg-slate-100 border-slate-200 rounded-lg text-slate-700 shadow-2xs"
                iconClassName="w-3.5 h-3.5 text-slate-400 ml-1"
                className="w-full space-y-0"
                menuWidth="80px"
                placement="top"
                itemClassName="py-1 px-2 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First Page (optional) */}
          {showFirstLast && (
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              title="First Page"
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            title="Previous Page"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer font-medium shadow-2xs text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Numbered Page Buttons */}
          <div className="flex items-center gap-1 mx-0.5">
            {pages.map((p, idx) => {
              if (p === "...") {
                return (
                  <span key={`dots-${idx}`} className="px-1.5 text-slate-400 font-bold select-none text-xs">
                    …
                  </span>
                );
              }

              const pageNum = p as number;
              const isActive = pageNum === currentPage;

              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={cn(
                    "min-w-[28px] h-7 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center",
                    isActive
                      ? "bg-orange-600 text-white shadow-xs shadow-orange-500/30 border border-orange-600"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            title="Next Page"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer font-medium shadow-2xs text-xs"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last Page (optional) */}
          {showFirstLast && (
            <button
              type="button"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
              title="Last Page"
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shadow-2xs"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

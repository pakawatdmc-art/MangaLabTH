"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TablePaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export function TablePagination({ currentPage, totalPages, onPageChange }: TablePaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="mt-4 flex items-center justify-between pt-4">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className={cn(
                    "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors duration-200",
                    currentPage <= 1
                        ? "cursor-not-allowed bg-ink-900/30 text-ink-600"
                        : "bg-ink-900/60 text-ink-300 hover:bg-ink-800 hover:text-ink-100"
                )}
            >
                <ChevronLeft className="h-3.5 w-3.5" />
                ก่อนหน้า
            </button>

            <span className="text-xs text-ink-400">
                หน้า <span className="font-semibold text-ink-200">{currentPage}</span> / {totalPages}
            </span>

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={cn(
                    "flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors duration-200",
                    currentPage >= totalPages
                        ? "cursor-not-allowed bg-ink-900/30 text-ink-600"
                        : "bg-ink-900/60 text-ink-300 hover:bg-ink-800 hover:text-ink-100"
                )}
            >
                ถัดไป
                <ChevronRight className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

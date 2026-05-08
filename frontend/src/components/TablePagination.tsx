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
        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-4">
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                    currentPage <= 1
                        ? "cursor-not-allowed border-white/5 text-gray-600"
                        : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                )}
            >
                <ChevronLeft className="h-3.5 w-3.5" />
                ก่อนหน้า
            </button>

            <span className="text-xs text-gray-500">
                หน้า <span className="font-semibold text-gray-300">{currentPage}</span> / {totalPages}
            </span>

            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition",
                    currentPage >= totalPages
                        ? "cursor-not-allowed border-white/5 text-gray-600"
                        : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                )}
            >
                ถัดไป
                <ChevronRight className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

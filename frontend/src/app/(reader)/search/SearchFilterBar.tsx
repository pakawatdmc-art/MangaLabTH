"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, X, Loader2 } from "lucide-react";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/types";
import type { MangaCategory, MangaStatus } from "@/lib/types";

interface Props {
  initialQ: string;
  initialCategory: string;
  initialStatus: string;
  initialSort: string;
}

export default function SearchFilterBar({
  initialQ,
  initialCategory,
  initialStatus,
  initialSort,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState(initialCategory);
  const [statusVal, setStatusVal] = useState(initialStatus);
  const [sort, setSort] = useState(initialSort);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRun = useRef(true);

  // Sync URL whenever filters change (debounce only the q text input)
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const apply = () => {
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (category) sp.set("category", category);
      if (statusVal) sp.set("status", statusVal);
      if (sort && sort !== "latest") sp.set("sort", sort);
      const qs = sp.toString();
      const url = qs ? `/search?${qs}` : "/search";
      startTransition(() => router.replace(url, { scroll: false }));
    };

    // Debounce only text typing; selects apply instantly
    debounceRef.current = setTimeout(apply, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, statusVal, sort]);

  const clearAll = () => {
    setQ("");
    setCategory("");
    setStatusVal("");
    setSort("latest");
  };

  const hasActiveFilter = q.trim() !== "" || category !== "" || statusVal !== "" || sort !== "latest";

  const categories = Object.entries(CATEGORY_LABELS) as [MangaCategory, string][];
  const statuses = Object.entries(STATUS_LABELS) as [MangaStatus, string][];

  return (
    <section className="mb-6 rounded-md bg-ink-800/70 p-4 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-end">
        {/* Search input */}
        <div className="md:col-span-6">
          <label htmlFor="q" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            ค้นหา
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input
              id="q"
              name="q"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ชื่อเรื่อง หรือ คำในเรื่องย่อ…"
              autoComplete="off"
              className="h-10 w-full rounded-sm bg-ink-900 pl-9 pr-9 text-sm text-ink-100 placeholder:text-ink-500 transition focus:ring-1 focus:ring-gold/40 focus:outline-none"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="ล้างคำค้นหา"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xs p-1 text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {isPending && (
              <Loader2 className="pointer-events-none absolute right-9 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-gold" />
            )}
          </div>
        </div>

        {/* Category */}
        <div className="md:col-span-2">
          <label htmlFor="category" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            หมวดหมู่
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 w-full rounded-sm bg-ink-900 px-3 text-sm text-ink-100 transition focus:ring-1 focus:ring-gold/40 focus:outline-none"
          >
            <option value="">ทุกหมวดหมู่</option>
            {categories.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div className="md:col-span-2">
          <label htmlFor="status" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            สถานะ
          </label>
          <select
            id="status"
            value={statusVal}
            onChange={(e) => setStatusVal(e.target.value)}
            className="h-10 w-full rounded-sm bg-ink-900 px-3 text-sm text-ink-100 transition focus:ring-1 focus:ring-gold/40 focus:outline-none"
          >
            <option value="">ทุกสถานะ</option>
            {statuses.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="md:col-span-2">
          <label htmlFor="sort" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            เรียงตาม
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 w-full rounded-sm bg-ink-900 px-3 text-sm text-ink-100 transition focus:ring-1 focus:ring-gold/40 focus:outline-none"
          >
            <option value="latest">ล่าสุด</option>
            <option value="updated">อัปเดตล่าสุด</option>
            <option value="views">ยอดเข้าชม</option>
          </select>
        </div>
      </div>

      {hasActiveFilter && (
        <div className="mt-3 flex items-center justify-end">
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 rounded-xs px-2 py-1 text-xs font-medium text-ink-400 transition-colors hover:text-gold"
          >
            <X className="h-3 w-3" />
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      )}
    </section>
  );
}

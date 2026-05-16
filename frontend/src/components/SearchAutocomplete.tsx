"use client";

import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { getMangaList } from "@/lib/api";
import type { Manga } from "@/lib/types";

export function SearchAutocomplete({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(defaultValue);
  const [debouncedQuery, setDebouncedQuery] = useState(defaultValue);
  const [results, setResults] = useState<Manga[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle clicking outside to close (covers both anchor and portal dropdown)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const inAnchor = dropdownRef.current?.contains(target);
      const inPortal = portalRef.current?.contains(target);
      if (!inAnchor && !inPortal) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Recompute dropdown position when shown / on scroll / resize
  useLayoutEffect(() => {
    if (!isFocused) return;
    const update = () => {
      const el = dropdownRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPos({ top: r.bottom + 8, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isFocused]);

  // Debounce logic
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Fetch results when debounced query changes
  useEffect(() => {
    async function fetchResults() {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const res = await getMangaList({ q: debouncedQuery, per_page: 5 });
        setResults(res.items || []);
      } catch (err) {
        console.error("Failed to fetch search suggestions", err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchResults();
  }, [debouncedQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsFocused(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSelect = (slug: string) => {
    setIsFocused(false);
    router.push(`/manga/${slug}`);
  };

  const showDropdown = isFocused && query.trim() !== "";

  return (
    <div className="relative mx-auto w-full max-w-xl" ref={dropdownRef}>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-md bg-ink-800/70 p-1.5 backdrop-blur-xl transition-shadow focus-within:ring-1 focus-within:ring-gold/40"
      >
        <div className="flex-1 relative flex items-center">
          <Search className="ml-3 h-4 w-4 shrink-0 text-ink-400" />
          <input
            type="text"
            name="q"
            placeholder="ค้นหามังงะที่อยากอ่าน..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            autoComplete="off"
            className="w-full bg-transparent px-3 py-2.5 text-sm text-ink-100 placeholder-ink-400 focus:outline-none focus-visible:shadow-none"
            style={{ boxShadow: "none" }}
          />
          {isLoading && query.trim() === debouncedQuery && (
            <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-ink-400" />
          )}
        </div>
        <button
          type="submit"
          className="rounded-sm bg-gold px-6 py-2.5 text-sm font-semibold text-ink-950 transition-colors duration-200 hover:bg-gold-light"
        >
          ค้นหา
        </button>
      </form>

      {/* Autocomplete Dropdown — rendered via portal to escape parent stacking contexts */}
      {showDropdown && mounted && createPortal(
        <div
          ref={portalRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
          className="overflow-hidden rounded-md bg-ink-900/95 shadow-2xl backdrop-blur-xl"
        >
          {isLoading && results.length === 0 ? (
            <div className="flex items-center justify-center p-6 text-sm text-ink-300">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังค้นหา...
            </div>
          ) : results.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto w-full py-2">
              {results.map((manga) => (
                <li key={manga.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(manga.slug)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-ink-800"
                  >
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-xs bg-ink-800">
                      {manga.cover_url ? (
                        <Image
                          src={manga.cover_url}
                          alt={manga.title}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Search className="h-4 w-4 text-ink-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <p className="truncate text-sm font-medium text-ink-100">
                        {manga.title}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
                  className="flex w-full items-center justify-center bg-ink-950/40 p-3 text-xs font-semibold text-gold hover:bg-ink-800 transition-colors"
                >
                  ดูผลลัพธ์ทั้งหมดสำหรับ &quot;{query}&quot;
                </button>
              </li>
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Search className="mb-2 h-7 w-7 text-ink-500" />
              <p className="text-sm font-medium text-ink-200">ไม่พบมังงะที่คุณค้นหา</p>
              <p className="mt-1 text-xs text-ink-400">ลองใช้คำค้นหาอื่นดูสิครับ</p>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

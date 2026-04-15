"use client";

import { useState, useEffect, useRef } from "react";
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

  // Handle clicking outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        className="flex items-center gap-2 rounded-3xl bg-surface-100/40 p-2 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl transition focus-within:ring-white/20"
      >
        <div className="flex-1 relative flex items-center">
          <input
            type="text"
            name="q"
            placeholder="ค้นหามังงะที่อยากอ่าน..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            autoComplete="off"
            className="w-full bg-transparent px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none"
          />
          {isLoading && query.trim() === debouncedQuery && (
            <Loader2 className="absolute right-4 h-4 w-4 animate-spin text-gray-400" />
          )}
        </div>
        <button
          type="submit"
          className="rounded-2xl bg-gold px-8 py-3 text-sm font-bold text-black shadow-lg shadow-gold/20 transition hover:bg-gold-light hover:shadow-gold/40"
        >
          ค้นหา
        </button>
      </form>

      {/* Autocomplete Dropdown */}
      {showDropdown && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-surface-200/95 shadow-2xl backdrop-blur-xl">
          {isLoading && results.length === 0 ? (
            <div className="flex items-center justify-center p-6 text-sm text-gray-400">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> กำลังค้นหา...
            </div>
          ) : results.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto w-full py-2">
              {results.map((manga) => (
                <li key={manga.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(manga.slug)}
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition hover:bg-white/5"
                  >
                    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-surface-300 ring-1 ring-white/10">
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
                          <Search className="h-4 w-4 text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-center">
                      <p className="truncate text-sm font-semibold text-white/90">
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
                  className="flex w-full items-center justify-center border-t border-white/5 bg-black/20 p-3 text-xs font-medium text-gold hover:bg-white/5 transition"
                >
                  ดูผลลัพธ์ทั้งหมดสำหรับ &quot;{query}&quot;
                </button>
              </li>
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Search className="mb-2 h-8 w-8 text-gray-600" />
              <p className="text-sm font-medium text-gray-400">ไม่พบมังงะที่คุณค้นหา</p>
              <p className="mt-1 text-xs text-gray-500">ลองใช้คำค้นหาอื่นดูสิครับ</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

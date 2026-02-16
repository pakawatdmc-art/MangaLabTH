import { getMangaList } from "@/lib/api";
import type { MangaCategory, MangaStatus } from "@/lib/types";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/types";
import MangaCard from "@/components/MangaCard";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search as SearchIcon } from "lucide-react";

interface Props {
  searchParams: Promise<{
    page?: string;
    category?: string;
    status?: string;
    q?: string;
    sort?: string;
  }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const category = (params.category || undefined) as MangaCategory | undefined;
  const status = (params.status || undefined) as MangaStatus | undefined;
  const q = params.q || undefined;
  const sort = params.sort || "latest";

  let data;
  try {
    data = await getMangaList({ page, per_page: 24, category, status, q, sort });
  } catch {
    data = { items: [], total: 0, page: 1, per_page: 24, pages: 0 };
  }

  const categories = Object.entries(CATEGORY_LABELS) as [MangaCategory, string][];
  const statuses = Object.entries(STATUS_LABELS) as [MangaStatus, string][];

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = {
      category: category || "",
      status: status || "",
      q: q || "",
      sort,
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    return `/search?${p.toString()}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-white">
        <SearchIcon className="mr-2 inline-block h-6 w-6 text-gold" />
        ค้นหามังงะ
      </h1>

      {/* Filters */}
      <section className="mb-6 rounded-2xl bg-surface-100/70 p-4 ring-1 ring-white/10 sm:p-5">
        <form method="get" action="/search" className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-5">
            <label htmlFor="q" className="mb-1 block text-xs text-gray-400">ค้นหา</label>
            <input
              id="q"
              name="q"
              type="text"
              defaultValue={q}
              placeholder="ชื่อเรื่อง หรือ คำอธิบาย"
              className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white placeholder:text-gray-500 focus:border-gold/60 focus:outline-none"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="category" className="mb-1 block text-xs text-gray-400">หมวดหมู่</label>
            <select
              id="category"
              name="category"
              defaultValue={category || ""}
              className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
            >
              <option value="">ทุกหมวดหมู่</option>
              {categories.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="status" className="mb-1 block text-xs text-gray-400">สถานะ</label>
            <select
              id="status"
              name="status"
              defaultValue={status || ""}
              className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
            >
              <option value="">ทุกสถานะ</option>
              {statuses.map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="sort" className="mb-1 block text-xs text-gray-400">เรียงตาม</label>
            <select
              id="sort"
              name="sort"
              defaultValue={sort}
              className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
            >
              <option value="latest">ล่าสุด</option>
              <option value="views">ยอดเข้าชม</option>
            </select>
          </div>
          <div className="flex items-end md:col-span-1">
            <button
              type="submit"
              className="h-10 w-full rounded-lg bg-gold text-sm font-semibold text-black transition hover:bg-gold-light"
            >
              ค้นหา
            </button>
          </div>
        </form>
      </section>

      {/* Results */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {q ? `ผลการค้นหา "${q}"` : "มังงะทั้งหมด"} — {data.total} เรื่อง
        </p>
      </div>

      {data.items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {data.items.map((manga) => (
            <MangaCard key={manga.id} manga={manga} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-surface-100/60 py-20 text-center ring-1 ring-white/5">
          <p className="text-gray-300">ไม่พบเรื่องที่ตรงเงื่อนไข</p>
        </div>
      )}

      {data.pages > 1 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={buildUrl({ page: String(page - 1) })}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-surface-100 px-3 text-sm text-gray-300 ring-1 ring-white/10"
            >
              <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
            </Link>
          )}
          <span className="inline-flex h-9 items-center rounded-lg bg-gold/20 px-3 text-sm text-gold ring-1 ring-gold/30">
            หน้า {page} / {data.pages}
          </span>
          {page < data.pages && (
            <Link
              href={buildUrl({ page: String(page + 1) })}
              className="inline-flex h-9 items-center gap-1 rounded-lg bg-surface-100 px-3 text-sm text-gray-300 ring-1 ring-white/10"
            >
              ถัดไป <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

import { Suspense } from "react";
import { getMangaList } from "@/lib/api";
import type { MangaCategory, MangaStatus } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";
import MangaCard from "@/components/MangaCard";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Search as SearchIcon,
  Sparkles,
} from "lucide-react";

interface Props {
  searchParams: Promise<{
    page?: string;
    category?: string;
    status?: string;
    q?: string;
    sort?: string;
  }>;
}

export default async function HomePage({ searchParams }: Props) {
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

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { category: category || "", status: status || "", q: q || "", sort, ...overrides };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    return `/?${p.toString()}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Hero */}
      <section className="mb-8 text-center sm:mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
          อ่านการ์ตูนง่ายขึ้น{" "}
          <span className="text-gold">ในที่เดียว</span>
        </h1>

        <p className="mt-3 text-sm text-gray-400 sm:text-base">
          ค้นหาเรื่องที่ชอบ กรองตามหมวดหมู่ และอ่านต่อได้ทันที
        </p>
      </section>

      {/* Search + Filters */}
      <section className="mb-8 rounded-2xl bg-surface-100/70 p-4 ring-1 ring-white/10 sm:p-5">
        <form method="get" action="/" className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-6">
            <label htmlFor="q" className="mb-1 block text-xs text-gray-400">
              ค้นหาเรื่อง
            </label>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                id="q"
                name="q"
                type="text"
                defaultValue={q}
                placeholder="พิมพ์ชื่อเรื่องหรือคำจากเรื่องย่อ"
                className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-gold/60 focus:outline-none"
              />
            </div>
          </div>
          <div className="md:col-span-3">
            <label htmlFor="sort" className="mb-1 block text-xs text-gray-400">
              เรียงตาม
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={sort}
              className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
            >
              <option value="latest">เพิ่มล่าสุด</option>
              <option value="views">ยอดเข้าชมมากสุด</option>
            </select>
          </div>
          <div className="flex items-end gap-2 md:col-span-3">
            <button
              type="submit"
              className="h-10 rounded-lg bg-gold px-4 text-sm font-semibold text-black transition hover:bg-gold-light"
            >
              ค้นหา
            </button>
            <Link
              href="/"
              className="inline-flex h-10 items-center rounded-lg bg-surface-200 px-4 text-sm text-gray-300 transition hover:bg-surface-50 hover:text-white"
            >
              ล้าง
            </Link>
          </div>
        </form>
      </section>

      {/* Category chips */}
      <section className="mb-8">
        <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto pb-2">
          <Link
            href={buildUrl({ category: undefined, page: undefined })}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ring-1 transition ${!category
              ? "bg-gold/20 text-gold ring-gold/40"
              : "bg-surface-100 text-gray-300 ring-white/10 hover:text-white"
              }`}
          >
            ทั้งหมด
          </Link>
          {categories.map(([val, label]) => (
            <Link
              key={val}
              href={buildUrl({ category: val, page: undefined })}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs ring-1 transition ${category === val
                ? "bg-gold/20 text-gold ring-gold/40"
                : "bg-surface-100 text-gray-300 ring-white/10 hover:text-white"
                }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </section>

      {/* Manga Grid */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white sm:text-xl">
            <Flame className="mr-1.5 inline-block h-5 w-5 text-gold" />
            รายการมังงะ
          </h2>
          <p className="text-xs text-gray-500">ทั้งหมด {data.total} เรื่อง</p>
        </div>

        {data.items.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {data.items.map((manga) => (
              <MangaCard key={manga.id} manga={manga} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-surface-100/60 py-20 text-center ring-1 ring-white/5">
            <Sparkles className="mx-auto mb-3 h-8 w-8 text-gray-600" />
            <p className="mb-2 text-gray-300">ยังไม่พบเรื่องที่ตรงเงื่อนไข</p>
            <p className="text-sm text-gray-500">
              ลองเปลี่ยนคำค้นหาหรือเลือกหมวดหมู่อื่น
            </p>
          </div>
        )}

        {/* Pagination */}
        {data.pages > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-surface-100 px-3 text-sm text-gray-300 ring-1 ring-white/10 hover:bg-surface-200"
              >
                <ChevronLeft className="h-4 w-4" />
                ก่อนหน้า
              </Link>
            )}
            <span className="inline-flex h-9 items-center rounded-lg bg-gold/20 px-3 text-sm text-gold ring-1 ring-gold/30">
              หน้า {page} / {data.pages}
            </span>
            {page < data.pages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-surface-100 px-3 text-sm text-gray-300 ring-1 ring-white/10 hover:bg-surface-200"
              >
                ถัดไป
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

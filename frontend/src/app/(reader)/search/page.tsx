import { getMangaList } from "@/lib/api";
import type { Metadata } from "next";
import type { MangaCategory, MangaStatus } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/types";
import MangaCard from "@/components/MangaCard";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search as SearchIcon, FileSearch } from "lucide-react";
import SearchFilterBar from "./SearchFilterBar";

interface Props {
  searchParams: Promise<{
    page?: string;
    category?: string;
    status?: string;
    q?: string;
    sort?: string;
  }>;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams;
  const q = params.q;
  const category = params.category as MangaCategory | undefined;

  let title = "ค้นหามังงะ";
  let description = "ค้นหามังงะแปลไทยที่คุณต้องการอ่าน ครบทุกหมวดหมู่ — MangaLabTH";

  if (q) {
    title = `ค้นหา "${q}"`;
    description = `ผลการค้นหามังงะ "${q}" บน MangaLabTH — อ่านออนไลน์ฟรี ภาพคมชัด`;
  } else if (category && CATEGORY_LABELS[category]) {
    title = `มังงะ${CATEGORY_LABELS[category]}`;
    description = `รวมมังงะแนว${CATEGORY_LABELS[category]} แปลไทย อ่านออนไลน์ฟรี อัปเดตตอนใหม่ล่าสุด — MangaLabTH`;
  }

  return {
    title,
    description,
    robots: { index: !q, follow: true },
  };
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

  const showCategoryHint = !q && category && CATEGORY_LABELS[category];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero header */}
      <div className="mb-6">
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">Discover</span>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink-100 sm:text-3xl">
          <SearchIcon className="h-5 w-5 text-gold" />
          ค้นหามังงะ
        </h1>
        <p className="mt-1 text-sm text-ink-400">
          พิมพ์ชื่อเรื่อง หรือคำในเนื้อหา — ผลลัพธ์จะอัปเดตอัตโนมัติ
        </p>
      </div>

      <SearchFilterBar
        initialQ={q || ""}
        initialCategory={category || ""}
        initialStatus={status || ""}
        initialSort={sort}
      />

      {/* Results meta */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-400">
          {q
            ? <>ผลการค้นหา <span className="font-semibold text-ink-100">&ldquo;{q}&rdquo;</span></>
            : showCategoryHint
              ? <>หมวด <span className="font-semibold text-ink-100">{CATEGORY_LABELS[category!]}</span></>
              : "มังงะทั้งหมด"}
          {" — "}
          <span className="font-semibold text-ink-200">{data.total.toLocaleString()}</span> เรื่อง
        </p>
      </div>

      {data.items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {data.items.map((manga) => (
            <MangaCard key={manga.id} manga={manga} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-md bg-ink-800/40 py-20 text-center">
          <FileSearch className="mb-3 h-10 w-10 text-ink-500" />
          <p className="text-base font-medium text-ink-200">ไม่พบเรื่องที่ตรงเงื่อนไข</p>
          <p className="mt-1 text-xs text-ink-500">ลองปรับคำค้นหา หรือลบตัวกรองบางอย่างดู</p>
        </div>
      )}

      {data.pages > 1 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {page > 1 && (
            <Link
              href={buildUrl({ page: String(page - 1) })}
              className="inline-flex h-9 items-center gap-1 rounded-sm bg-ink-800/70 px-3 text-sm text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100"
            >
              <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
            </Link>
          )}
          <span className="inline-flex h-9 items-center rounded-sm bg-gold/15 px-3 text-sm font-semibold text-gold">
            หน้า {page} / {data.pages}
          </span>
          {page < data.pages && (
            <Link
              href={buildUrl({ page: String(page + 1) })}
              className="inline-flex h-9 items-center gap-1 rounded-sm bg-ink-800/70 px-3 text-sm text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100"
            >
              ถัดไป <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

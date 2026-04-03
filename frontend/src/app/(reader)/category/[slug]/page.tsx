import { getMangaList } from "@/lib/api";
import {
  MangaCategory,
  MangaStatus,
  CATEGORY_LABELS,
  STATUS_LABELS,
  Manga,
} from "@/lib/types";
import type { Metadata } from "next";
import MangaCard from "@/components/MangaCard";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    page?: string;
    status?: string;
    sort?: string;
  }>;
}

const VALID_CATEGORIES = Object.keys(CATEGORY_LABELS) as MangaCategory[];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = slug as MangaCategory;

  if (!VALID_CATEGORIES.includes(category)) {
    return { title: "ไม่พบหมวดหมู่" };
  }

  const label = CATEGORY_LABELS[category];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  return {
    title: `มังงะ${label} — อ่านมังงะแนว${label}ออนไลน์ฟรี`,
    description: `รวมมังงะแนว${label} แปลไทย อ่านออนไลน์ฟรี อัปเดตตอนใหม่ทุกวัน ภาพคมชัด — MangaLabTH`,
    alternates: {
      canonical: `${siteUrl}/category/${slug}`,
    },
    openGraph: {
      title: `มังงะ${label} — MangaLabTH`,
      description: `รวมมังงะแนว${label} แปลไทย อ่านออนไลน์ฟรี อัปเดตตอนใหม่ล่าสุด`,
      type: "website",
    },
  };
}

export function generateStaticParams() {
  return VALID_CATEGORIES.map((cat) => ({ slug: cat }));
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const category = slug as MangaCategory;

  if (!VALID_CATEGORIES.includes(category)) {
    notFound();
  }

  const label = CATEGORY_LABELS[category];
  const page = Number(sp.page) || 1;
  const status = (sp.status || undefined) as MangaStatus | undefined;
  const sort = sp.sort || "latest";

  let data;
  try {
    data = await getMangaList({ page, per_page: 24, category, status, sort });
  } catch {
    data = { items: [], total: 0, page: 1, per_page: 24, pages: 0 };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "หน้าแรก",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: `มังงะ${label}`,
        item: `${siteUrl}/category/${slug}`,
      },
    ],
  };

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = {
      status: status || "",
      sort,
      ...overrides,
    };
    Object.entries(merged).forEach(([k, v]) => {
      if (v) p.set(k, v);
    });
    const qs = p.toString();
    return `/category/${slug}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />

      <h1 className="mb-6 text-2xl font-bold text-white">
        <span className="text-gold">📂</span> มังงะ{label}
      </h1>

      {/* Category navigation */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
        {VALID_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/category/${cat}`}
            className={`snap-start shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${
              cat === category
                ? "bg-gold text-black shadow-lg shadow-gold/20"
                : "bg-surface-100/50 text-gray-400 hover:bg-surface-100 hover:text-white ring-1 ring-white/5"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </Link>
        ))}
      </div>

      {/* Filters */}
      <section className="mb-6 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="status" className="text-xs text-gray-400">สถานะ:</label>
          <form method="get" action={`/category/${slug}`} className="flex items-center gap-2">
            <input type="hidden" name="sort" value={sort} />
            <select
              id="status"
              name="status"
              defaultValue={status || ""}
              className="h-9 rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
            >
              <option value="">ทุกสถานะ</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <button type="submit" className="h-9 rounded-lg bg-surface-100 px-3 text-xs text-gray-300 ring-1 ring-white/10 hover:bg-white/10">ตกลง</button>
          </form>
        </div>

        <span className="text-xs text-gray-500">
          {data.total} เรื่อง
        </span>
      </section>

      {/* Results */}
      {data.items.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {data.items.map((manga: Manga) => (
            <MangaCard key={manga.id} manga={manga} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl bg-surface-100/60 py-20 text-center ring-1 ring-white/5">
          <p className="text-gray-300">ไม่พบมังงะในหมวดหมู่นี้</p>
        </div>
      )}

      {/* Pagination */}
      {data.pages > 1 && (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
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

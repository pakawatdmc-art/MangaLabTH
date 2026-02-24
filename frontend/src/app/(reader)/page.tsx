import Link from "next/link";
import { getMangaList } from "@/lib/api";
import { MangaCategory, MangaStatus, CATEGORY_LABELS, Manga } from "@/lib/types";
import MangaCard from "@/components/MangaCard";
import UpdateMangaCard from "@/components/UpdateMangaCard";
import TopMangaRanking from "@/components/TopMangaRanking";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    page?: string;
    category?: MangaCategory;
    status?: MangaStatus;
    q?: string;
    sort?: string;
  }>;
}

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  let updatedManga = { items: [] as Manga[], total: 0 };
  let manga = { items: [] as Manga[], total: 0, page: 1, per_page: 24, pages: 1 };
  try {
    const isSearchActive = !!params.q;

    if (!isSearchActive && page === 1) {
      updatedManga = await getMangaList({ sort: "updated", per_page: 6 });
    }

    manga = await getMangaList({
      page,
      per_page: 24,
      category: params.category,
      status: params.status,
      q: params.q,
      sort: params.sort,
    });
  } catch {
    // API not available — show empty state
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-surface-200 via-surface-100 to-surface-200 py-12 sm:py-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,175,55,0.1),transparent_60%)]" />
        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6">
          <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
            MangaLab<span className="text-gold">TH</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-gray-400">
            อ่านมังงะออนไลน์คุณภาพสูง อัปเดตทุกวัน พร้อมระบบเหรียญปลดล็อคตอนพิเศษ
          </p>

          {/* Search bar */}
          {/* Search bar */}
          <form action="/search" method="GET" className="mx-auto flex max-w-xl gap-2">
            <input
              type="text"
              name="q"
              placeholder="ค้นหามังงะ..."
              defaultValue={params.q}
              className="flex-1 rounded-xl border-0 bg-surface-100/80 px-4 py-3 text-sm text-white placeholder-gray-500 ring-1 ring-white/10 backdrop-blur focus:outline-none focus:ring-2 focus:ring-gold/50"
            />
            <button
              type="submit"
              className="rounded-xl bg-gold px-6 py-3 text-sm font-semibold text-black transition hover:bg-gold/90"
            >
              ค้นหา
            </button>
          </form>
        </div>
      </section>

      {/* Latest Updates Section */}
      {!params.q && page === 1 && updatedManga.items.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6">
          <div className="overflow-hidden rounded-xl bg-[#1A1A1A] shadow-xl ring-1 ring-white/10">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-white/5 bg-[#242424] px-4 py-3 sm:px-5">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-wide text-white">
                <span className="text-xl">⚡</span> อัปเดตใหม่ล่าสุด
              </h2>
            </div>
            {/* Panel Body */}
            <div className="p-4 sm:p-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {updatedManga.items.map((m: Manga) => (
                  <UpdateMangaCard key={m.id} manga={m} />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Split Layout Container */}
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row">

        {/* Main Left Column (All Manga) */}
        <div className="flex w-full min-w-0 flex-1 flex-col">
          <section className="overflow-hidden rounded-xl bg-[#1A1A1A] shadow-xl ring-1 ring-white/10">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-white/5 bg-[#242424] px-4 py-3 sm:px-5">
              <h2 className="flex items-center gap-2 text-lg font-bold tracking-wide text-white">
                <span className="text-xl">📚</span>
                {params.q
                  ? `ผลการค้นหา "${params.q}"`
                  : params.category
                    ? CATEGORY_LABELS[params.category] || "มังงะ"
                    : "มังงะทั้งหมด"}
              </h2>
              <span className="rounded-md bg-black/40 px-2 py-1 text-xs font-medium text-gray-400">
                {manga.total} เรื่อง
              </span>
            </div>

            {/* Panel Body */}
            <div className="p-4 sm:p-5">
              {/* Filters */}
              <div className="mb-6 flex flex-wrap gap-2">
                <Link
                  href="/"
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${!params.category
                    ? "bg-gold text-black"
                    : "bg-[#2A2A2A] text-gray-400 hover:text-white"
                    }`}
                >
                  ทั้งหมด
                </Link>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <Link
                    key={key}
                    href={`/?category=${key}`}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${params.category === key
                      ? "bg-gold text-black"
                      : "bg-[#2A2A2A] text-gray-400 hover:text-white"
                      }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              {manga.items.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {manga.items.map((m: Manga) => (
                    <MangaCard key={m.id} manga={m} />
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center">
                  <p className="text-gray-500">ยังไม่มีมังงะ</p>
                  <p className="mt-1 text-xs text-gray-600">
                    เพิ่มมังงะได้ที่{" "}
                    <Link href="/admin/manga" className="text-gold hover:underline">
                      แอดมิน
                    </Link>
                  </p>
                </div>
              )}

              {/* Pagination */}
              {manga.pages > 1 && (
                <div className="mt-8 flex justify-center gap-2">
                  {Array.from({ length: manga.pages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={`/?page=${p}${params.category ? `&category=${params.category}` : ""
                        }${params.q ? `&q=${params.q}` : ""}`}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${p === page
                        ? "bg-gold text-black"
                        : "bg-surface-100 text-gray-400 hover:bg-surface-50 hover:text-white"
                        }`}
                    >
                      {p}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Sidebar Column (Top 10) */}
        {!params.q && (
          <div className="w-full shrink-0 lg:w-[320px] xl:w-[350px]">
            <div className="sticky top-24">
              <TopMangaRanking />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

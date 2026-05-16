import Link from "next/link";
import { Zap, Library, ChevronLeft, ChevronRight } from "lucide-react";
import { getMangaList } from "@/lib/api";
import { MangaCategory, MangaStatus, CATEGORY_LABELS, Manga } from "@/lib/types";
import MangaCard from "@/components/MangaCard";
import UpdateMangaCard from "@/components/UpdateMangaCard";
import TopMangaRanking from "@/components/TopMangaRanking";
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { FadeUp, StaggerContainer, StaggerItem, ScaleUp } from "@/components/MotionWrappers";

// Removed force-dynamic to allow ISR and page caching
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
  let manga = { items: [] as Manga[], total: 0, page: 1, per_page: 18, pages: 1 };
  try {
    const isSearchActive = !!params.q;

    if (!isSearchActive && page === 1) {
      updatedManga = await getMangaList({ sort: "updated", per_page: 6 });
    }

    manga = await getMangaList({
      page,
      per_page: 18,
      category: params.category,
      status: params.status,
      q: params.q,
      sort: params.sort || "updated",
    });
  } catch (err) {
    console.error("Failed to fetch manga list:", err);
  }

  return (
    <div className="min-h-screen bg-ink-900">
      {/* Hero */}
      <section className="relative z-10 py-6 sm:py-10">
        {/* Soft gold glow */}
        <div className="pointer-events-none absolute left-1/2 top-0 -ml-[50%] h-[420px] w-full max-w-[1100px] bg-[radial-gradient(ellipse_at_top,rgba(212,168,67,0.07),transparent_60%)]" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6">
          <FadeUp delay={0.1} className="flex flex-col items-center justify-center">
            <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-ink-800/70 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-300 backdrop-blur">
              <span className="h-1 w-1 rounded-full bg-gold" />
              Premium webtoon library
            </span>
            <h1 className="mb-2 text-4xl font-bold tracking-tight text-ink-100 sm:text-5xl">
              MangaLab<span className="text-gold">TH</span>
            </h1>
            <h2 className="mb-2 block text-sm font-normal text-ink-300 tracking-wide">
              เว็บอ่านมังงะ มังงะแปลไทย มังงะเกาหลี การ์ตูนออนไลน์ คุณภาพพรีเมียม
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto mb-6 max-w-xl text-sm text-ink-400 leading-relaxed">
              แพลตฟอร์มอ่านการ์ตูนออนไลน์คุณภาพสูง อัปเดตตอนใหม่ทุกวัน พร้อมระบบเหรียญปลดล็อคสุดคุ้ม
            </p>
          </FadeUp>

          {/* Search bar - more premium */}
          <FadeUp delay={0.3}>
            <SearchAutocomplete defaultValue={params.q || ""} />
          </FadeUp>

          <div className="mx-auto mt-4 max-w-3xl">
            <h3 className="sr-only">อ่านมังงะ มังงะแปลไทย มังงะเกาหลี การ์ตูนออนไลน์ - MangaLabTH</h3>
            <details className="group rounded-md bg-ink-800/40 backdrop-blur transition-colors hover:bg-ink-800/60">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-300 transition-colors hover:text-ink-100">
                <span>อ่านเพิ่มเติมเกี่ยวกับ MangaLabTH</span>
                <span className="text-gold transition-transform duration-200 group-open:rotate-180">▾</span>
              </summary>
              <p className="px-4 pb-4 pt-1 text-[11px] leading-relaxed text-ink-400 text-left balance-text">
                &quot;MangaLabTH แพลตฟอร์มระบบทันสมัยปี 2026 ตอบโจทย์คนชอบ <strong className="text-ink-200">อ่านมังงะ</strong> ที่คัดสรรเฉพาะ <strong className="text-ink-200">มังงะเกาหลี</strong> และเรื่องฮิตมาแรงที่สุด! เราเน้นคุณภาพเน้นๆ เพื่อให้คุณได้อ่าน <strong className="text-ink-200">การ์ตูนออนไลน์</strong> ตัวท็อปจาก Webtoon, Kakao, Comico สนุกจัดเต็มทั้ง <strong className="text-ink-200">มังงะแปลไทย</strong> จีน ญี่ปุ่น แบบไม่ตกเทรนด์ มั่นใจได้กับงานแปลที่ Admin แปลเองทุกเรื่อง อัปเดตตอนใหม่ล่าสุดก่อนใคร แถมราคาสุดคุ้มเหรียญไม่แพงแน่นอน หากมีมังงะดังเรื่องไหนที่คุณอยากอ่าน ทักบอกแอดมินผ่าน แฟนเพจ FB: Mangalab-th ได้เลย เรื่องไหนคนขอมาเยอะ เราพร้อมจัดให้ที่ <strong className="text-ink-200">มังงะแลป</strong> (MangaLabTH)&quot;
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Latest Updates Section */}
      {!params.q && page === 1 && updatedManga.items.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-4 sm:pt-6 sm:px-6">
          <ScaleUp delay={0.4} className="overflow-hidden rounded-lg bg-ink-800/40">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 pb-2 pt-5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">Latest</span>
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink-100">
                  <Zap className="h-4 w-4 text-gold" />
                  อัปเดตใหม่ล่าสุด
                </h2>
              </div>
            </div>
            {/* Panel Body */}
            <div className="p-4 sm:p-6">
              <StaggerContainer className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {updatedManga.items.map((m: Manga, idx: number) => (
                  <StaggerItem key={m.id}>
                    <UpdateMangaCard manga={m} priority={idx < 2} />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </ScaleUp>
        </section>
      )}

      {/* Split Layout Container */}
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row">

        {/* Main Left Column (All Manga) */}
        <div className="flex w-full min-w-0 flex-1 flex-col">
          {params.q && <AnalyticsTracker event="search_manga" data={{ query: params.q }} />}
          <ScaleUp delay={0.2} className="overflow-hidden rounded-lg bg-ink-800/40">
            {/* Panel Header */}
            <div className="flex items-center justify-between px-6 pb-2 pt-5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">Library</span>
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ink-100">
                  <Library className="h-4 w-4 text-gold" />
                  {params.q
                    ? `ผลการค้นหา "${params.q}"`
                    : params.category
                      ? CATEGORY_LABELS[params.category] || "มังงะ"
                      : "มังงะทั้งหมด"}
                </h2>
              </div>
              <span className="rounded-xs bg-ink-900/80 px-2.5 py-1 text-[11px] font-semibold text-ink-300">
                {manga.total} เรื่อง
              </span>
            </div>

            {/* Panel Body */}
            <div className="p-4 sm:p-6">
              {/* Filters */}
              <div className="mb-6 sm:mb-8 flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible snap-x scrollbar-hide pb-2">
                <Link
                  href="/"
                  className={`snap-start shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors duration-200 ${!params.category
                    ? "bg-gold text-ink-950"
                    : "bg-ink-900/60 text-ink-300 hover:bg-ink-800 hover:text-ink-100"
                    }`}
                >
                  ทั้งหมด
                </Link>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <Link
                    key={key}
                    href={`/?category=${key}`}
                    className={`snap-start shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-[12px] font-semibold transition-colors duration-200 ${params.category === key
                      ? "bg-gold text-ink-950"
                      : "bg-ink-900/60 text-ink-300 hover:bg-ink-800 hover:text-ink-100"
                      }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              {manga.items.length > 0 ? (
                <StaggerContainer className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {manga.items.map((m: Manga) => (
                    <StaggerItem key={m.id}>
                      <MangaCard manga={m} />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              ) : (
                <div className="py-24 text-center">
                  <p className="text-base text-ink-300 font-medium">ไม่มีมังงะในหมวดหมู่นี้</p>
                  <p className="mt-2 text-sm text-ink-400">
                    ยังไม่มีเรื่องในหมวดหมู่นี้ ลองค้นหาหมวดอื่นดูนะ
                  </p>
                </div>
              )}

              {/* Pagination */}
              {manga.total > 0 && (
                <div className="mt-12 flex justify-center items-center gap-1.5">
                  {/* Previous Button */}
                  {page > 1 ? (
                    <Link
                      href={`/?page=${page - 1}${params.category ? `&category=${params.category}` : ""}${params.q ? `&q=${params.q}` : ""}${params.sort ? `&sort=${params.sort}` : ""}`}
                      className="flex h-9 items-center justify-center gap-1 rounded-sm bg-ink-900/60 px-3 text-sm font-medium text-ink-300 transition-colors duration-200 hover:bg-ink-800 hover:text-ink-100"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> ก่อนหน้า
                    </Link>
                  ) : (
                    <div className="flex h-9 items-center justify-center gap-1 rounded-sm bg-ink-900/30 px-3 text-sm font-medium text-ink-600 cursor-not-allowed">
                      <ChevronLeft className="h-3.5 w-3.5" /> ก่อนหน้า
                    </div>
                  )}

                  {/* Page Numbers */}
                  <div className="hidden sm:flex gap-1.5">
                    {Array.from({ length: manga.pages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === manga.pages || Math.abs(p - page) <= 1)
                      .map((p, i, arr) => {
                        return (
                          <div key={p} className="flex gap-1.5">
                            {i > 0 && p - arr[i - 1] > 1 && (
                              <span className="flex h-9 w-9 items-center justify-center text-ink-500">…</span>
                            )}
                            <Link
                              href={`/?page=${p}${params.category ? `&category=${params.category}` : ""}${params.q ? `&q=${params.q}` : ""}${params.sort ? `&sort=${params.sort}` : ""}`}
                              className={`flex h-9 w-9 items-center justify-center rounded-sm text-sm font-semibold transition-colors duration-200 ${
                                p === page
                                  ? "bg-gold text-ink-950"
                                  : "bg-ink-900/60 text-ink-300 hover:bg-ink-800 hover:text-ink-100"
                              }`}
                            >
                              {p}
                            </Link>
                          </div>
                        );
                      })}
                  </div>

                  {/* Mobile Page Indicator */}
                  <div className="flex sm:hidden h-9 items-center justify-center px-3 text-sm font-medium text-ink-300">
                    หน้า {page} / {manga.pages}
                  </div>

                  {/* Next Button */}
                  {page < manga.pages ? (
                    <Link
                      href={`/?page=${page + 1}${params.category ? `&category=${params.category}` : ""}${params.q ? `&q=${params.q}` : ""}${params.sort ? `&sort=${params.sort}` : ""}`}
                      className="flex h-9 items-center justify-center gap-1 rounded-sm bg-ink-900/60 px-3 text-sm font-medium text-ink-300 transition-colors duration-200 hover:bg-ink-800 hover:text-ink-100"
                    >
                      ถัดไป <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  ) : (
                    <div className="flex h-9 items-center justify-center gap-1 rounded-sm bg-ink-900/30 px-3 text-sm font-medium text-ink-600 cursor-not-allowed">
                      ถัดไป <ChevronRight className="h-3.5 w-3.5" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScaleUp>
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

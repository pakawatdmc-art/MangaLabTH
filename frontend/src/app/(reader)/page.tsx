import Link from "next/link";
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
  } catch (err) {
    console.error("Failed to fetch manga list:", err);
  }

  return (
    <div className="min-h-screen bg-surface-300">
      {/* Hero */}
      <section className="relative z-10 py-8 sm:py-12">
        {/* Subtle glow instead of heavy radial gradient */}
        <div className="absolute left-1/2 top-0 -ml-[50%] h-[500px] w-full max-w-[1000px] bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_50%)]" />

        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center sm:px-6">
          <FadeUp delay={0.1} className="flex flex-col items-center justify-center">
            <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl drop-shadow-sm">
              MangaLab<span className="text-gold">TH</span>
            </h1>
            <span className="mb-5 block text-sm sm:text-base font-medium text-gold/80 tracking-wide">
              เว็บอ่านมังงะ มังงะแปลไทย มังงะเกาหลี อันดับ 1
            </span>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="mx-auto mb-10 max-w-xl text-lg text-gray-400">
              แพลตฟอร์มอ่านการ์ตูนออนไลน์คุณภาพสูง อัปเดตตอนใหม่ทุกวัน พร้อมระบบเหรียญปลดล็อคสุดคุ้ม
            </p>
          </FadeUp>

          {/* Search bar - more premium */}
          <FadeUp delay={0.3}>
            <SearchAutocomplete defaultValue={params.q || ""} />
          </FadeUp>

          {/* SEO Text Component - Elegant and subtle */}
          <div className="mx-auto mt-6 max-w-3xl">
            <h2 className="sr-only">อ่านมังงะ มังงะแปลไทย มังงะเกาหลี อ่านการ์ตูนฟรี - MangaLabTH</h2>
            <p className="text-[11px] leading-relaxed text-gray-500/50 balance-text font-medium">
              &quot;MangaLabTH แพลตฟอร์มระบบทันสมัยปี 2026 ตอบโจทย์คนชอบ <strong>อ่านมังงะ</strong> ที่คัดสรรเฉพาะ <strong>มังงะเกาหลี</strong> และเรื่องฮิตมาแรงที่สุด! เราเน้นคุณภาพเน้นๆ เพื่อให้คุณได้ <strong>อ่านการ์ตูน</strong> ตัวท็อปจาก Webtoon, Kakao, Comico 
              สนุกจัดเต็มทั้ง <strong>มังงะแปลไทย</strong> จีน ญี่ปุ่น แบบไม่ตกเทรนด์ มั่นใจได้กับงานแปลที่ Admin แปลเองทุกเรื่อง อัปเดตตอนใหม่ล่าสุดก่อนใคร แถมราคาสุดคุ้มเหรียญไม่แพงแน่นอน 
              หากมีมังงะดังเรื่องไหนที่คุณอยากอ่าน ทักบอกแอดมินผ่าน แฟนเพจ FB: Mangalab-th ได้เลย เรื่องไหนคนขอมาเยอะ เราพร้อมจัดให้ที่ MangaLabTH&quot;
            </p>
          </div>
        </div>
      </section>

      {/* Latest Updates Section */}
      {!params.q && page === 1 && updatedManga.items.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-4 sm:pt-6 sm:px-6">
          <ScaleUp delay={0.4} className="overflow-hidden rounded-[2rem] bg-surface-200/40 shadow-2xl ring-1 ring-white/5 backdrop-blur-md">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-white/5 bg-transparent px-6 py-5">
              <h2 className="flex items-center gap-3 text-lg font-bold tracking-tight text-white/90">
                <span className="text-2xl drop-shadow-md">⚡</span> อัปเดตใหม่ล่าสุด
              </h2>
            </div>
            {/* Panel Body */}
            <div className="p-4 sm:p-6">
              <StaggerContainer className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {updatedManga.items.map((m: Manga, idx: number) => (
                  <StaggerItem key={m.id}>
                    <UpdateMangaCard manga={m} priority={idx < 4} />
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
          <ScaleUp delay={0.2} className="overflow-hidden rounded-[2rem] bg-surface-200/40 shadow-2xl ring-1 ring-white/5 backdrop-blur-md">
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-white/5 bg-transparent px-6 py-5">
              <h2 className="flex items-center gap-3 text-lg font-bold tracking-tight text-white/90">
                <span className="text-2xl drop-shadow-md">📚</span>
                {params.q
                  ? `ผลการค้นหา "${params.q}"`
                  : params.category
                    ? CATEGORY_LABELS[params.category] || "มังงะ"
                    : "มังงะทั้งหมด"}
              </h2>
              <span className="rounded-xl bg-white/5 px-3 py-1.5 text-xs font-semibold text-gray-400">
                {manga.total} เรื่อง
              </span>
            </div>

            {/* Panel Body */}
            <div className="p-4 sm:p-6">
              {/* Filters */}
              <div className="mb-6 sm:mb-8 flex gap-2.5 overflow-x-auto sm:flex-wrap sm:overflow-visible snap-x scrollbar-hide pb-2">
                <Link
                  href="/"
                  className={`snap-start shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${!params.category
                    ? "bg-gold text-black shadow-lg shadow-gold/20"
                    : "bg-surface-100/50 text-gray-400 hover:bg-surface-100 hover:text-white ring-1 ring-white/5"
                    }`}
                >
                  ทั้งหมด
                </Link>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <Link
                    key={key}
                    href={`/?category=${key}`}
                    className={`snap-start shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${params.category === key
                      ? "bg-gold text-black shadow-lg shadow-gold/20"
                      : "bg-surface-100/50 text-gray-400 hover:bg-surface-100 hover:text-white ring-1 ring-white/5"
                      }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>

              {manga.items.length > 0 ? (
                <StaggerContainer className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {manga.items.map((m: Manga, idx: number) => (
                    <StaggerItem key={m.id}>
                      <MangaCard manga={m} priority={idx < 4} />
                    </StaggerItem>
                  ))}
                </StaggerContainer>
              ) : (
                <div className="py-24 text-center">
                  <p className="text-lg text-gray-500 font-medium">ไม่มีมังงะในหมวดหมู่นี้</p>
                  <p className="mt-2 text-sm text-gray-600">
                    ยังไม่มีเรื่องในหมวดหมู่นี้ ลองค้นหาหมวดอื่นดูนะ
                  </p>
                </div>
              )}

              {/* Pagination */}
              {manga.pages > 1 && (
                <div className="mt-12 flex justify-center gap-2">
                  {Array.from({ length: manga.pages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={`/?page=${p}${params.category ? `&category=${params.category}` : ""
                        }${params.q ? `&q=${params.q}` : ""}${params.sort ? `&sort=${params.sort}` : ""}`}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold transition-all ${p === page
                        ? "bg-gold text-black shadow-lg shadow-gold/20"
                        : "bg-surface-100/50 text-gray-400 hover:bg-surface-100 hover:text-white ring-1 ring-white/5"
                        }`}
                    >
                      {p}
                    </Link>
                  ))}
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

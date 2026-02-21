"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Coins,
  Home,
  Layers,
} from "lucide-react";
import { formatChapterNumber, formatNumber } from "@/lib/utils";
import type { ChapterDetail } from "@/lib/types";

interface Props {
  chapter: ChapterDetail;
  manga: { id: string; title: string; slug: string };
  prevChapterId: string | null;
  nextChapterId: string | null;
  coinBalance?: number;
  allChapters: { id: string; number: number; title: string; is_unlocked?: boolean }[];
}

export default function ChapterReaderClient({
  chapter,
  manga,
  prevChapterId,
  nextChapterId,
  coinBalance,
  allChapters,
}: Props) {
  const router = useRouter();
  const [showTopBar, setShowTopBar] = useState(true);
  const [showChapterMenu, setShowChapterMenu] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const lastScrollY = useRef(0);

  const pages = [...chapter.pages].sort((a, b) => a.number - b.number);

  // Scroll handling: show/hide top bar + progress
  const handleScroll = useCallback(() => {
    const y = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const pct = maxScroll > 0 ? Math.round((y / maxScroll) * 100) : 0;

    setProgress(Math.min(100, Math.max(0, pct)));
    setShowTopBar(y < 100 || y < lastScrollY.current);
    setShowScrollTop(y > 600);
    lastScrollY.current = y;

    // Save to localStorage
    try {
      localStorage.setItem(
        `mangafactory:lastRead:${manga.id}`,
        JSON.stringify({
          url: `/read/${chapter.id}`,
          mangaTitle: manga.title,
          mangaDetailUrl: `/manga/${manga.slug}`,
          chapterLabel: `ตอนที่ ${formatChapterNumber(chapter.number)}`,
          progress: pct,
          updatedAt: new Date().toISOString(),
        })
      );
    } catch { }
  }, [chapter.id, chapter.number, manga.id, manga.title, manga.slug]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Click outside to close chapter menu
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (showChapterMenu) setShowChapterMenu(false);
    }
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [showChapterMenu]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && prevChapterId) {
        router.push(`/read/${prevChapterId}`);
      } else if (e.key === "ArrowRight" && nextChapterId) {
        router.push(`/read/${nextChapterId}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prevChapterId, nextChapterId, router]);

  return (
    <div className="min-h-screen bg-black">
      {/* Progress bar */}
      <div className="fixed left-0 right-0 top-0 z-50 h-0.5 bg-surface-300">
        <div
          className="h-full bg-gold transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Floating top bar */}
      <header
        className={`fixed left-0 right-0 top-0.5 z-40 transition-transform duration-300 ${showTopBar ? "translate-y-0" : "-translate-y-full"
          }`}
      >
        <div className="mx-auto flex h-12 max-w-4xl items-center justify-between bg-surface-300/92 px-2.5 backdrop-blur-xl sm:rounded-b-xl sm:px-4">
          <Link
            href={`/manga/${manga.slug}`}
            className="flex items-center gap-2 text-sm text-gray-300 transition hover:text-white"
          >
            <BookOpen className="h-4 w-4 text-gold" />
            <span className="max-w-[120px] truncate sm:max-w-[240px]">
              {manga.title}
            </span>
          </Link>

          {/* Chapter selector Dropdown */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowChapterMenu(!showChapterMenu);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-surface-200/50 px-2.5 py-1 text-[11px] text-gray-300 transition hover:bg-surface-100 sm:px-3 sm:py-1.5 sm:text-xs"
            >
              <Layers className="h-3.5 w-3.5 text-gold" />
              <span className="font-medium">ตอนที่ {formatChapterNumber(chapter.number)}</span>
              <span className="hidden text-gray-500 sm:inline">
                · {pages.length} หน้า
              </span>
              <ChevronDown className="ml-0.5 h-3.5 w-3.5 opacity-70" />
            </button>

            {/* Dropdown Menu */}
            {showChapterMenu && (
              <div
                className="absolute left-0 top-full mt-2 max-h-[60vh] w-56 overflow-y-auto rounded-xl border border-white/10 bg-surface-200 p-1.5 shadow-2xl backdrop-blur-xl sm:w-64"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-1 px-2 pb-1 pt-1.5 text-[10px] font-semibold tracking-wider text-gray-500">
                  เลือกตอนอ่าน
                </div>
                {allChapters.map((c) => {
                  const isCurrent = c.id === chapter.id;
                  return (
                    <Link
                      key={c.id}
                      href={`/read/${c.id}`}
                      onClick={() => setShowChapterMenu(false)}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm transition ${isCurrent
                        ? "bg-gold/15 text-gold"
                        : "text-gray-300 hover:bg-white/5 hover:text-white"
                        }`}
                    >
                      <span className="truncate pr-2">
                        <span className="mr-2 opacity-60">
                          ตอนที่ {formatChapterNumber(c.number)}
                        </span>
                        {c.title}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {c.is_unlocked && (
                          <span className="text-[9px] font-medium text-emerald-400">
                            ปลดล็อคแล้ว
                          </span>
                        )}
                        {isCurrent && <div className="h-1.5 w-1.5 rounded-full bg-gold" />}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Actions & Chapter selector */}
          <div className="flex items-center gap-2 sm:gap-4">
            {coinBalance !== undefined && (
              <Link
                href="/coins"
                className="flex items-center gap-1.5 rounded-full bg-gold/10 px-2.5 py-1 text-xs font-semibold text-gold ring-1 ring-gold/20 transition hover:bg-gold/20"
                title="เติมเหรียญ"
              >
                <Coins className="h-3.5 w-3.5" />
                <span>{formatNumber(coinBalance)} <span className="hidden sm:inline">เหรียญ</span></span>
              </Link>
            )}

            <Link
              href="/"
              className="flex items-center gap-1.5 text-gray-400 transition hover:text-white"
              title="กลับหน้าแรก"
            >
              <Home className="h-4 w-4" />
              <span className="hidden text-xs font-medium sm:inline">หน้าแรก</span>
            </Link>

            <div className="flex items-center gap-0.5 ml-1">
              {prevChapterId ? (
                <Link
                  href={`/read/${prevChapterId}`}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
                  title="ตอนก่อนหน้า (←)"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              ) : (
                <span className="rounded-lg p-1.5 text-gray-700">
                  <ChevronLeft className="h-5 w-5" />
                </span>
              )}
              {nextChapterId ? (
                <Link
                  href={`/read/${nextChapterId}`}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
                  title="ตอนถัดไป (→)"
                >
                  <ChevronRight className="h-5 w-5" />
                </Link>
              ) : (
                <span className="rounded-lg p-1.5 text-gray-700">
                  <ChevronRight className="h-5 w-5" />
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Pages */}
      <main className="mx-auto max-w-3xl pt-14 pb-4 md:pb-0">
        {pages.map((pg) => (
          <div key={pg.id} className="relative w-full">
            <Image
              src={pg.image_url}
              alt={`หน้า ${pg.number}`}
              width={pg.width || 900}
              height={pg.height || 1350}
              unoptimized
              className="w-full"
              loading={pg.number <= 3 ? "eager" : "lazy"}
              quality={85}
            />
          </div>
        ))}
      </main>

      {/* End navigation */}
      <footer className="mx-auto max-w-3xl border-t border-white/5 px-4 py-10 pb-24 text-center md:pb-10">
        <p className="mb-4 text-sm text-gray-500">
          จบตอนที่ {formatChapterNumber(chapter.number)}
        </p>
        <div className="flex items-center justify-center gap-3">
          {prevChapterId && (
            <Link
              href={`/read/${prevChapterId}`}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-surface-100 px-4 text-sm text-gray-300 ring-1 ring-white/10 transition hover:bg-surface-50"
            >
              <ChevronLeft className="h-4 w-4" />
              ตอนก่อนหน้า
            </Link>
          )}
          {nextChapterId && (
            <Link
              href={`/read/${nextChapterId}`}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-5 text-sm font-semibold text-black transition hover:bg-gold-light"
            >
              ตอนถัดไป
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>
        <Link
          href={`/manga/${manga.slug}`}
          className="mt-4 inline-block text-sm text-gray-500 transition hover:text-gold"
        >
          กลับไปหน้ารายละเอียดเรื่อง
        </Link>
      </footer>

      {/* Mobile dock */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-surface-300/95 px-3 pb-[max(env(safe-area-inset-bottom),0.6rem)] pt-2.5 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-sm grid-cols-4 gap-1.5">
          <Link
            href="/"
            className="flex flex-col items-center justify-center gap-1 rounded-xl text-gray-400 transition hover:text-white"
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-medium">หน้าแรก</span>
          </Link>

          {prevChapterId ? (
            <Link
              href={`/read/${prevChapterId}`}
              className="flex flex-col items-center justify-center gap-1 rounded-xl text-gray-300 transition hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="text-[10px] font-medium">ก่อนหน้า</span>
            </Link>
          ) : (
            <span className="flex flex-col items-center justify-center gap-1 rounded-xl text-gray-600">
              <ChevronLeft className="h-5 w-5" />
              <span className="text-[10px] font-medium">ก่อนหน้า</span>
            </span>
          )}

          <Link
            href={`/manga/${manga.slug}`}
            className="flex flex-col items-center justify-center gap-1 rounded-xl text-gray-300 transition hover:text-white"
          >
            <BookOpen className="h-5 w-5 text-gold" />
            <span className="text-[10px] font-medium">หน้ารายละเอียด</span>
          </Link>

          {nextChapterId ? (
            <Link
              href={`/read/${nextChapterId}`}
              className="flex flex-col items-center justify-center gap-1 rounded-xl text-gold transition hover:text-gold-light"
            >
              <ChevronRight className="h-5 w-5" />
              <span className="text-[10px] font-semibold">ถัดไป</span>
            </Link>
          ) : (
            <span className="flex flex-col items-center justify-center gap-1 rounded-xl text-gold/50">
              <ChevronRight className="h-5 w-5" />
              <span className="text-[10px] font-medium">จบตอน</span>
            </span>
          )}
        </div>
      </nav>

      {/* Scroll to top */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-24 right-4 z-40 rounded-full bg-surface-100/80 p-2.5 text-gray-400 ring-1 ring-white/10 backdrop-blur transition hover:text-white md:bottom-6"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}

      {/* Progress badge */}
      <div className="fixed bottom-24 left-4 z-40 rounded-full bg-gold/20 px-2.5 py-1 text-xs font-medium text-gold ring-1 ring-gold/30 md:bottom-6">
        {progress}%
      </div>
    </div>
  );
}

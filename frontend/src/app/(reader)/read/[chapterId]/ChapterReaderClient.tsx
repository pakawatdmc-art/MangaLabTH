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
  Layers,
} from "lucide-react";
import { formatChapterNumber } from "@/lib/utils";
import type { ChapterDetail } from "@/lib/types";

interface Props {
  chapter: ChapterDetail;
  manga: { id: string; title: string; slug: string };
  prevChapterId: string | null;
  nextChapterId: string | null;
}

export default function ChapterReaderClient({
  chapter,
  manga,
  prevChapterId,
  nextChapterId,
}: Props) {
  const router = useRouter();
  const [showTopBar, setShowTopBar] = useState(true);
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
    } catch {}
  }, [chapter.id, chapter.number, manga.id, manga.title, manga.slug]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

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
        className={`fixed left-0 right-0 top-0.5 z-40 transition-transform duration-300 ${
          showTopBar ? "translate-y-0" : "-translate-y-full"
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

          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <Layers className="h-3.5 w-3.5" />
            ตอนที่ {formatChapterNumber(chapter.number)}
            <span className="ml-1 hidden text-gray-600 sm:inline">
              · {pages.length} หน้า
            </span>
          </div>

          {/* Chapter selector */}
          <div className="flex items-center gap-1">
            {prevChapterId ? (
              <Link
                href={`/read/${prevChapterId}`}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                title="ตอนก่อนหน้า (←)"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
            ) : (
              <span className="rounded-lg p-2 text-gray-700">
                <ChevronLeft className="h-4 w-4" />
              </span>
            )}
            {nextChapterId ? (
              <Link
                href={`/read/${nextChapterId}`}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-white/10 hover:text-white"
                title="ตอนถัดไป (→)"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="rounded-lg p-2 text-gray-700">
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
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
        <div className="mx-auto grid max-w-sm grid-cols-3 gap-2">
          {prevChapterId ? (
            <Link
              href={`/read/${prevChapterId}`}
              className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-surface-100 text-xs font-medium text-gray-200 ring-1 ring-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
              ก่อนหน้า
            </Link>
          ) : (
            <span className="inline-flex h-10 items-center justify-center rounded-xl bg-surface-100/60 text-xs text-gray-600 ring-1 ring-white/5">
              ก่อนหน้า
            </span>
          )}

          <Link
            href={`/manga/${manga.slug}`}
            className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-surface-100 text-xs font-medium text-gray-200 ring-1 ring-white/10"
          >
            <BookOpen className="h-4 w-4 text-gold" />
            รายการตอน
          </Link>

          {nextChapterId ? (
            <Link
              href={`/read/${nextChapterId}`}
              className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-gold text-xs font-semibold text-black"
            >
              ถัดไป
              <ChevronRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="inline-flex h-10 items-center justify-center rounded-xl bg-gold/55 text-xs font-medium text-black/70">
              จบตอน
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

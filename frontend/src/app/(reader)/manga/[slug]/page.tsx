import { getMangaBySlug } from "@/lib/api";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/types";
import { formatChapterNumber, formatDate, formatNumber } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  Clock,
  Eye,
  Lock,
  Layers,
  Tag,
} from "lucide-react";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function MangaDetailPage({ params }: Props) {
  const { slug } = await params;

  let manga;
  try {
    manga = await getMangaBySlug(slug);
  } catch {
    notFound();
  }

  const sortedChapters = [...manga.chapters].sort((a, b) => b.number - a.number);
  const firstChapter = manga.chapters.length > 0
    ? manga.chapters.reduce((a, b) => (a.number < b.number ? a : b))
    : null;
  const latestChapter = sortedChapters[0] || null;
  const freeChapterCount = manga.chapters.filter((ch) => ch.is_free || ch.coin_price === 0).length;
  const premiumChapterCount = manga.chapters.length - freeChapterCount;

  return (
    <div className="min-h-screen bg-background text-white">
      {/* Hero backdrop */}
      <div className="relative h-72 sm:h-96">
        <Image
          src={manga.cover_url || "/placeholder.png"}
          alt=""
          fill
          className="object-cover blur-2xl brightness-[0.25]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-background/75 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_30%,rgba(212,175,55,0.18),transparent_32%)]" />
      </div>

      <div className="mx-auto -mt-44 max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-surface-200/85 p-4 shadow-2xl shadow-black/40 backdrop-blur-md sm:flex-row sm:gap-8 sm:p-6">
          {/* Cover */}
          <div className="relative mx-auto aspect-[2/3] w-44 flex-shrink-0 overflow-hidden rounded-xl ring-2 ring-gold/30 sm:mx-0 sm:w-52">
            <Image
              src={manga.cover_url || "/placeholder.png"}
              alt={manga.title}
              fill
              className="object-cover"
              priority
            />
          </div>

          {/* Info */}
          <div className="flex-1 pt-1 sm:pt-2">
            <h1 className="mb-3 text-2xl font-extrabold tracking-tight text-white drop-shadow sm:text-4xl">
              {manga.title}
            </h1>

            <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2.5 py-1 text-gold ring-1 ring-gold/30">
                <Tag className="h-3 w-3" />
                {CATEGORY_LABELS[manga.category]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-1 text-gray-300 ring-1 ring-white/10">
                <Layers className="h-3 w-3" />
                {STATUS_LABELS[manga.status]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-1 text-gray-300 ring-1 ring-white/10">
                <BookOpen className="h-3 w-3" />
                {manga.chapters.length} ตอน
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-1 text-gray-300 ring-1 ring-white/10">
                <Eye className="h-3 w-3" />
                {formatNumber(manga.total_views)}
              </span>
            </div>

            {manga.author && (
              <p className="mb-1 text-sm text-gray-300">
                ผู้แต่ง: <span className="text-white">{manga.author}</span>
                {manga.artist && manga.artist !== manga.author && (
                  <> · ผู้วาด: <span className="text-white">{manga.artist}</span></>
                )}
              </p>
            )}

            <p className="mb-5 rounded-lg bg-black/20 px-3 py-2 text-sm leading-relaxed text-gray-200 ring-1 ring-white/10">
              {manga.description || "ยังไม่มีคำอธิบายเรื่อง"}
            </p>

            <div className="mb-5 rounded-xl border border-white/10 bg-surface-100/65 px-3.5 py-3 text-xs text-gray-300">
              <p>
                อ่านฟรีได้ทันที <span className="font-semibold text-emerald-400">{freeChapterCount} ตอน</span>
                {premiumChapterCount > 0 && (
                  <>
                    {" "}· ตอนติดเหรียญ <span className="font-semibold text-gold">{premiumChapterCount} ตอน</span>
                  </>
                )}
              </p>
              <p className="mt-1 text-[11px] text-gray-500">
                ผู้ชมทุกคนเข้าเว็บและอ่านตอนฟรีได้เลย โดยจะขอให้ล็อกอินเฉพาะตอนที่ติดเหรียญเท่านั้น
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
              {firstChapter && (
                <Link
                  href={`/read/${firstChapter.id}`}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gold px-5 text-sm font-semibold text-black transition hover:bg-gold-light sm:w-auto"
                >
                  <BookOpen className="h-4 w-4" />
                  อ่านตอนแรก
                </Link>
              )}
              {latestChapter && latestChapter.id !== firstChapter?.id && (
                <Link
                  href={`/read/${latestChapter.id}`}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-surface-50 px-5 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-surface-100 sm:w-auto"
                >
                  อ่านตอนล่าสุด
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Chapter list */}
        <section className="mt-8 rounded-2xl border border-white/10 bg-surface-200/70 p-3.5 pb-4 shadow-lg shadow-black/30 sm:p-6 sm:pb-7">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-white">
              รายการตอน ({manga.chapters.length})
            </h2>
            <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
              อ่านฟรี {freeChapterCount}
            </span>
          </div>
          <div className="space-y-1.5">
            {sortedChapters.map((ch) => (
              <Link
                key={ch.id}
                href={`/read/${ch.id}`}
                className="flex items-start justify-between gap-3 rounded-xl bg-black/25 px-3 py-3 ring-1 ring-white/10 transition hover:bg-surface-50 hover:ring-gold/30 sm:items-center sm:px-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 text-xs font-bold text-gold">
                    {formatChapterNumber(ch.number)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      ตอนที่ {formatChapterNumber(ch.number)}
                      {ch.title ? ` — ${ch.title}` : ""}
                    </p>
                    <p className="text-[11px] text-gray-400">
                      <Clock className="mr-0.5 inline-block h-3 w-3" />
                      {formatDate(ch.published_at)}
                      {ch.page_count ? ` · ${ch.page_count} หน้า` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 pt-0.5 sm:pt-0">
                  {!ch.is_free && ch.coin_price > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold">
                      <Lock className="h-3 w-3" />
                      {ch.coin_price}
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                      ฟรี
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

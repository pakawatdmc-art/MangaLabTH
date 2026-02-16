import { getMangaBySlug } from "@/lib/api";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/types";
import { formatChapterNumber, formatDate, formatNumber } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  Clock,
  Coins,
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

  return (
    <div className="min-h-screen">
      {/* Hero backdrop */}
      <div className="relative h-64 sm:h-80">
        <Image
          src={manga.cover_url || "/placeholder.png"}
          alt=""
          fill
          className="object-cover blur-2xl brightness-[0.3]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background" />
      </div>

      <div className="mx-auto -mt-40 max-w-5xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
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
          <div className="flex-1 pt-2">
            <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">
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
              <p className="mb-1 text-sm text-gray-400">
                ผู้แต่ง: <span className="text-gray-200">{manga.author}</span>
                {manga.artist && manga.artist !== manga.author && (
                  <> · ผู้วาด: <span className="text-gray-200">{manga.artist}</span></>
                )}
              </p>
            )}

            {manga.description && (
              <p className="mb-5 text-sm leading-relaxed text-gray-400">
                {manga.description}
              </p>
            )}

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-3">
              {firstChapter && (
                <Link
                  href={`/read/${firstChapter.id}`}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-gold px-5 text-sm font-semibold text-black transition hover:bg-gold-light"
                >
                  <BookOpen className="h-4 w-4" />
                  อ่านตอนแรก
                </Link>
              )}
              {latestChapter && latestChapter.id !== firstChapter?.id && (
                <Link
                  href={`/read/${latestChapter.id}`}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-surface-50 px-5 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-surface-100"
                >
                  อ่านตอนล่าสุด
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Chapter list */}
        <section className="mt-10 pb-10">
          <h2 className="mb-4 text-lg font-semibold text-white">
            รายการตอน ({manga.chapters.length})
          </h2>
          <div className="space-y-1.5">
            {sortedChapters.map((ch) => (
              <Link
                key={ch.id}
                href={`/read/${ch.id}`}
                className="flex items-center justify-between rounded-xl bg-surface-100/70 px-4 py-3 ring-1 ring-white/5 transition hover:bg-surface-50 hover:ring-gold/20"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/10 text-xs font-bold text-gold">
                    {formatChapterNumber(ch.number)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">
                      ตอนที่ {formatChapterNumber(ch.number)}
                      {ch.title ? ` — ${ch.title}` : ""}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      <Clock className="mr-0.5 inline-block h-3 w-3" />
                      {formatDate(ch.published_at)}
                      {ch.page_count ? ` · ${ch.page_count} หน้า` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!ch.is_free && ch.coin_price > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-xs font-medium text-gold">
                      <Coins className="h-3 w-3" />
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

import { auth } from "@clerk/nextjs/server";
import { getMangaBySlug } from "@/lib/api";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/types";
import { formatNumber, formatDateTime } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BookOpen,
  Eye,
  Layers,
  Tag,
  Calendar,
} from "lucide-react";
import { ChapterListClient } from "@/components/ChapterListClient";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<import("next").Metadata> {
  const { slug } = await params;
  try {
    const manga = await getMangaBySlug(slug);
    const desc = manga.description
      ? manga.description.slice(0, 160)
      : `อ่าน ${manga.title} มังงะแปลไทย ออนไลน์ฟรี ภาพคมชัด`;
    return {
      title: manga.title,
      description: desc,
      openGraph: {
        title: `${manga.title} — MangaLabTH`,
        description: desc,
        images: manga.cover_url ? [{ url: manga.cover_url, width: 400, height: 600 }] : [],
        type: "article",
      },
      twitter: {
        card: "summary_large_image",
        title: `${manga.title} — MangaLabTH`,
        description: desc,
        images: manga.cover_url ? [manga.cover_url] : [],
      },
      alternates: {
        canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/manga/${manga.slug}`,
      },
    };
  } catch {
    return { title: "มังงะ — MangaLabTH" };
  }
}

export default async function MangaDetailPage({ params }: Props) {
  const { slug } = await params;
  const { getToken } = await auth();
  const token = await getToken();

  let manga;
  try {
    manga = await getMangaBySlug(slug, token || undefined);
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ComicSeries",
    name: manga.title,
    description: manga.description || `อ่าน ${manga.title} มังงะแปลไทย ออนไลน์ฟรี ภาพคมชัด`,
    author: { "@type": "Person", "name": manga.author || "Unknown" },
    image: manga.cover_url || "",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/manga/${manga.slug}`,
    datePublished: manga.created_at ? new Date(manga.created_at + "Z").toISOString() : undefined,
    dateModified: (manga.last_chapter_updated_at || manga.created_at) 
      ? new Date((manga.last_chapter_updated_at || manga.created_at) + "Z").toISOString() 
      : undefined,
  };

  return (
    <div className="min-h-screen bg-background text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Hero backdrop */}
      <div className="relative h-64 sm:h-80">
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

      <div className="mx-auto -mt-32 max-w-5xl px-4 sm:px-6 sm:-mt-40">
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
              {manga.sub_category && manga.sub_category !== manga.category && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-1 text-[10px] text-gold/80 ring-1 ring-gold/20">
                  <Tag className="h-2.5 w-2.5" />
                  {CATEGORY_LABELS[manga.sub_category]}
                </span>
              )}
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
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-100 px-2.5 py-1 text-gray-300 ring-1 ring-white/10">
                <Calendar className="h-3 w-3" />
                {(() => {
                  const d = manga.last_chapter_updated_at || manga.created_at;
                  return d ? formatDateTime(d + "Z") : "";
                })()}
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

        <ChapterListClient chapters={sortedChapters} freeChapterCount={freeChapterCount} />
      </div>
    </div>
  );
}

import { auth } from "@clerk/nextjs/server";
import { getMangaBySlug } from "@/lib/api";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/types";
import { formatNumber, formatDateTime, parseUTCDate } from "@/lib/utils";
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
import { AnalyticsTracker } from "@/components/AnalyticsTracker";
import { FadeUp } from "@/components/MotionWrappers";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<import("next").Metadata> {
  const { slug } = await params;
  try {
    const manga = await getMangaBySlug(slug, undefined, { noTrack: true });
    const seoDesc = `อ่านการ์ตูนออนไลน์ ${manga.title} มังงะแปลไทย มังงะเกาหลี อัปเดตตอนใหม่ล่าสุดที่ มังงะแลป (MangaLabTH)`;
    const desc = manga.description
      ? `${manga.description.slice(0, 80)}... | ${seoDesc}`
      : seoDesc;

    return {
      title: manga.title,
      description: desc,
      keywords: ["มังงะเกาหลี", "มังงะแปลไทย", "อ่านการ์ตูนออนไลน์", "มังงะแลป", manga.title],
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ComicSeries",
    name: manga.title,
    description: manga.description || `อ่าน ${manga.title} มังงะแปลไทย ออนไลน์ฟรี ภาพคมชัด`,
    author: { "@type": "Person", "name": manga.author || "Unknown" },
    genre: CATEGORY_LABELS[manga.category],
    image: manga.cover_url || "",
    url: `${siteUrl}/manga/${manga.slug}`,
    datePublished: manga.created_at ? parseUTCDate(manga.created_at).toISOString() : undefined,
    dateModified: (manga.last_chapter_updated_at || manga.created_at) 
      ? parseUTCDate(manga.last_chapter_updated_at || manga.created_at).toISOString() 
      : undefined,
  };

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
        name: manga.title,
        item: `${siteUrl}/manga/${manga.slug}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-ink-900 text-ink-100">
      <AnalyticsTracker 
        event="view_item" 
        data={{ slug: manga.slug, title: manga.title, category: manga.category }} 
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      {/* Hero backdrop */}
      <div className="relative h-64 sm:h-80">
        <Image
          src={manga.cover_url || "/placeholder.png"}
          alt=""
          fill
          className="object-cover blur-2xl brightness-[0.18]"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/40 via-ink-900/85 to-ink-900" />
      </div>

      <div className="mx-auto -mt-32 max-w-5xl px-4 sm:px-6 sm:-mt-40">
        <FadeUp delay={0.2} className="flex flex-col gap-6 rounded-lg bg-ink-800/60 p-4 backdrop-blur-md sm:flex-row sm:gap-8 sm:p-6">
          {/* Cover */}
          <div className="relative mx-auto aspect-[2/3] w-44 flex-shrink-0 overflow-hidden rounded-md sm:mx-0 sm:w-52">
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
            <span className="mb-2 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">
              <span className="h-1 w-1 rounded-full bg-gold" /> Series
            </span>
            <h1 className="mb-4 text-2xl font-bold tracking-tight text-ink-100 sm:text-4xl">
              {manga.title}
            </h1>

            <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
              <span className="inline-flex items-center gap-1 rounded-xs bg-gold/10 px-2.5 py-1 font-semibold text-gold">
                <Tag className="h-3 w-3" />
                {CATEGORY_LABELS[manga.category]}
              </span>
              {manga.sub_category && manga.sub_category !== manga.category && (
                <span className="inline-flex items-center gap-1 rounded-xs bg-ink-900 px-2.5 py-1 text-[10px] text-ink-300">
                  <Tag className="h-2.5 w-2.5" />
                  {CATEGORY_LABELS[manga.sub_category]}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-xs bg-ink-900 px-2.5 py-1 text-ink-300">
                <Layers className="h-3 w-3" />
                {STATUS_LABELS[manga.status]}
              </span>
              <span className="inline-flex items-center gap-1 rounded-xs bg-ink-900 px-2.5 py-1 text-ink-300">
                <BookOpen className="h-3 w-3" />
                {manga.chapters.length} ตอน
              </span>
              <span className="inline-flex items-center gap-1 rounded-xs bg-ink-900 px-2.5 py-1 text-ink-300">
                <Eye className="h-3 w-3" />
                {formatNumber(manga.total_views)} วิว
              </span>
              <span className="inline-flex items-center gap-1 rounded-xs bg-ink-900 px-2.5 py-1 text-ink-300">
                <BookOpen className="h-3 w-3" />
                {formatNumber(manga.total_reads)} อ่าน
              </span>
              <span className="inline-flex items-center gap-1 rounded-xs bg-ink-900 px-2.5 py-1 text-ink-300">
                <Calendar className="h-3 w-3" />
                {(() => {
                  const d = manga.last_chapter_updated_at || manga.created_at;
                  return d ? formatDateTime(d) : "";
                })()}
              </span>
            </div>

            {manga.author && (
              <p className="mb-3 text-sm text-ink-400">
                ผู้แต่ง <span className="text-ink-100 font-medium">{manga.author}</span>
                {manga.artist && manga.artist !== manga.author && (
                  <> · ผู้วาด <span className="text-ink-100 font-medium">{manga.artist}</span></>
                )}
              </p>
            )}

            <p className="mb-5 rounded-md bg-ink-900/60 px-3.5 py-3 text-sm leading-relaxed text-ink-200">
              {manga.description || "ยังไม่มีคำอธิบายเรื่อง"}
            </p>

            <div className="mb-5 rounded-md bg-ink-900/40 px-3.5 py-3 text-xs text-ink-300">
              <p>
                อ่านฟรีได้ทันที <span className="font-semibold text-emerald-300">{freeChapterCount} ตอน</span>
                {premiumChapterCount > 0 && (
                  <>
                    {" "}· ตอนติดเหรียญ <span className="font-semibold text-gold">{premiumChapterCount} ตอน</span>
                  </>
                )}
              </p>
              <p className="mt-1 text-[11px] text-ink-500">
                ผู้ชมทุกคนเข้าเว็บและอ่านตอนฟรีได้เลย โดยจะขอให้ล็อกอินเฉพาะตอนที่ติดเหรียญเท่านั้น
              </p>
            </div>

            {/* CTA buttons */}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-2.5">
              {firstChapter && (
                <Link
                  href={`/${manga.slug}/ตอนที่-${firstChapter.number}`}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-gold px-5 text-sm font-semibold text-ink-950 transition-colors duration-200 hover:bg-gold-light sm:w-auto"
                >
                  <BookOpen className="h-4 w-4" />
                  อ่านตอนแรก
                </Link>
              )}
              {latestChapter && latestChapter.id !== firstChapter?.id && (
                <Link
                  href={`/${manga.slug}/ตอนที่-${latestChapter.number}`}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-ink-900/60 px-5 text-sm font-medium text-ink-100 transition-colors duration-200 hover:bg-ink-900 sm:w-auto"
                >
                  อ่านตอนล่าสุด
                </Link>
              )}
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.3}>
          <ChapterListClient chapters={sortedChapters} freeChapterCount={freeChapterCount} mangaSlug={manga.slug} />
        </FadeUp>
      </div>
    </div>
  );
}

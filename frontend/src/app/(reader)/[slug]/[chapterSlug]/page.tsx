import { auth } from "@clerk/nextjs/server";
import { getChapter, getMangaBySlug, getMe } from "@/lib/api";
import { notFound } from "next/navigation";
import ChapterReaderClient from "./ChapterReaderClient";
import ChapterAccessGate from "./ChapterAccessGate";

interface Props {
  params: Promise<{ slug: string; chapterSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<import("next").Metadata> {
  const { slug, chapterSlug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const decodedChapterSlug = decodeURIComponent(chapterSlug);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  
  try {
    const manga = await getMangaBySlug(decodedSlug);
    const chapterNumberMatch = decodedChapterSlug.match(/ตอนที่-([\d.]+)/);
    if (!chapterNumberMatch) return { title: `${manga.title} — MangaLabTH` };
    const chapterNumber = Number(chapterNumberMatch[1]);
    const matchedChapter = manga.chapters?.find((c: any) => c.number === chapterNumber);
    if (!matchedChapter) return { title: `${manga.title} — MangaLabTH` };

    const chTitle = matchedChapter.title
      ? `ตอนที่ ${matchedChapter.number} — ${matchedChapter.title}`
      : `ตอนที่ ${matchedChapter.number}`;
    return {
      title: `${manga.title} ${chTitle}`,
      description: `อ่าน ${manga.title} ${chTitle} แปลไทย ออนไลน์ฟรี ภาพคมชัด — MangaLabTH`,
      robots: { index: false, follow: true },
      alternates: {
        canonical: `${siteUrl}/${decodedSlug}/ตอนที่-${matchedChapter.number}`,
      },
    };
  } catch {
    return { title: "อ่านมังงะ — MangaLabTH" };
  }
}

export default async function ChapterReadPage({ params }: Props) {
  const { slug, chapterSlug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const decodedChapterSlug = decodeURIComponent(chapterSlug);

  const { getToken } = await auth();
  const token = await getToken();

  let manga;
  try {
    manga = await getMangaBySlug(decodedSlug);
  } catch {
    notFound();
  }

  const chapterNumberMatch = decodedChapterSlug.match(/ตอนที่-([\d.]+)/);
  if (!chapterNumberMatch) notFound();
  const chapterNumber = Number(chapterNumberMatch[1]);

  const allChapters = (manga.chapters || []).sort((a: any, b: any) => a.number - b.number);
  const matchedChapter = allChapters.find((c: any) => c.number === chapterNumber);
  if (!matchedChapter) notFound();

  let chapter;
  try {
    chapter = await getChapter(matchedChapter.id, token || undefined);
  } catch {
    notFound();
  }

  const currentIdx = allChapters.findIndex((c: any) => c.id === matchedChapter.id);
  const prevChapter = currentIdx > 0 ? allChapters[currentIdx - 1] : null;
  const nextChapter = currentIdx < allChapters.length - 1 ? allChapters[currentIdx + 1] : null;

  let coinBalance: number | undefined;
  if (token) {
    try {
      const me = await getMe(token);
      coinBalance = me.coin_balance;
    } catch { }
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
        name: manga.title,
        item: `${siteUrl}/manga/${manga.slug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `ตอนที่ ${chapterNumber}`,
        item: `${siteUrl}/${manga.slug}/ตอนที่-${chapterNumber}`,
      },
    ],
  };

  if (chapter.can_read === false) {
    return (
      <ChapterAccessGate
        chapterId={chapter.id}
        chapterNumber={chapter.number}
        chapterTitle={chapter.title}
        coinPrice={chapter.coin_price}
        requiresLogin={Boolean(chapter.requires_login)}
        manga={{ title: manga.title, slug: manga.slug }}
      />
    );
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      <ChapterReaderClient
        chapter={chapter}
        manga={{ id: manga.id, title: manga.title, slug: manga.slug }}
        allChapters={allChapters}
        prevChapterId={prevChapter?.id || null}
        nextChapterId={nextChapter?.id || null}
        coinBalance={coinBalance}
      />
    </>
  );
}

import { auth } from "@clerk/nextjs/server";
import { getChapter, getManga } from "@/lib/api";
import { notFound } from "next/navigation";
import ChapterReaderClient from "./ChapterReaderClient";
import ChapterAccessGate from "./ChapterAccessGate";

interface Props {
  params: Promise<{ chapterId: string }>;
}

export default async function ChapterReadPage({ params }: Props) {
  const { chapterId } = await params;
  const { getToken } = await auth();
  const token = await getToken();

  let chapter;
  try {
    chapter = await getChapter(chapterId, token || undefined);
  } catch {
    notFound();
  }

  let manga;
  try {
    manga = await getManga(chapter.manga_id);
  } catch {
    notFound();
  }

  const allChapters = manga.chapters.sort((a, b) => a.number - b.number);
  const currentIdx = allChapters.findIndex((c) => c.id === chapterId);
  const prevChapter = currentIdx > 0 ? allChapters[currentIdx - 1] : null;
  const nextChapter = currentIdx < allChapters.length - 1 ? allChapters[currentIdx + 1] : null;

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
    <ChapterReaderClient
      chapter={chapter}
      manga={{ id: manga.id, title: manga.title, slug: manga.slug }}
      allChapters={allChapters}
      prevChapterId={prevChapter?.id || null}
      nextChapterId={nextChapter?.id || null}
    />
  );
}

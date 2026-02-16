import { getChapter, getChapters, getManga } from "@/lib/api";
import { formatChapterNumber } from "@/lib/utils";
import { notFound } from "next/navigation";
import ChapterReaderClient from "./ChapterReaderClient";

interface Props {
  params: Promise<{ chapterId: string }>;
}

export default async function ChapterReadPage({ params }: Props) {
  const { chapterId } = await params;

  let chapter;
  try {
    chapter = await getChapter(chapterId);
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

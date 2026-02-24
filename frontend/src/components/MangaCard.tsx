import Image from "next/image";
import Link from "next/link";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/types";
import type { Manga } from "@/lib/types";

interface Props {
  manga: Manga;
}

export default function MangaCard({ manga }: Props) {
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const isNew = manga.last_chapter_updated_at
    ? new Date(manga.last_chapter_updated_at + "Z").getTime() > now - 7 * 24 * 60 * 60 * 1000
    : false;

  return (
    <Link href={`/manga/${manga.slug}`} className="group">
      <article className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface-100 ring-1 ring-white/10 transition-all duration-300 group-hover:ring-gold/40">
        <Image
          src={manga.cover_url || "/placeholder.png"}
          alt={manga.title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

        <div className="absolute left-2 top-2 flex items-center gap-1">
          <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] text-gray-100 ring-1 ring-white/20">
            {CATEGORY_LABELS[manga.category] || manga.category}
          </span>
        </div>

        {isNew && (
          <div className="absolute right-2 top-2 z-10 flex animate-pulse items-center rounded-sm bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-white shadow-lg shadow-red-900/50 ring-1 ring-white/30">
            NEW
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="mb-1 text-sm font-semibold leading-snug text-white">
            {manga.title}
          </h3>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-gray-300">
              {manga.chapter_count ?? 0} ตอน
            </span>
            <span className="text-gold">
              {STATUS_LABELS[manga.status] || manga.status}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

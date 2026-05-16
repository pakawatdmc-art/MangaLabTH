import Image from "next/image";
import Link from "next/link";
import { CATEGORY_LABELS, Manga } from "@/lib/types";
import { parseUTCDate, formatChapterNumber } from "@/lib/utils";

interface Props {
    manga: Manga;
    priority?: boolean;
}

export default function UpdateMangaCard({ manga, priority = false }: Props) {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const isNew = manga.last_chapter_updated_at
        ? parseUTCDate(manga.last_chapter_updated_at).getTime() > now - 3 * 24 * 60 * 60 * 1000
        : false;

    const getFormattedDate = () => {
        const dateStr = manga.last_chapter_updated_at || manga.created_at;
        if (!dateStr) return "";

        const date = parseUTCDate(dateStr);
        return date.toLocaleDateString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "Asia/Bangkok",
        });
    };

    return (
        <Link
            href={`/manga/${manga.slug}`}
            className="group relative flex flex-col transition-transform duration-300 ease-out hover:-translate-y-0.5"
        >
            {/* Thumbnail Container */}
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md bg-ink-800 transition-all duration-300 ease-out group-hover:ring-1 group-hover:ring-gold/40">
                <Image
                    src={manga.cover_url || "/placeholder.webp"}
                    alt={manga.title}
                    fill
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04] text-transparent"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    priority={priority}
                />

                {/* Subtle bottom gradient */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink-950/70 to-transparent" />

                {/* Category Badge */}
                <div className="absolute left-2 top-2 z-10 flex items-center">
                    <span className="rounded-xs bg-ink-950/75 px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider text-ink-100 backdrop-blur-md">
                        {CATEGORY_LABELS[manga.category] || manga.category}
                    </span>
                </div>

                {/* Pulse NEW tag */}
                {isNew && (
                    <div className="absolute right-2 top-2 z-10 flex animate-pulse items-center rounded-xs bg-red-600 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-white shadow-lg shadow-red-900/40">
                        NEW
                    </div>
                )}
            </div>

            {/* Info Block */}
            <div className="flex flex-col pt-2.5 pb-1 px-0.5">
                <h3 className="line-clamp-2 text-sm sm:text-[15px] font-medium leading-snug text-ink-100 group-hover:text-gold transition-colors duration-200 min-h-[40px] sm:min-h-[44px]">
                    {manga.title}
                </h3>

                <div className="mt-1.5 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-ink-100">
                            ตอนที่ {manga.latest_chapter_number != null ? formatChapterNumber(manga.latest_chapter_number) : (manga.chapter_count ?? 0)}
                        </span>
                    </div>
                    {getFormattedDate() && (
                        <span className="text-[10px] sm:text-[11px] text-ink-400 line-clamp-1">
                            {getFormattedDate()}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}

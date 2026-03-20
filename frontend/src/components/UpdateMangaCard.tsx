import Image from "next/image";
import Link from "next/link";
import { CATEGORY_LABELS, Manga } from "@/lib/types";

interface Props {
    manga: Manga;
}

export default function UpdateMangaCard({ manga }: Props) {
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const isNew = manga.last_chapter_updated_at
        ? new Date(manga.last_chapter_updated_at + "Z").getTime() > now - 7 * 24 * 60 * 60 * 1000
        : false;

    const getFormattedDate = () => {
        const dateStr = manga.last_chapter_updated_at || manga.created_at;
        if (!dateStr) return "";

        const date = new Date(dateStr + "Z");
        return date.toLocaleDateString("th-TH", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    return (
        <Link href={`/manga/${manga.slug}`} className="group relative flex flex-col transition-all duration-300 hover:-translate-y-1">

            {/* Thumbnail Container */}
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-surface-200 shadow-md ring-1 ring-white/10 transition-all group-hover:ring-gold/40 group-hover:shadow-gold/20">
                <Image
                    src={manga.cover_url || "/placeholder.png"}
                    alt={manga.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105 text-transparent"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                />

                {/* Category Badge */}
                <div className="absolute left-2 top-2 z-10 flex items-center">
                    <span className="rounded bg-teal-600/90 px-1.5 py-0.5 text-[10px] uppercase font-bold text-white shadow-sm ring-1 ring-white/20 backdrop-blur-md">
                        {CATEGORY_LABELS[manga.category] || manga.category}
                    </span>
                </div>

                {/* Pulse NEW tag */}
                {isNew && (
                    <div className="absolute right-2 top-2 z-10 flex animate-pulse items-center rounded-sm bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-white shadow-lg shadow-red-900/50 ring-1 ring-white/30">
                        NEW
                    </div>
                )}

            </div>

            {/* Info Block */}
            <div className="flex flex-col pt-2.5 pb-1 px-0.5">
                <h3 className="line-clamp-2 text-sm sm:text-[15px] font-medium leading-snug text-gray-200 group-hover:text-gold transition-colors min-h-[40px] sm:min-h-[44px]">
                    {manga.title}
                </h3>

                <div className="mt-1.5 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-white">
                            ตอนที่ {manga.chapter_count ?? 0}
                        </span>
                    </div>
                    {getFormattedDate() && (
                        <span className="text-[10px] sm:text-[11px] text-gray-500 line-clamp-1">
                            {getFormattedDate()}
                        </span>
                    )}
                </div>
            </div>

        </Link>
    );
}

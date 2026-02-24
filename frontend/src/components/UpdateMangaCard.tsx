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

    const timeAgo = () => {
        if (!manga.last_chapter_updated_at) return "ไม่ระบุ";

        const date = new Date(manga.last_chapter_updated_at + "Z");
        const diffInSeconds = Math.floor((now - date.getTime()) / 1000);

        if (diffInSeconds < 60) return "방금 전"; // Just now
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} นาที`;
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} ชั่วโมง`;
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) return `${diffInDays} วัน`;
        const diffInMonths = Math.floor(diffInDays / 30);
        if (diffInMonths < 12) return `${diffInMonths} เดือน`;
        const diffInYears = Math.floor(diffInMonths / 12);
        return `${diffInYears} ปี`;
    };

    return (
        <Link href={`/manga/${manga.slug}`} className="group relative flex flex-col overflow-hidden rounded-xl bg-[#2A2A2A] ring-1 ring-white/5 transition-all duration-300 hover:ring-gold/40">

            {/* Thumbnail Container */}
            <div className="relative aspect-[3/4] w-full overflow-hidden">
                <Image
                    src={manga.cover_url || "/placeholder.png"}
                    alt={manga.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                />

                {/* Category Badge */}
                <div className="absolute left-2 top-2 z-10 flex items-center">
                    <span className="rounded bg-teal-600/90 px-1.5 py-0.5 text-[10px] uppercase font-bold text-white shadow-sm">
                        {CATEGORY_LABELS[manga.category] || manga.category}
                    </span>
                </div>

                {/* Pulse NEW tag */}
                {isNew && (
                    <div className="absolute right-2 top-2 z-10 flex animate-pulse items-center rounded-sm bg-red-600 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider text-white shadow-lg shadow-red-900/50 ring-1 ring-white/30">
                        NEW
                    </div>
                )}

                {/* Color Badge (Static like reference image) */}
                <div className="absolute bottom-2 left-2 z-10 flex items-center">
                    <span className="rounded bg-gold px-1.5 py-0.5 text-[9px] font-bold text-black shadow-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-black/60"></span> COLOR
                    </span>
                </div>
            </div>

            {/* Info Block */}
            <div className="flex flex-col p-2.5">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-gray-200 group-hover:text-white min-h-[40px]">
                    {manga.title}
                </h3>

                {/* Chapter | Time Grid */}
                <div className="mt-2 flex w-full items-center justify-between rounded bg-[#1F1F1F] p-1.5 text-xs text-gray-400">
                    <span className="font-medium">ตอนที่ {manga.chapter_count ?? 0}</span>
                    <span>{timeAgo()}</span>
                </div>
            </div>

        </Link>
    );
}

"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BookOpen, Loader2, Trophy } from "lucide-react";
import { Manga } from "@/lib/types";
import { getTopManga } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

type Period = "weekly" | "monthly" | "all_time";

const TABS: { id: Period; label: string }[] = [
    { id: "weekly", label: "สัปดาห์นี้" },
    { id: "monthly", label: "เดือนนี้" },
    { id: "all_time", label: "ตลอดกาล" },
];

export default function TopMangaRanking() {
    const [period, setPeriod] = useState<Period>("weekly");
    const [mangas, setMangas] = useState<Manga[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            setLoading(true);
            try {
                const data = await getTopManga(period, 5);
                if (mounted) setMangas(data || []);
            } catch (err) {
                console.error("Failed to load top manga", err);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [period]);

    const top3 = mangas.slice(0, 3);
    const others = mangas.slice(3, 5);

    return (
        <div className="overflow-hidden rounded-lg bg-ink-800/40">
            {/* Panel Header */}
            <div className="flex flex-col items-stretch gap-3 px-5 pb-3 pt-5 sm:flex-row sm:items-center sm:justify-between lg:flex-col lg:items-stretch xl:flex-col">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">Ranking</span>
                    <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-ink-100">
                        <Trophy className="h-4 w-4 text-gold" />
                        การ์ตูนยอดฮิต Top 5
                    </h2>
                </div>
                <div className="flex w-full overflow-hidden rounded-sm bg-ink-950/60 p-1 sm:w-auto lg:w-full xl:w-full">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setPeriod(tab.id)}
                            className={`whitespace-nowrap flex-1 rounded-xs px-3 py-1.5 text-[11px] font-semibold transition-colors duration-200 sm:flex-none ${period === tab.id
                                ? "bg-gold text-ink-950"
                                : "text-ink-400 hover:text-ink-100"
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Panel Body */}
            <div className="p-4 sm:p-5">
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <Loader2 className="h-7 w-7 animate-spin text-gold" />
                    </div>
                ) : mangas.length === 0 ? (
                    <div className="flex h-64 items-center justify-center text-sm text-ink-400">
                        ไม่มีข้อมูลสถิติ
                    </div>
                ) : (
                    <div className="space-y-5">
                        {/* Top 3 Grid */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                            {top3.map((manga, idx) => (
                                <Link
                                    key={manga.id}
                                    href={`/manga/${manga.slug}`}
                                    className="group relative flex overflow-hidden rounded-md bg-ink-900/40 p-3 transition-colors duration-200 hover:bg-ink-900/80 sm:flex-col sm:items-center sm:p-4 text-center lg:flex-row lg:p-3 lg:text-left"
                                >
                                    {/* Medal Icon for Top 3 */}
                                    <div className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-ink-950/90 backdrop-blur-sm sm:left-4 sm:top-4 lg:left-3 lg:top-3">
                                        {idx === 0 && <span className="text-xl leading-none">🥇</span>}
                                        {idx === 1 && <span className="text-xl leading-none">🥈</span>}
                                        {idx === 2 && <span className="text-xl leading-none">🥉</span>}
                                    </div>

                                    <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-xs sm:h-40 sm:w-28 lg:h-20 lg:w-14">
                                        {manga.cover_url ? (
                                            <Image
                                                src={manga.cover_url}
                                                alt={manga.title}
                                                fill
                                                sizes="(max-width: 640px) 64px, 112px"
                                                loading="lazy"
                                                className={`object-cover transition-transform duration-300 ease-out group-hover:scale-[1.06] ${idx === 0 ? "ring-1 ring-gold/40" : ""
                                                    }`}
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-ink-800">
                                                <span className="text-xs text-ink-400">No Image</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="ml-4 flex flex-col justify-center text-left sm:ml-0 sm:mt-4 sm:text-center lg:ml-4 lg:mt-0 lg:text-left">
                                        <h3 className="line-clamp-2 text-sm font-semibold text-ink-100 group-hover:text-gold transition-colors duration-200 sm:text-base">
                                            {manga.title}
                                        </h3>
                                        <div className="mt-2 flex items-center justify-start gap-1 text-xs text-ink-400 sm:justify-center lg:justify-start">
                                            <BookOpen className="h-3.5 w-3.5" />
                                            <span>{formatNumber(manga.total_reads)} อ่าน</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Rank 4-5 List */}
                        {others.length > 0 && (
                            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-1">
                                {others.map((manga, idx) => (
                                    <Link
                                        key={manga.id}
                                        href={`/manga/${manga.slug}`}
                                        className="group flex items-center gap-3 rounded-sm px-3 py-2 transition-colors duration-200 hover:bg-ink-900/60"
                                    >
                                        <div className="flex w-6 shrink-0 justify-center font-semibold text-ink-400 text-base">
                                            {idx + 4}
                                        </div>
                                        <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-xs">
                                            {manga.cover_url ? (
                                                <Image
                                                    src={manga.cover_url}
                                                    alt={manga.title}
                                                    fill
                                                    sizes="40px"
                                                    loading="lazy"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="bg-ink-800 h-full w-full" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="truncate text-sm font-medium text-ink-200 group-hover:text-ink-100 transition-colors">
                                                {manga.title}
                                            </h4>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1 text-xs text-ink-400">
                                            <BookOpen className="h-3.5 w-3.5" />
                                            {formatNumber(manga.total_reads)}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

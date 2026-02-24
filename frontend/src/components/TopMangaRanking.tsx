"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, Loader2, Trophy } from "lucide-react";
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
                const data = await getTopManga(period, 10);
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
        <div className="overflow-hidden rounded-xl bg-[#1A1A1A] ring-1 ring-white/10 shadow-xl">
            {/* Panel Header */}
            <div className="mb-0 flex flex-col items-center justify-between gap-4 border-b border-white/5 bg-[#242424] px-4 py-3 sm:flex-row sm:px-5 lg:flex-col lg:items-start xl:flex-col">
                <h2 className="flex items-center gap-2 text-lg font-bold tracking-wide text-white">
                    <Trophy className="h-5 w-5 text-gold" />
                    การ์ตูนยอดฮิต Top 5
                </h2>
                <div className="flex w-full overflow-hidden rounded-md bg-black/40 p-1 sm:w-auto lg:w-full xl:w-full">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setPeriod(tab.id)}
                            className={`whitespace-nowrap flex-1 rounded px-3 py-1.5 text-xs font-medium transition-all sm:flex-none ${period === tab.id
                                ? "bg-gold text-black shadow-sm"
                                : "text-gray-400 hover:text-white"
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
                        <Loader2 className="h-8 w-8 animate-spin text-gold" />
                    </div>
                ) : mangas.length === 0 ? (
                    <div className="flex h-64 items-center justify-center text-sm text-gray-400">
                        ไม่มีข้อมูลสถิติ
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Top 3 Grid */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
                            {top3.map((manga, idx) => (
                                <Link
                                    key={manga.id}
                                    href={`/manga/${manga.slug}`}
                                    className="group relative flex overflow-hidden rounded-xl bg-surface-200/50 p-3 transition-colors hover:bg-surface-300/50 sm:flex-col sm:items-center sm:p-4 text-center border-t border-white/5 lg:flex-row lg:p-3 lg:text-left"
                                >
                                    {/* Medal Icon for Top 3 */}
                                    <div className="absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/80 ring-2 ring-white/10 backdrop-blur-sm sm:left-4 sm:top-4 lg:left-3 lg:top-3">
                                        {idx === 0 && <span className="text-xl">🥇</span>}
                                        {idx === 1 && <span className="text-xl">🥈</span>}
                                        {idx === 2 && <span className="text-xl">🥉</span>}
                                    </div>

                                    <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-lg sm:h-40 sm:w-28 shadow-lg shadow-black/50 lg:h-20 lg:w-14">
                                        {manga.cover_url ? (
                                            <Image
                                                src={manga.cover_url}
                                                alt={manga.title}
                                                fill
                                                className={`object-cover transition-transform duration-300 group-hover:scale-110 ${idx === 0 ? "ring-2 ring-gold" : idx === 1 ? "ring-2 ring-slate-300" : "ring-2 ring-amber-700"
                                                    }`}
                                            />
                                        ) : (
                                            <div className="flex h-full w-full items-center justify-center bg-surface-300">
                                                <span className="text-xs text-gray-500">No Image</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="ml-4 flex flex-col justify-center text-left sm:ml-0 sm:mt-4 sm:text-center lg:ml-4 lg:mt-0 lg:text-left">
                                        <h3 className="line-clamp-2 text-sm font-bold text-white group-hover:text-gold sm:text-base">
                                            {manga.title}
                                        </h3>
                                        <div className="mt-2 flex items-center justify-start gap-1 text-xs text-gray-400 sm:justify-center lg:justify-start">
                                            <Eye className="h-3.5 w-3.5" />
                                            <span>{formatNumber(manga.total_views)} วิว</span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Rank 4-10 List */}
                        {others.length > 0 && (
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                                {others.map((manga, idx) => (
                                    <Link
                                        key={manga.id}
                                        href={`/manga/${manga.slug}`}
                                        className="group flex items-center gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-surface-200"
                                    >
                                        <div className="flex w-6 shrink-0 justify-center font-bold text-gray-500 text-lg">
                                            {idx + 4}
                                        </div>
                                        <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded">
                                            {manga.cover_url ? (
                                                <Image
                                                    src={manga.cover_url}
                                                    alt={manga.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="bg-surface-300 h-full w-full" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h4 className="truncate text-sm font-medium text-gray-200 group-hover:text-white">
                                                {manga.title}
                                            </h4>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
                                            <Eye className="h-3.5 w-3.5" />
                                            {formatNumber(manga.total_views)}
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

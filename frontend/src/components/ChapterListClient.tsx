"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatChapterNumber, formatDateTime } from "@/lib/utils";
import { Clock, Lock } from "lucide-react";

interface Chapter {
    id: string;
    number: number;
    title: string | null;
    published_at: string;
    page_count?: number;
    is_free: boolean;
    coin_price: number;
    is_unlocked?: boolean;
}

interface ChapterListClientProps {
    chapters: Chapter[];
    freeChapterCount: number;
}

export function ChapterListClient({ chapters, freeChapterCount }: ChapterListClientProps) {
    const [readChapters, setReadChapters] = useState<string[]>([]);

    useEffect(() => {
        try {
            const stored = localStorage.getItem("read_chapters");
            if (stored) {
                // eslint-disable-next-line react-hooks/set-state-in-effect
                setReadChapters(JSON.parse(stored));
            }
        } catch (e) {
            console.error("Failed to load read chapters", e);
        }
    }, []);

    return (
        <section className="mt-8 rounded-2xl border border-white/10 bg-surface-200/70 p-3.5 pb-4 shadow-lg shadow-black/30 sm:p-6 sm:pb-7">
            <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-white">
                    รายการตอน ({chapters.length})
                </h2>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-400">
                    อ่านฟรี {freeChapterCount}
                </span>
            </div>
            <div className="space-y-1.5">
                {chapters.map((ch) => {
                    const isRead = readChapters.includes(ch.id);

                    return (
                        <Link
                            key={ch.id}
                            href={`/read/${ch.id}`}
                            className={`flex items-start justify-between gap-3 rounded-xl px-3 py-3 ring-1 transition sm:items-center sm:px-4 ${isRead
                                ? "bg-black/40 ring-white/5 opacity-60 hover:bg-black/60 hover:opacity-100" // สไตล์จางๆ สำหรับตอนที่อ่านแล้ว
                                : "bg-black/25 ring-white/10 hover:bg-surface-50 hover:ring-gold/30"
                                }`}
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${isRead ? "bg-white/5 text-gray-500" : "bg-gold/10 text-gold"
                                    }`}>
                                    {formatChapterNumber(ch.number)}
                                </span>
                                <div className="min-w-0">
                                    <p className={`truncate text-sm font-medium ${isRead ? "text-gray-400" : "text-white"}`}>
                                        ตอนที่ {formatChapterNumber(ch.number)}
                                        {ch.title ? ` — ${ch.title}` : ""}
                                    </p>
                                    <p className={`text-[11px] ${isRead ? "text-gray-500" : "text-gray-400"}`}>
                                        <Clock className="mr-0.5 inline-block h-3 w-3" />
                                        {formatDateTime(ch.published_at + "Z")}
                                        {ch.page_count ? ` · ${ch.page_count} หน้า` : ""}
                                    </p>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 pt-0.5 sm:pt-0">
                                {!ch.is_free && ch.coin_price > 0 ? (
                                    ch.is_unlocked ? (
                                        <span className={`rounded-full px-2 py-0.5 text-xs ${isRead ? "bg-emerald-500/5 text-emerald-500/70" : "bg-emerald-500/10 text-emerald-400"}`}>
                                            ปลดล็อคแล้ว
                                        </span>
                                    ) : (
                                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isRead ? "bg-gold/5 text-gold/60" : "bg-gold/10 text-gold"}`}>
                                            <Lock className="h-3 w-3" />
                                            {ch.coin_price}
                                        </span>
                                    )
                                ) : (
                                    <span className={`rounded-full px-2 py-0.5 text-xs ${isRead ? "bg-emerald-500/5 text-emerald-500/70" : "bg-emerald-500/10 text-emerald-400"}`}>
                                        ฟรี
                                    </span>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>
        </section>
    );
}

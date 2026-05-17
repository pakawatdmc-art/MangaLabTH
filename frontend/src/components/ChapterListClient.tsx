"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatChapterNumber, formatDateTime, parseUTCDate } from "@/lib/utils";
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
    unlocks_at?: string | null;
}

interface ChapterListClientProps {
    chapters: Chapter[];
    freeChapterCount: number;
    mangaSlug: string;
}

export function ChapterListClient({ chapters, freeChapterCount, mangaSlug }: ChapterListClientProps) {
    const [readChapters, setReadChapters] = useState<string[]>([]);
    const [now, setNow] = useState(() => new Date());

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

    // Refresh countdown every 60 seconds
    useEffect(() => {
        const intv = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(intv);
    }, []);

    return (
        <section className="mt-8 rounded-lg bg-ink-800/40 p-3.5 pb-4 sm:p-6 sm:pb-7">
            <div className="mb-5 flex items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-400">Chapters</span>
                    <h2 className="text-base font-semibold text-ink-100">
                        รายการตอน ({chapters.length})
                    </h2>
                </div>
                <span className="rounded-xs bg-gold/10 px-2 py-0.5 text-[11px] font-semibold text-gold">
                    อ่านฟรี {freeChapterCount}
                </span>
            </div>
            <div className="divide-y divide-ink-700/40 rounded-sm overflow-hidden">
                {chapters.map((ch, idx) => {
                    const isRead = readChapters.includes(ch.id);

                    let unlockText = null;
                    if (!ch.is_free && ch.unlocks_at) {
                        const unlocksAt = parseUTCDate(ch.unlocks_at);
                        if (unlocksAt > now) {
                            const diffMs = unlocksAt.getTime() - now.getTime();
                            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                            const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

                            if (diffDays > 0) {
                                unlockText = `อ่านฟรีในอีก ${diffDays} วัน ${diffHours} ชั่วโมง ${diffMins} นาที`;
                            } else if (diffHours > 0) {
                                unlockText = `อ่านฟรีในอีก ${diffHours} ชั่วโมง ${diffMins} นาที`;
                            } else {
                                unlockText = `อ่านฟรีในอีก ${diffMins} นาที`;
                            }
                        } else {
                            unlockText = `ปลดล็อกแล้ว (รีเฟรช)`;
                        }
                    }

                    return (
                        <Link
                            key={ch.id}
                            href={`/${mangaSlug}/ตอนที่-${ch.number}`}
                            className={`flex items-start justify-between gap-3 px-3 py-3 transition-colors duration-150 sm:items-center sm:px-4 ${isRead
                                ? "bg-ink-800/30 opacity-60 hover:bg-ink-800/60 hover:opacity-100"
                                : idx % 2 === 0 ? "bg-ink-800/20 hover:bg-ink-700/40" : "bg-ink-800/45 hover:bg-ink-700/40"
                                }`}
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span className={`flex h-8 w-8 items-center justify-center rounded-xs text-xs font-bold ${isRead ? "bg-ink-800 text-ink-400" : "bg-gold/10 text-gold"
                                    }`}>
                                    {formatChapterNumber(ch.number)}
                                </span>
                                <div className="min-w-0">
                                    <p className={`truncate text-sm font-medium ${isRead ? "text-ink-300" : "text-ink-100"}`}>
                                        ตอนที่ {formatChapterNumber(ch.number)}
                                        {ch.title ? ` — ${ch.title}` : ""}
                                    </p>
                                    <p className={`text-[11px] ${isRead ? "text-ink-500" : "text-ink-400"}`}>
                                        <Clock className="mr-0.5 inline-block h-3 w-3" />
                                        {formatDateTime(ch.published_at)}
                                        {ch.page_count ? ` · ${ch.page_count} หน้า` : ""}
                                    </p>
                                    {unlockText && (
                                        <p className="mt-0.5 sm:hidden flex items-center gap-1 text-[11px] font-medium text-gold">
                                            <Clock className="h-3 w-3 text-gold/70" />
                                            {unlockText}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 pt-0.5 sm:pt-0">
                                {unlockText && (
                                    <span
                                        title={`ปลดล็อกให้อ่านฟรีวันที่ ${parseUTCDate(ch.unlocks_at!).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`}
                                        className={`hidden sm:inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-[10px] ${isRead ? "text-ink-500 bg-ink-800" : "text-ink-300 bg-ink-800"}`}
                                    >
                                        <Clock className="h-2.5 w-2.5" />
                                        {unlockText}
                                    </span>
                                )}
                                {!ch.is_free && ch.coin_price > 0 ? (
                                    ch.is_unlocked ? (
                                        <span className={`rounded-xs px-2 py-0.5 text-xs font-semibold ${isRead ? "bg-emerald-500/5 text-emerald-500/70" : "bg-emerald-500/10 text-emerald-300"}`}>
                                            ปลดล็อคแล้ว
                                        </span>
                                    ) : (
                                        <span className={`inline-flex items-center gap-1 rounded-xs px-2 py-0.5 text-xs font-semibold ${isRead ? "bg-gold/5 text-gold/60" : "bg-gold/10 text-gold"}`}>
                                            <Lock className="h-3 w-3" />
                                            {ch.coin_price}
                                        </span>
                                    )
                                ) : (
                                    <span className={`rounded-xs px-2 py-0.5 text-xs font-semibold ${isRead ? "bg-emerald-500/5 text-emerald-500/70" : "bg-emerald-500/10 text-emerald-300"}`}>
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

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { formatNumber } from "@/lib/utils";
import { getChapterDeepdiveAnalytics } from "@/lib/api";
import {
    ArrowLeft,
    Layers,
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    Coins,
    BarChart3,
    BookOpen,
    Key,
    Flame
} from "lucide-react";
import Link from "next/link";
import { AnalyticsNav } from "../AnalyticsNav";
import { TablePagination } from "@/components/TablePagination";

// ApexCharts needs to be dynamically imported
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
    ssr: false,
    loading: () => (
        <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
    ),
});

interface ChapterAnalyticsData {
    summary: {
        total_chapters: number;
        new_chapters: number;
        total_unlocks: number;
        coins_burned: number;
    };
    previous_summary: {
        total_chapters: number;
        new_chapters: number;
        total_unlocks: number;
        coins_burned: number;
    };
    segments: {
        paid_chapters: number;
        free_chapters: number;
    };
    unlock_trend: { date: string; unlocks: number; coins_burned: number }[];
    top_chapters: {
        manga_title: string;
        manga_slug: string;
        chapter_number: number;
        unlocks: number;
        coins_earned: number;
    }[];
}

export default function ChapterAnalyticsDashboard() {
    const { getToken, isLoaded } = useAuth();
    const [data, setData] = useState<ChapterAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [timeRange, setTimeRange] = useState<number>(7); // days
    const [tablePage, setTablePage] = useState(1);

    useEffect(() => {
        if (!isLoaded) return;
        (async () => {
            try {
                setLoading(true);
                const token = await getToken();
                if (!token) throw new Error("No token");
                const result = await getChapterDeepdiveAnalytics(token, timeRange);
                setData(result);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Error loading analytics");
            } finally {
                setLoading(false);
            }
        })();
    }, [isLoaded, getToken, timeRange]);

    // Reset table page when time range changes
    useEffect(() => { setTablePage(1); }, [timeRange]);

    const ITEMS_PER_PAGE = 10;
    const chapterItems = data?.top_chapters || [];
    const chaptersTotalPages = Math.ceil(chapterItems.length / ITEMS_PER_PAGE);
    const chaptersPageItems = chapterItems.slice((tablePage - 1) * ITEMS_PER_PAGE, tablePage * ITEMS_PER_PAGE);

    // Helpers
    const calcGrowth = (current: number, prev: number) => {
        if (prev === 0) return current > 0 ? 100 : 0;
        return ((current - prev) / prev) * 100;
    };

    const renderGrowthBadge = (current: number, prev: number) => {
        const growth = calcGrowth(current, prev);
        const isUp = growth > 0;
        const isNeutral = growth === 0;

        if (isNeutral) {
            return <div className="text-[10px] font-medium text-ink-500">คงที่</div>;
        }

        return (
            <div className={`flex items-center gap-0.5 text-[11px] font-bold ${isUp ? "text-emerald-300" : "text-red-300"}`}>
                {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(growth).toFixed(1)}%
            </div>
        );
    };

    // ── Chart 1: Unlock Trend (Area Chart) ──────────────────────────────────
    const trendSeries = [
        {
            name: "เหรียญที่ถูกเบิร์น (Coins Burned)",
            data: (data?.unlock_trend || []).map((d) => ({
                x: new Date(d.date).getTime(),
                y: d.coins_burned,
            })),
        },
        {
            name: "จำนวนครั้งที่ปลดล็อก (Unlocks)",
            data: (data?.unlock_trend || []).map((d) => ({
                x: new Date(d.date).getTime(),
                y: d.unlocks,
            })),
        }
    ];

    const trendOptions: ApexCharts.ApexOptions = {
        chart: {
            type: "area",
            height: 350,
            background: "transparent",
            toolbar: { show: false },
            animations: { enabled: true }
        },
        colors: ["#FBBF24", "#10B981"], // Yellow (Coins), Emerald (Unlocks)
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.3,
                opacityTo: 0.05,
                stops: [0, 90, 100]
            }
        },
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 2 },
        theme: { mode: "light" },
        xaxis: {
            type: "datetime",
            labels: { style: { colors: "#6B7280" }, datetimeFormatter: { day: 'dd MMM' } },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: [
            {
                labels: { style: { colors: "#FBBF24" }, formatter: (value) => formatNumber(Math.floor(value)) },
                title: { text: "Coins", style: { color: "#FBBF24" } }
            },
            {
                opposite: true,
                labels: { style: { colors: "#10B981" }, formatter: (value) => formatNumber(Math.floor(value)) },
                title: { text: "Unlocks", style: { color: "#10B981" } }
            }
        ],
        grid: { borderColor: "rgba(0,0,0,0.05)", strokeDashArray: 4 },
        tooltip: { theme: "light", x: { format: "dd MMM yyyy" } },
    };

    // ── Chart 2: Content Mix (Donut) ──────────────────────────────────
    const mixSeries = [
        data?.segments.free_chapters || 0,
        data?.segments.paid_chapters || 0
    ];
    
    const mixOptions: ApexCharts.ApexOptions = {
        chart: { type: "donut", background: "transparent", animations: { enabled: true } },
        labels: ["ตอนฟรี (Free)", "ตอนเสียเงิน (Paid)"],
        colors: ["#3B82F6", "#FBBF24"], // Blue, Yellow
        stroke: { show: true, colors: ["#ffffff"], width: 2 },
        theme: { mode: "light" },
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        name: { show: true, color: "#6B7280" },
                        value: { show: true, color: "#111827", fontSize: "24px", fontWeight: 700, formatter: (val) => formatNumber(Number(val)) },
                        total: { show: true, showAlways: true, label: "Total Chapters", color: "#6B7280", formatter: (w) => formatNumber(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)) }
                    }
                }
            }
        },
        legend: { position: "bottom", labels: { colors: "#6B7280" } },
        tooltip: { theme: "light", y: { formatter: (val) => formatNumber(val) + " ตอน" } },
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <AnalyticsNav />
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin"
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
                            <Layers className="h-6 w-6 text-gray-400" />
                            Chapter Analytics Dashboard
                        </h1>
                        <p className="text-sm text-gray-500">สถิติเชิงลึกสำหรับวิเคราะห์ประสิทธิภาพการทำเงินของคอนเทนต์</p>
                    </div>
                </div>

                {/* Time range selector */}
                <div className="inline-flex rounded-lg bg-gray-100 p-1">
                    {[
                        { label: "1 วัน", value: 1 },
                        { label: "7 วัน", value: 7 },
                        { label: "30 วัน", value: 30 },
                        { label: "90 วัน", value: 90 },
                    ].map((range) => (
                        <button
                            key={range.value}
                            onClick={() => setTimeRange(range.value)}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${timeRange === range.value
                                ? "bg-white text-gray-900 shadow-sm"
                                : "text-gray-500 hover:text-gray-900"
                                }`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {error ? (
                <div className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            ) : (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                label: `ตอนทั้งหมด`,
                                value: data?.summary?.total_chapters || 0,
                                prev: data?.previous_summary?.total_chapters || 0,
                                icon: Layers,
                                color: "text-gray-600", bgColor: "bg-gray-50",
                            },
                            {
                                label: `ตอนที่อัปเดตใหม่ (${timeRange} วัน)`,
                                value: data?.summary?.new_chapters || 0,
                                prev: data?.previous_summary?.new_chapters || 0,
                                icon: BookOpen,
                                color: "text-gray-600", bgColor: "bg-gray-50",
                            },
                            {
                                label: `จำนวนครั้งที่ปลดล็อก (Unlocks)`,
                                value: data?.summary?.total_unlocks || 0,
                                prev: data?.previous_summary?.total_unlocks || 0,
                                icon: Key,
                                color: "text-gray-600", bgColor: "bg-gray-50",
                            },
                            {
                                label: `เหรียญที่ถูกใช้ (Coins Burned)`,
                                value: data?.summary?.coins_burned || 0,
                                prev: data?.previous_summary?.coins_burned || 0,
                                icon: Flame,
                                color: "text-gray-600", bgColor: "bg-gray-50",
                            },
                        ].map((card, i) => (
                            <div
                                key={i}
                                className="relative overflow-hidden rounded-xl bg-white border border-gray-200 p-6 shadow-sm transition-all hover:shadow-md hover:border-gray-300"
                            >
                                

                                <div className="flex items-start justify-between">
                                    <div className="relative">
                                        <div className="mb-2 flex items-center gap-2">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">{card.label}</p>
                                        </div>
                                        <div className="flex items-baseline gap-3">
                                            <div className="text-3xl font-bold text-gray-900">
                                                {loading ? <div className="h-9 w-24 animate-pulse rounded bg-gray-200 mt-1"></div> : formatNumber(card.value)}
                                            </div>
                                            {!loading && card.prev !== undefined && renderGrowthBadge(card.value, card.prev)}
                                        </div>
                                    </div>
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bgColor} ${card.color}`}>
                                        <card.icon className="h-6 w-6" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Middle Row: Trend & Demographics */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Unlock Trend Chart */}
                        <div className="lg:col-span-2 rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-gray-900">
                                        <BarChart3 className="h-5 w-5 text-gray-400" />
                                        Unlock Velocity (เทรนด์การปลดล็อก)
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-1">จำนวนเหรียญที่ถูกใช้และจำนวนครั้งที่ปลดล็อกในช่วง {timeRange} วันที่ผ่านมา</p>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                {!loading && data ? (
                                    <ReactApexChart options={trendOptions} series={trendSeries} type="area" height="100%" />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-gold" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content Mix Chart */}
                        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-gray-900">
                                        <PieChart className="h-5 w-5 text-gray-400" />
                                        Content Mix (สัดส่วนตอนฟรี/จ่ายเงิน)
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-1">สัดส่วนของตอนที่อ่านฟรีและตอนที่ต้องใช้เหรียญปลดล็อก (ทั้งหมด)</p>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                {!loading && data ? (
                                    <ReactApexChart options={mixOptions} series={mixSeries} type="donut" height="100%" />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-gold" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Top Earning Chapters */}
                    <div className="grid grid-cols-1 gap-6">
                        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm flex flex-col">
                            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold tracking-tight text-gray-900">
                                <Coins className="h-5 w-5 text-gold-dark" />
                                Top Earning Chapters (สินค้าขายดี)
                            </h2>
                            <p className="mb-6 text-xs text-gray-500">อันดับตอนที่ทำรายได้สูงสุด (เผาเหรียญผู้ใช้ได้เยอะที่สุด) ในช่วง {timeRange} วันที่ผ่านมา</p>

                            <div className="overflow-x-auto rounded-lg border border-gray-100">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">อันดับ</th>
                                            <th className="px-4 py-3 font-semibold">มังงะ</th>
                                            <th className="px-4 py-3 font-semibold text-center">ตอนที่ (Chapter)</th>
                                            <th className="px-4 py-3 font-semibold text-right">จำนวนครั้งที่ปลดล็อก</th>
                                            <th className="px-4 py-3 font-semibold text-right text-gold-dark">เหรียญที่ทำได้ (Revenue)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-gray-400">
                                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                                </td>
                                            </tr>
                                        ) : data?.top_chapters.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-gray-400">ไม่พบข้อมูลการปลดล็อกตอนในช่วงเวลานี้</td>
                                            </tr>
                                        ) : (
                                            chaptersPageItems.map((chapter, index) => {
                                                const rank = (tablePage - 1) * ITEMS_PER_PAGE + index;
                                                return (
                                                    <tr key={index} className="transition-colors hover:bg-gray-50/80">
                                                        <td className="px-4 py-3">
                                                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${rank === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                #{rank + 1}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Link href={`/manga/${chapter.manga_slug}`} target="_blank" className="font-medium text-gray-900 hover:text-gold-dark transition-colors line-clamp-1">{chapter.manga_title}</Link>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="inline-flex items-center rounded-md bg-gray-100 border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600">
                                                                Ch. {chapter.chapter_number}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-gray-500">
                                                            {formatNumber(chapter.unlocks)} ครั้ง
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-gold-dark">
                                                            {formatNumber(chapter.coins_earned)} เหรียญ
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4">
                                <TablePagination currentPage={tablePage} totalPages={chaptersTotalPages} onPageChange={setTablePage} />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

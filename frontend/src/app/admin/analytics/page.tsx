"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { formatNumber } from "@/lib/utils";
import { getMarketingAnalytics } from "@/lib/api";
import {
    ArrowLeft,
    Eye,
    Loader2,
    TrendingUp,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    BookOpen,
    Activity
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { AnalyticsNav } from "./AnalyticsNav";
import { TablePagination } from "@/components/TablePagination";

// ApexCharts needs to be dynamically imported because it references window
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
    ssr: false,
    loading: () => (
        <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
    ),
});

interface AnalyticsData {
    summary: {
        total_views: number;
        total_reads: number;
        new_users: number;
        total_users: number;
    };
    previous_summary: {
        total_views: number;
        total_reads: number;
        new_users: number;
        total_users: number;
    };
    views_by_category: { category: string; views: number }[];
    chart_data: { date: string; views: number; reads: number }[];
    top_traffic_mangas: { id: string; title: string; slug: string; cover_image: string; views: number; reads: number }[];
}

export default function TrafficDashboard() {
    const { getToken, isLoaded } = useAuth();
    const [data, setData] = useState<AnalyticsData | null>(null);
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
                const result = await getMarketingAnalytics(token, timeRange);
                setData(result);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Error loading analytics");
            } finally {
                setLoading(false);
            }
        })();
    }, [isLoaded, getToken, timeRange]);

    // Reset table page when time range or data changes
    useEffect(() => { setTablePage(1); }, [timeRange]);

    const ITEMS_PER_PAGE = 10;
    const trafficItems = data?.top_traffic_mangas || [];
    const trafficTotalPages = Math.ceil(trafficItems.length / ITEMS_PER_PAGE);
    const trafficPageItems = trafficItems.slice((tablePage - 1) * ITEMS_PER_PAGE, tablePage * ITEMS_PER_PAGE);

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

    // ── Chart 1: Views vs Reads Trend ────────────────────────────────────────────────
    const trendSeries = [
        {
            name: "ยอดวิวรวม (Page Views)",
            data: (data?.chart_data || []).map((d) => ({
                x: new Date(d.date).getTime(),
                y: d.views,
            })),
        },
        {
            name: "ยอดเข้าอ่านจริง (Chapter Reads)",
            data: (data?.chart_data || []).map((d) => ({
                x: new Date(d.date).getTime(),
                y: d.reads,
            })),
        },
    ];

    const trendOptions: ApexCharts.ApexOptions = {
        chart: {
            type: "area",
            height: 350,
            background: "transparent",
            toolbar: { show: false },
            animations: { enabled: true }
        },
        colors: ["#3B82F6", "#10B981"], // Blue for Views, Emerald for Reads
        fill: {
            type: "gradient",
            gradient: { shadeIntensity: 1, opacityFrom: 0.2, opacityTo: 0.05, stops: [0, 90, 100] }
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
        yaxis: {
            labels: { style: { colors: "#6B7280" }, formatter: (value) => formatNumber(Math.floor(value)) },
        },
        grid: { borderColor: "rgba(0,0,0,0.05)", strokeDashArray: 4 },
        legend: { position: 'top', horizontalAlign: 'right', offsetY: 0, labels: { colors: "#6B7280" } },
        tooltip: { theme: "light", x: { format: "dd MMM yyyy" } },
    };

    // ── Chart 2: Category Popularity (Donut) ──────────────────────────────────
    const categorySeries = (data?.views_by_category || []).map(c => c.views);
    const categoryOptions: ApexCharts.ApexOptions = {
        chart: { type: "donut", background: "transparent", animations: { enabled: true } },
        labels: (data?.views_by_category || []).map(c => c.category),
        colors: ["#d4a843", "#5db8a8", "#c97b5e", "#7a8db5", "#b57aa8", "#8d9b6f"],
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
                        total: { show: true, showAlways: true, label: "Total Views", color: "#6B7280", formatter: (w) => formatNumber(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)) }
                    }
                }
            }
        },
        legend: { position: "bottom", labels: { colors: "#6B7280" } },
        tooltip: { theme: "light", y: { formatter: (val) => formatNumber(val) + " Views" } },
    };

    // Calculate Engagement Rate
    const currentEngagement = data?.summary.total_views ? (data.summary.total_reads / data.summary.total_views) * 100 : 0;
    const prevEngagement = data?.previous_summary.total_views ? (data.previous_summary.total_reads / data.previous_summary.total_views) * 100 : 0;

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
                            <Activity className="h-6 w-6 text-gray-400" />
                            Traffic & Engagement Dashboard
                        </h1>
                        <p className="text-sm text-gray-500">สถิติเชิงลึกสำหรับวิเคราะห์ความสนใจและพฤติกรรมการเข้าชม</p>
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
                    {/* Key Traffic Metrics */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {[
                            {
                                label: `ยอดวิวรวม`,
                                value: data?.summary?.total_views || 0,
                                prev: data?.previous_summary?.total_views || 0,
                                icon: Eye,
                                color: "text-gray-600", bgColor: "bg-gray-50",
                            },
                            {
                                label: `ยอดเข้าอ่านจริง (Reads)`,
                                value: data?.summary?.total_reads || 0,
                                prev: data?.previous_summary?.total_reads || 0,
                                icon: BookOpen,
                                color: "text-gray-600", bgColor: "bg-gray-50",
                            },
                            {
                                label: `อัตราการเข้าอ่าน`,
                                value: currentEngagement,
                                prev: prevEngagement,
                                isPercent: true,
                                icon: TrendingUp,
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
                                                {loading ? <div className="h-9 w-24 animate-pulse rounded bg-gray-200 mt-1"></div> : card.isPercent ? `${card.value.toFixed(1)}%` : formatNumber(card.value)}
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
                        {/* Traffic Trend Chart */}
                        <div className="lg:col-span-2 rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-gray-900">
                                        <BarChart3 className="h-5 w-5 text-gray-400" />
                                        แนวโน้มความสนใจ (Traffic Trend)
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-1">เปรียบเทียบยอดการเปิดหน้า (Views) และการกดอ่านตอน (Reads)</p>
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

                        {/* Category Popularity Chart */}
                        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-gray-900">
                                        <PieChart className="h-5 w-5 text-gray-400" />
                                        ความนิยมตามหมวดหมู่
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-1">สัดส่วนผู้เข้าชมแบ่งตาม Genre</p>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                {!loading && data ? (
                                    data.views_by_category.length > 0 ? (
                                        <ReactApexChart options={categoryOptions} series={categorySeries} type="donut" height="100%" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-ink-500">ไม่มีข้อมูลหมวดหมู่</div>
                                    )
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-gold" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Top Traffic Drivers */}
                    <div className="grid grid-cols-1 gap-6">
                        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm flex flex-col">
                            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold tracking-tight text-gray-900">
                                <TrendingUp className="h-5 w-5 text-gray-400" />
                                มังงะที่ดึงดูดทราฟฟิกสูงสุด (Top Traffic Drivers)
                            </h2>
                            <p className="mb-6 text-xs text-gray-500">เรียงตามยอดเข้าชมในช่วง {timeRange} วันล่าสุด พร้อมวิเคราะห์อัตราการเข้าอ่าน</p>

                            <div className="overflow-x-auto rounded-lg border border-gray-100">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">อันดับ</th>
                                            <th className="px-4 py-3 font-semibold">มังงะ</th>
                                            <th className="px-4 py-3 font-semibold text-right">ยอดเข้าชม (Views)</th>
                                            <th className="px-4 py-3 font-semibold text-right">ยอดอ่านจริง (Reads)</th>
                                            <th className="px-4 py-3 font-semibold text-right">อัตราการอ่าน</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-gray-400">
                                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                                </td>
                                            </tr>
                                        ) : data?.top_traffic_mangas.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-gray-400">ไม่พบข้อมูลการเข้าชม</td>
                                            </tr>
                                        ) : (
                                            trafficPageItems.map((manga, index) => {
                                                const rank = (tablePage - 1) * ITEMS_PER_PAGE + index;
                                                const rate = manga.views ? (manga.reads / manga.views) * 100 : 0;
                                                return (
                                                    <tr key={manga.id} className="transition-colors hover:bg-gray-50/80">
                                                        <td className="px-4 py-3">
                                                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${rank === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                #{rank + 1}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Link href={`/manga/${manga.slug}`} className="flex items-center gap-3 group">
                                                                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-gray-200">
                                                                    <Image src={manga.cover_image || "https://placehold.co/400x600/1A1A1A/EDEDED/png?text=No+Cover"} alt={manga.title} fill className="object-cover" sizes="40px" />
                                                                </div>
                                                                <span className="font-medium text-gray-900 group-hover:text-gold-dark transition-colors line-clamp-1">{manga.title}</span>
                                                            </Link>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-medium text-gray-900">{formatNumber(manga.views)}</td>
                                                        <td className="px-4 py-3 text-right text-gray-500">{formatNumber(manga.reads)}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${rate >= 50 ? 'bg-emerald-50 text-emerald-600' : rate >= 20 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                                                                {rate.toFixed(1)}%
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4">
                                <TablePagination currentPage={tablePage} totalPages={trafficTotalPages} onPageChange={setTablePage} />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { formatNumber } from "@/lib/utils";
import { getMangaDeepdiveAnalytics } from "@/lib/api";
import {
    ArrowLeft,
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    BarChart3,
    BookOpen,
    LibraryBig,
    ActivitySquare,
    Eye,
    TrendingUp,
    Crown
} from "lucide-react";
import Link from "next/link";
import { AnalyticsNav } from "../AnalyticsNav";
import { TablePagination } from "@/components/TablePagination";

// ApexCharts needs to be dynamically imported
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
    ssr: false,
    loading: () => (
        <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
    ),
});

interface MangaAnalyticsData {
    summary: {
        total_mangas: number;
        new_mangas: number;
        ongoing_mangas: number;
        read_through_rate: number;
    };
    previous_summary: {
        total_mangas: number;
        new_mangas: number;
        ongoing_mangas: number;
        read_through_rate: number;
    };
    status_distribution: {
        ongoing: number;
        completed: number;
        hiatus: number;
        dropped: number;
    };
    revenue_by_category: { category: string; revenue: number }[];
    top_franchises: {
        id: string;
        title: string;
        slug: string;
        views: number;
        reads: number;
        revenue: number;
    }[];
}

export default function MangaAnalyticsDashboard() {
    const { getToken, isLoaded } = useAuth();
    const [data, setData] = useState<MangaAnalyticsData | null>(null);
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
                const result = await getMangaDeepdiveAnalytics(token, timeRange);
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
    const franchiseItems = data?.top_franchises || [];
    const franchiseTotalPages = Math.ceil(franchiseItems.length / ITEMS_PER_PAGE);
    const franchisePageItems = franchiseItems.slice((tablePage - 1) * ITEMS_PER_PAGE, tablePage * ITEMS_PER_PAGE);

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
            return <div className="text-[10px] font-medium text-gray-500">คงที่</div>;
        }

        return (
            <div className={`flex items-center gap-0.5 text-[11px] font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(growth).toFixed(1)}%
            </div>
        );
    };

    // ── Chart 1: Status Distribution (Donut) ──────────────────────────────────
    const statusSeries = [
        data?.status_distribution.ongoing || 0,
        data?.status_distribution.completed || 0,
        data?.status_distribution.hiatus || 0,
        data?.status_distribution.dropped || 0,
    ];

    const statusOptions: ApexCharts.ApexOptions = {
        chart: { type: "donut", background: "transparent", animations: { enabled: true } },
        labels: ["Ongoing (กำลังตีพิมพ์)", "Completed (จบแล้ว)", "Hiatus (ดอง)", "Dropped (เท)"],
        colors: ["#10B981", "#3B82F6", "#F59E0B", "#EF4444"], // Emerald, Blue, Amber, Red
        stroke: { show: true, colors: ["#131826"], width: 2 },
        theme: { mode: "dark" },
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        name: { show: true, color: "#9CA3AF" },
                        value: { show: true, color: "#FFF", fontSize: "24px", fontWeight: 700, formatter: (val) => formatNumber(Number(val)) },
                        total: { show: true, showAlways: true, label: "Total Series", color: "#9CA3AF", formatter: (w) => formatNumber(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)) }
                    }
                }
            }
        },
        legend: { position: "bottom", labels: { colors: "#9CA3AF" } },
        tooltip: { theme: "dark", y: { formatter: (val) => formatNumber(val) + " เรื่อง" } },
    };

    // ── Chart 2: Revenue by Category (Bar) ──────────────────────────────────
    const sortedCategories = [...(data?.revenue_by_category || [])].sort((a, b) => b.revenue - a.revenue).slice(0, 7);
    
    const categorySeries = [{
        name: "Revenue (เหรียญ)",
        data: sortedCategories.map(c => c.revenue)
    }];

    const categoryOptions: ApexCharts.ApexOptions = {
        chart: { type: "bar", background: "transparent", toolbar: { show: false } },
        colors: ["#FBBF24"],
        plotOptions: {
            bar: {
                borderRadius: 4,
                horizontal: true,
                barHeight: '60%',
                dataLabels: { position: 'right' }
            }
        },
        dataLabels: {
            enabled: true,
            textAnchor: 'start',
            style: { colors: ['#fff'] },
            formatter: (val) => formatNumber(Number(val)),
            offsetX: 10
        },
        theme: { mode: "dark" },
        xaxis: {
            categories: sortedCategories.map(c => c.category.toUpperCase()),
            labels: { style: { colors: "#9CA3AF" } },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: { style: { colors: "#E5E7EB", fontWeight: 600 } }
        },
        grid: { borderColor: "rgba(255,255,255,0.05)", strokeDashArray: 4 },
        tooltip: { theme: "dark" },
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <AnalyticsNav />
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-surface-100/50 text-gray-400 transition hover:bg-surface-200 hover:text-white"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <LibraryBig className="h-6 w-6 text-blue-400" />
                            Manga Analytics Dashboard
                        </h1>
                        <p className="text-sm text-gray-400">สถิติเชิงลึกสำหรับการบริหารคลังคอนเทนต์ (Portfolio Management)</p>
                    </div>
                </div>

                {/* Time range selector */}
                <div className="inline-flex rounded-lg border border-white/10 bg-surface-100 p-1">
                    {[
                        { label: "1 วัน", value: 1 },
                        { label: "7 วัน", value: 7 },
                        { label: "30 วัน", value: 30 },
                        { label: "90 วัน", value: 90 },
                    ].map((range) => (
                        <button
                            key={range.value}
                            onClick={() => setTimeRange(range.value)}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${timeRange === range.value
                                ? "bg-surface-300 text-white shadow-sm"
                                : "text-gray-400 hover:text-white"
                                }`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {error ? (
                <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                </div>
            ) : (
                <>
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                label: `ซีรีส์ทั้งหมด (Total Titles)`,
                                value: data?.summary?.total_mangas || 0,
                                prev: data?.previous_summary?.total_mangas || 0,
                                icon: LibraryBig,
                                color: "text-blue-400",
                                bgColor: "bg-blue-400/10",
                            },
                            {
                                label: `เปิดตัวใหม่ (${timeRange} วัน)`,
                                value: data?.summary?.new_mangas || 0,
                                prev: data?.previous_summary?.new_mangas || 0,
                                icon: BookOpen,
                                color: "text-emerald-400",
                                bgColor: "bg-emerald-400/10",
                            },
                            {
                                label: `ซีรีส์ที่กำลังตีพิมพ์ (Ongoing)`,
                                value: data?.summary?.ongoing_mangas || 0,
                                prev: data?.previous_summary?.ongoing_mangas || 0,
                                icon: ActivitySquare,
                                color: "text-purple-400",
                                bgColor: "bg-purple-400/10",
                            },
                            {
                                label: `อัตราการอ่านต่อ (Read-Through)`,
                                value: `${(data?.summary?.read_through_rate || 0).toFixed(1)}%`,
                                prev: null, // Read-through rate doesn't easily compare to exactly prev period simply
                                icon: Eye,
                                color: "text-pink-400",
                                bgColor: "bg-pink-400/10",
                            },
                        ].map((card, i) => (
                            <div
                                key={i}
                                className="relative overflow-hidden rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10 transition-transform hover:scale-[1.02]"
                            >
                                <div className="absolute right-0 top-0 -mr-6 -mt-6 rounded-full blur-3xl opacity-20 w-32 h-32" style={{ backgroundColor: "currentColor", color: card.color === "text-blue-400" ? "#60A5FA" : card.color === "text-emerald-400" ? "#10B981" : card.color === "text-purple-400" ? "#C084FC" : "#F472B6" }} />

                                <div className="flex items-start justify-between">
                                    <div className="relative">
                                        <div className="mb-2 flex items-center gap-2">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{card.label}</p>
                                        </div>
                                        <div className="flex items-baseline gap-3">
                                            <div className="text-3xl font-bold text-white drop-shadow-md">
                                                {loading ? <div className="h-9 w-24 animate-pulse rounded bg-white/20 mt-1"></div> : card.value}
                                            </div>
                                            {!loading && card.prev !== null && card.prev !== undefined && renderGrowthBadge(Number(card.value), Number(card.prev))}
                                        </div>
                                    </div>
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bgColor} ${card.color}`}>
                                        <card.icon className="h-6 w-6" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Middle Row: Portfolio Health & Genre Revenue */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Status Distribution Chart */}
                        <div className="rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <PieChart className="h-5 w-5 text-purple-400" />
                                        Portfolio Health
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-1">สัดส่วนสถานะการตีพิมพ์ของมังงะในคลังทั้งหมด</p>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                {!loading && data ? (
                                    <ReactApexChart options={statusOptions} series={statusSeries} type="donut" height="100%" />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Revenue by Category Chart */}
                        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-gold" />
                                        Revenue by Category (หมวดหมู่ที่ทำเงินสูงสุด)
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-1">รายได้รวมแยกตามหมวดหมู่ในช่วง {timeRange} วันที่ผ่านมา (ใช้สำหรับหาหมวดหมู่ที่คนยอมจ่ายเงินอ่าน)</p>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                {!loading && data ? (
                                    data.revenue_by_category.length > 0 ? (
                                        <ReactApexChart options={categoryOptions} series={categorySeries} type="bar" height="100%" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                            ไม่พบข้อมูลรายได้ในช่วงเวลานี้
                                        </div>
                                    )
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-gold" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Top Franchises */}
                    <div className="grid grid-cols-1 gap-6">
                        <div className="rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10 flex flex-col">
                            <h2 className="mb-1 text-lg font-bold text-white flex items-center gap-2">
                                <Crown className="h-5 w-5 text-emerald-400" />
                                Franchise Leaderboard (มังงะเรือธง)
                            </h2>
                            <p className="mb-6 text-xs text-gray-400">ซีรีส์ที่ทำรายได้รวม (รวมทุกตอน) สูงสุดในช่วง {timeRange} วันที่ผ่านมา (Hero Products)</p>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-surface-200/50 text-xs uppercase text-gray-400">
                                        <tr>
                                            <th className="rounded-l-lg px-4 py-3 font-semibold">อันดับ</th>
                                            <th className="px-4 py-3 font-semibold">ชื่อเรื่อง (Franchise)</th>
                                            <th className="px-4 py-3 font-semibold text-right">ยอดเข้าชม (Views)</th>
                                            <th className="px-4 py-3 font-semibold text-right">ยอดอ่านจริง (Reads)</th>
                                            <th className="rounded-r-lg px-4 py-3 font-semibold text-right text-gold">รายได้รวม (Total Revenue)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-gray-500">
                                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                                </td>
                                            </tr>
                                        ) : data?.top_franchises.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-gray-500">ไม่พบข้อมูลมังงะที่ทำรายได้ในช่วงเวลานี้</td>
                                            </tr>
                                        ) : (
                                            franchisePageItems.map((franchise, index) => {
                                                const rank = (tablePage - 1) * ITEMS_PER_PAGE + index;
                                                return (
                                                    <tr key={franchise.id} className="transition hover:bg-white/[0.02]">
                                                        <td className="px-4 py-3">
                                                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${rank === 0 ? 'bg-emerald-400/20 text-emerald-400' : rank === 1 ? 'bg-gray-400/20 text-gray-300' : rank === 2 ? 'bg-orange-600/20 text-orange-400' : 'bg-surface-200 text-gray-400'}`}>
                                                                #{rank + 1}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Link href={`/manga/${franchise.slug}`} target="_blank" className="font-medium text-white hover:text-emerald-400 transition line-clamp-1">
                                                                {franchise.title}
                                                            </Link>
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-gray-300">
                                                            {formatNumber(franchise.views)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-gray-300">
                                                            {formatNumber(franchise.reads)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-gold flex items-center justify-end gap-1.5">
                                                            {formatNumber(franchise.revenue)}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <TablePagination currentPage={tablePage} totalPages={franchiseTotalPages} onPageChange={setTablePage} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

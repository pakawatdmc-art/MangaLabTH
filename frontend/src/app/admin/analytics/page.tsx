"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { formatNumber } from "@/lib/utils";
import { getMarketingAnalytics } from "@/lib/api";
import {
    ArrowLeft,
    Eye,
    Users,
    Coins,
    Wallet,
    Loader2,
    TrendingUp,
    Flame,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    PieChart
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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
        total_users: number;
        coins_earned_30d: number;
        coins_spent_30d: number;
    };
    previous_summary: {
        total_views: number;
        total_users: number;
        coins_earned_30d: number;
        coins_spent_30d: number;
    };
    user_segments: {
        paid_users: number;
        free_users: number;
    };
    chart_data: { date: string; views: number; coins_purchased: number; coins_spent: number }[];
    top_grossing_mangas: { id: string; title: string; slug: string; cover_image: string; coins_earned: number }[];
    top_viewed_mangas: { id: string; title: string; slug: string; cover_image: string; total_views: number }[];
}

export default function MarketingDashboard() {
    const { getToken, isLoaded } = useAuth();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [timeRange, setTimeRange] = useState<number>(30); // days

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

    // ── Chart 1: Views ────────────────────────────────────────────────────────
    const viewsSeries = [{
        name: "ยอดวิว (Views)",
        data: (data?.chart_data || []).map((d) => ({ x: new Date(d.date).getTime(), y: d.views })),
    }];
    const viewsOptions: ApexCharts.ApexOptions = {
        chart: { type: "area", height: 300, background: "transparent", toolbar: { show: false }, animations: { enabled: true } },
        colors: ["#10B981"],
        fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 90, 100] } },
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 3 },
        theme: { mode: "dark" },
        xaxis: { type: "datetime", labels: { style: { colors: "#9CA3AF" }, datetimeFormatter: { day: 'dd MMM' } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { colors: "#9CA3AF" }, formatter: (value) => formatNumber(Math.floor(value)) } },
        grid: { borderColor: "rgba(255,255,255,0.05)", strokeDashArray: 4 },
        tooltip: { theme: "dark", x: { format: "dd MMM yyyy" } },
    };

    // ── Chart 2: Coins Economy ────────────────────────────────────────────────
    const coinsSeries = [
        { name: "ยอดเติมเหรียญ (Purchased)", data: (data?.chart_data || []).map((d) => ({ x: new Date(d.date).getTime(), y: d.coins_purchased })) },
        { name: "เหรียญที่ถูกใช้ปลดตอน (Spent)", data: (data?.chart_data || []).map((d) => ({ x: new Date(d.date).getTime(), y: d.coins_spent })) },
    ];
    const coinsOptions: ApexCharts.ApexOptions = {
        chart: { type: "area", height: 300, background: "transparent", toolbar: { show: false }, animations: { enabled: true } },
        colors: ["#FACC15", "#A855F7"],
        fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 90, 100] } },
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 2 },
        theme: { mode: "dark" },
        xaxis: { type: "datetime", labels: { style: { colors: "#9CA3AF" }, datetimeFormatter: { day: 'dd MMM' } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { colors: "#9CA3AF" }, formatter: (value) => formatNumber(Math.floor(value)) } },
        grid: { borderColor: "rgba(255,255,255,0.05)", strokeDashArray: 4 },
        legend: { position: 'top', horizontalAlign: 'right', offsetY: 0, labels: { colors: "#9ca3af" } },
        tooltip: { theme: "dark", x: { format: "dd MMM yyyy" } },
    };

    // ── Chart 3: User Segments (Donut) ───────────────────────────────────────
    const segmentSeries = [data?.user_segments?.paid_users || 0, data?.user_segments?.free_users || 0];
    const segmentOptions: ApexCharts.ApexOptions = {
        chart: { type: "donut", background: "transparent", animations: { enabled: true } },
        labels: ["สายเปย์ (Paid)", "สายฟรี (Free)"],
        colors: ["#FACC15", "#374151"],
        stroke: { show: false },
        dataLabels: { enabled: false },
        legend: { show: false },
        plotOptions: {
            pie: {
                donut: {
                    size: '75%',
                    labels: {
                        show: true,
                        name: { show: true, color: "#9ca3af", fontSize: "12px" },
                        value: { show: true, color: "#fff", fontSize: "24px", fontWeight: "bold", formatter: (val) => formatNumber(Number(val)) },
                        total: { show: true, showAlways: true, label: "Users ทั้งหมด", color: "#9ca3af", formatter: function (w) {
                            return formatNumber(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0));
                        }}
                    }
                }
            }
        },
        theme: { mode: "dark" }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
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
                            <TrendingUp className="h-6 w-6 text-gold" />
                            Marketing Dashboard
                        </h1>
                        <p className="text-sm text-gray-400">สถิติเชิงลึกสำหรับวิเคราะห์เติบโตและพฤติกรรมผู้ใช้งาน</p>
                    </div>
                </div>

                {/* Time range selector */}
                <div className="inline-flex rounded-lg border border-white/10 bg-surface-100 p-1">
                    {[
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
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: `ยอดวิว (${timeRange} วัน)`, value: data?.summary?.total_views || 0, prev: data?.previous_summary?.total_views || 0, icon: Eye, color: "text-blue-400", bgColor: "bg-blue-400/10" },
                            { label: `สมาชิกทั้งระบบ`, value: data?.summary?.total_users || 0, prev: data?.previous_summary?.total_users || 0, icon: Users, color: "text-purple-400", bgColor: "bg-purple-400/10" },
                            { label: `ยอดเติมเหรียญ (${timeRange} วัน)`, value: data?.summary?.coins_earned_30d || 0, prev: data?.previous_summary?.coins_earned_30d || 0, icon: Coins, color: "text-gold", bgColor: "bg-gold/10" },
                            { label: `เหรียญที่ถูกใช้ (${timeRange} วัน)`, value: data?.summary?.coins_spent_30d || 0, prev: data?.previous_summary?.coins_spent_30d || 0, icon: Wallet, color: "text-emerald-400", bgColor: "bg-emerald-400/10" },
                        ].map((card) => (
                            <div
                                key={card.label}
                                className="relative overflow-hidden rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10 transition-transform hover:scale-[1.02]"
                            >
                                <div className="absolute right-0 top-0 -mr-6 -mt-6 rounded-full blur-3xl opacity-20 w-32 h-32" style={{ backgroundColor: "currentColor", color: card.color === "text-gold" ? "#FACC15" : card.color === "text-emerald-400" ? "#10B981" : card.color === "text-blue-400" ? "#60A5FA" : "#C084FC" }} />
                                
                                <div className="flex items-start justify-between">
                                    <div className="relative">
                                        <div className="mb-2 flex items-center gap-2">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{card.label}</p>
                                        </div>
                                        <div className="flex items-baseline gap-3">
                                            <p className="text-3xl font-bold text-white drop-shadow-md">
                                                {loading ? "..." : formatNumber(card.value)}
                                            </p>
                                            {!loading && data && renderGrowthBadge(card.value, card.prev)}
                                        </div>
                                    </div>
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bgColor} ${card.color}`}>
                                        <card.icon className="h-6 w-6" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Middle Row: Trend Charts */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Views Chart */}
                        <div className="rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Eye className="h-5 w-5 text-emerald-400" />
                                        แนวโน้มยอดเข้าชม (Views)
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-1">เปรียบเทียบความสนใจในช่วงที่ผ่านมา</p>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                {!loading && data ? (
                                    <ReactApexChart options={viewsOptions} series={viewsSeries} type="area" height="100%" />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Coins Chart */}
                        <div className="rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Coins className="h-5 w-5 text-gold" />
                                        เศรษฐกิจเหรียญทอง (Coin Economy)
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-1">เปรียบเทียบยอดเติมเงิน (ทอง) และยอดซื้อตอน (ม่วง)</p>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                {!loading && data ? (
                                    <ReactApexChart options={coinsOptions} series={coinsSeries} type="area" height="100%" />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-gold" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: User Segment & Top Performers */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        
                        {/* User Segments (Pie Chart) - Takes 1 column */}
                        <div className="rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10 flex flex-col">
                            <div className="mb-6">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <PieChart className="h-5 w-5 text-blue-400" />
                                    พฤติกรรมสายเปย์ vs สายฟรี
                                </h2>
                                <p className="text-xs text-gray-400 mt-1">สัดส่วนผู้ใช้งานที่เคยเติมเงินซื้อเหรียญ</p>
                            </div>
                            
                            <div className="flex-1 flex flex-col justify-center items-center">
                                {!loading && data ? (
                                    <>
                                        <div className="w-full max-w-[250px]">
                                            <ReactApexChart options={segmentOptions} series={segmentSeries} type="donut" height={250} />
                                        </div>
                                        <div className="mt-8 flex w-full justify-between px-4">
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-2 text-sm font-medium text-white">
                                                    <div className="h-3 w-3 rounded-full bg-gold"></div>
                                                    สายเปย์
                                                </div>
                                                <span className="text-xs text-gray-400">
                                                    {formatNumber(data.user_segments.paid_users)} Users ({((data.user_segments.paid_users / Math.max(1, data.user_segments.paid_users + data.user_segments.free_users)) * 100).toFixed(0)}%)
                                                </span>
                                            </div>
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="flex items-center gap-2 text-sm font-medium text-white">
                                                    <div className="h-3 w-3 rounded-full bg-gray-600"></div>
                                                    สายฟรี
                                                </div>
                                                <span className="text-xs text-gray-400">
                                                    {formatNumber(data.user_segments.free_users)} Users
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                                )}
                            </div>
                        </div>

                        {/* Top Performers Container - Takes 2 columns */}
                        <div className="lg:col-span-2 grid grid-cols-1 gap-6 sm:grid-cols-2">
                            {/* Top Grossing Manga */}
                            <div className="rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10 flex flex-col">
                                <h2 className="mb-1 text-lg font-bold text-white flex items-center gap-2">
                                    <Flame className="h-5 w-5 text-gold" />
                                    มังงะทำเงินสูงสุด (Top Grossing)
                                </h2>
                                <p className="mb-6 text-xs text-gray-400">ช่วง {timeRange} วันล่าสุด</p>

                                <div className="space-y-4 flex-1">
                                    {loading ? (
                                        <div className="flex h-40 items-center justify-center">
                                            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                                        </div>
                                    ) : data?.top_grossing_mangas.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                            ไม่พบข้อมูลรายได้ในช่วงนี้
                                        </div>
                                    ) : (
                                        data?.top_grossing_mangas.map((manga, index) => (
                                            <Link 
                                                href={`/manga/${manga.slug}`}
                                                key={manga.id} 
                                                className="group flex items-center gap-4 rounded-xl border border-transparent p-2 transition hover:bg-surface-200/50 hover:border-white/5"
                                            >
                                                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-surface-200">
                                                    <Image src={manga.cover_image || "/placeholder.jpg"} alt={manga.title} fill className="object-cover" />
                                                    <div className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-br-lg bg-black/80 text-[10px] font-bold text-gold backdrop-blur-sm">
                                                        {index + 1}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="truncate text-sm font-semibold text-white group-hover:text-gold transition">
                                                        {manga.title}
                                                    </h3>
                                                </div>
                                                <div className="flex items-center gap-1.5 rounded-lg bg-gold/10 px-2 py-1 shrink-0 border border-gold/20">
                                                    <Coins className="h-4 w-4 text-gold" />
                                                    <span className="text-sm font-bold text-gold">{formatNumber(manga.coins_earned)}</span>
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Top Viewed Manga */}
                            <div className="rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10 flex flex-col">
                                <h2 className="mb-1 text-lg font-bold text-white flex items-center gap-2">
                                    <Eye className="h-5 w-5 text-emerald-400" />
                                    ยอดวิวสูงสุด (All Time)
                                </h2>
                                <p className="mb-6 text-xs text-gray-400">เรียงตามยอดเข้าชมรวมทั้งหมด</p>

                                <div className="space-y-4 flex-1">
                                    {loading ? (
                                        <div className="flex h-40 items-center justify-center">
                                            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                                        </div>
                                    ) : data?.top_viewed_mangas.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                            ไม่พบข้อมูลมังงะ
                                        </div>
                                    ) : (
                                        data?.top_viewed_mangas.map((manga, index) => (
                                            <Link 
                                                href={`/manga/${manga.slug}`}
                                                key={manga.id} 
                                                className="group flex items-center gap-4 rounded-xl border border-transparent p-2 transition hover:bg-surface-200/50 hover:border-white/5"
                                            >
                                                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-surface-200">
                                                    <Image src={manga.cover_image || "/placeholder.jpg"} alt={manga.title} fill className="object-cover" />
                                                    <div className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-br-lg bg-black/80 text-[10px] font-bold text-emerald-400 backdrop-blur-sm">
                                                        {index + 1}
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="truncate text-sm font-semibold text-white group-hover:text-emerald-400 transition">
                                                        {manga.title}
                                                    </h3>
                                                </div>
                                                <div className="flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-2 py-1 shrink-0 border border-emerald-400/20">
                                                    <Eye className="h-4 w-4 text-emerald-400" />
                                                    <span className="text-sm font-bold text-emerald-400">{formatNumber(manga.total_views)}</span>
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

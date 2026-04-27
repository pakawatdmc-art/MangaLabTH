"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { formatNumber } from "@/lib/utils";
import { getMarketingAnalytics, getCoinDeepdiveAnalytics } from "@/lib/api";
import {
    ArrowLeft,
    Coins,
    Wallet,
    Loader2,
    Flame,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    TrendingUp,
    Crown,
} from "lucide-react";
import Link from "next/link";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
    ssr: false,
    loading: () => (
        <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
    ),
});

// Types from API (matches GET /admin-stats/overview response)
interface BasicData {
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
    chart_data: { date: string; views: number; reads: number }[];
}

interface DeepdiveData {
    arppu: number;
    conversion_rate: number;
    package_popularity: { name: string; price_thb: number; coins: number; count: number }[];
    top_grossing_chapters: { chapter_id: string; chapter_number: number; manga_title: string; manga_slug: string; coins_earned: number }[];
    top_spenders: { user_id: string; display_name: string; total_spent: number }[];
}

export default function CoinAnalyticsDashboard() {
    const { getToken, isLoaded } = useAuth();
    const [basicData, setBasicData] = useState<BasicData | null>(null);
    const [deepData, setDeepData] = useState<DeepdiveData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [timeRange, setTimeRange] = useState<number>(7);

    useEffect(() => {
        if (!isLoaded) return;
        (async () => {
            try {
                setLoading(true);
                const token = await getToken();
                if (!token) throw new Error("No token");
                const [basicResult, deepResult] = await Promise.all([
                    getMarketingAnalytics(token, timeRange),
                    getCoinDeepdiveAnalytics(token, timeRange)
                ]);
                setBasicData(basicResult);
                setDeepData(deepResult);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Error loading analytics");
            } finally {
                setLoading(false);
            }
        })();
    }, [isLoaded, getToken, timeRange]);

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

    // ── Chart 1: Coins Economy ────────────────────────────────────────────────
    const coinsSeries = [
        { name: "ยอดเติมเหรียญ (Purchased)", data: (basicData?.chart_data || []).map((d) => ({ x: new Date(d.date).getTime(), y: d.coins_purchased })) },
        { name: "เหรียญที่ถูกเบิร์น (Coins Burned)", data: (basicData?.chart_data || []).map((d) => ({ x: new Date(d.date).getTime(), y: d.coins_spent })) },
    ];
    const coinsOptions: ApexCharts.ApexOptions = {
        chart: { type: "area", height: 350, background: "transparent", toolbar: { show: false }, animations: { enabled: true } },
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

    // ── Chart 2: Package Popularity (Bar) ──────────────────────────────────
    const packageSeries = [{
        name: "จำนวนการซื้อ (ครั้ง)",
        data: (deepData?.package_popularity || []).map(p => p.count)
    }];
    const packageOptions: ApexCharts.ApexOptions = {
        chart: { type: "bar", background: "transparent", toolbar: { show: false }, animations: { enabled: true } },
        plotOptions: { bar: { borderRadius: 4, horizontal: true, distributed: true } },
        colors: ["#60A5FA", "#34D399", "#FBBF24", "#F87171", "#A78BFA", "#F472B6"],
        dataLabels: { enabled: true, formatter: (val) => formatNumber(Number(val)), style: { colors: ["#fff"] } },
        xaxis: { categories: (deepData?.package_popularity || []).map(p => `${p.name} (${p.price_thb}฿)`), labels: { style: { colors: "#9CA3AF" } } },
        yaxis: { labels: { style: { colors: "#9CA3AF", fontWeight: 600 } } },
        grid: { borderColor: "rgba(255,255,255,0.05)", strokeDashArray: 4 },
        theme: { mode: "dark" },
        legend: { show: false },
        tooltip: { theme: "dark" }
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
                            Advanced Coin Analytics
                        </h1>
                        <p className="text-sm text-gray-400">มุมมองนักการตลาด: วิเคราะห์พฤติกรรมการเปย์ของลูกค้า</p>
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
                    {/* Key Marketing Metrics */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: `ARPPU (เหรียญเฉลี่ยต่อคน)`, value: deepData?.arppu || 0, isCoin: true, icon: Coins, color: "text-gold", bgColor: "bg-gold/10" },
                            { label: `Conversion Rate (สายเปย์)`, value: deepData?.conversion_rate || 0, isPercent: true, icon: Flame, color: "text-emerald-400", bgColor: "bg-emerald-400/10" },
                            { label: `ยอดเติมเหรียญรวม`, value: basicData?.summary?.coins_earned_30d || 0, prev: basicData?.previous_summary?.coins_earned_30d || 0, icon: TrendingUp, color: "text-blue-400", bgColor: "bg-blue-400/10" },
                            { label: `เหรียญถูกใช้ไป`, value: basicData?.summary?.coins_spent_30d || 0, prev: basicData?.previous_summary?.coins_spent_30d || 0, icon: Wallet, color: "text-purple-400", bgColor: "bg-purple-400/10" },
                        ].map((card, i) => (
                            <div
                                key={i}
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
                                                {loading ? "..." : (card.isCoin ? `${formatNumber(Math.round(card.value))} เหรียญ` : card.isPercent ? `${card.value.toFixed(1)}%` : formatNumber(card.value))}
                                            </p>
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

                    {/* Middle Row: Trend & Packages */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Coins Chart */}
                        <div className="rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Coins className="h-5 w-5 text-gold" />
                                        วงจรเศรษฐกิจ (Coin Flow)
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-1">เปรียบเทียบยอดการเติมเข้า และการถูกใช้ปลดตอน</p>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                {!loading && basicData ? (
                                    <ReactApexChart options={coinsOptions} series={coinsSeries} type="area" height="100%" />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-gold" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Package Popularity */}
                        <div className="rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <PieChart className="h-5 w-5 text-blue-400" />
                                        แพ็กเกจยอดฮิต (Package Popularity)
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-1">จำนวนครั้งที่ลูกค้าเลือกซื้อแพ็กเกจแต่ละราคา</p>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                {!loading && deepData ? (
                                    deepData.package_popularity.length > 0 ? (
                                        <ReactApexChart options={packageOptions} series={packageSeries} type="bar" height="100%" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-gray-500">ไม่มีข้อมูลการซื้อในช่วงนี้</div>
                                    )
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Top Performers & Whales */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* Top Spenders (Whales) */}
                        <div className="rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10 flex flex-col">
                            <h2 className="mb-1 text-lg font-bold text-white flex items-center gap-2">
                                <Crown className="h-5 w-5 text-gold" />
                                VIP / Top Spenders (มหาเศรษฐี)
                            </h2>
                            <p className="mb-6 text-xs text-gray-400">ลูกค้าชั้นดีที่เปย์หนักที่สุด (80/20 Rule) ในช่วง {timeRange} วัน</p>

                            <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar max-h-[350px]">
                                {loading ? (
                                    <div className="flex h-40 items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                                    </div>
                                ) : deepData?.top_spenders.length === 0 ? (
                                    <div className="flex h-40 items-center justify-center text-sm text-gray-500">
                                        ไม่พบข้อมูลการเติมเงิน
                                    </div>
                                ) : (
                                    deepData?.top_spenders.map((user, index) => (
                                        <div 
                                            key={user.user_id} 
                                            className="flex items-center gap-4 rounded-xl border border-white/5 bg-surface-100/30 p-3"
                                        >
                                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold shrink-0 ${index === 0 ? 'bg-gold/20 text-gold' : index === 1 ? 'bg-gray-300/20 text-gray-300' : index === 2 ? 'bg-orange-400/20 text-orange-400' : 'bg-surface-200 text-gray-400'}`}>
                                                #{index + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="truncate text-sm font-medium text-white">
                                                    {user.display_name}
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-1.5 rounded-lg bg-gold/10 px-2 py-1 shrink-0 border border-gold/20">
                                                <span className="text-sm font-bold text-gold">{formatNumber(user.total_spent)} เหรียญ</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

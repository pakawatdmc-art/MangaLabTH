"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { formatNumber } from "@/lib/utils";
import { getCoinDeepdiveAnalytics } from "@/lib/api";
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

// Types from API (matches GET /admin-stats/coin-deepdive response)
interface CoinDeepdiveData {
    arppu: number;
    conversion_rate: number;
    total_earned: number;
    total_burned: number;
    prev_earned: number;
    prev_burned: number;
    coin_trend: { date: string; coins_purchased: number; coins_burned: number }[];
    package_popularity: { name: string; price_thb: number; coins: number; count: number }[];
    top_grossing_chapters: { chapter_id: string; chapter_number: number; manga_title: string; manga_slug: string; coins_earned: number }[];
    top_spenders: { user_id: string; display_name: string; total_spent: number }[];
}

export default function CoinAnalyticsDashboard() {
    const { getToken, isLoaded } = useAuth();
    const [data, setData] = useState<CoinDeepdiveData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [timeRange, setTimeRange] = useState<number>(7);
    const [chaptersPage, setChaptersPage] = useState(1);
    const [spendersPage, setSpendersPage] = useState(1);

    useEffect(() => {
        if (!isLoaded) return;
        (async () => {
            try {
                setLoading(true);
                const token = await getToken();
                if (!token) throw new Error("No token");
                const result = await getCoinDeepdiveAnalytics(token, timeRange);
                setData(result);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Error loading analytics");
            } finally {
                setLoading(false);
            }
        })();
    }, [isLoaded, getToken, timeRange]);

    // Reset table pages when time range changes
    useEffect(() => { setChaptersPage(1); setSpendersPage(1); }, [timeRange]);

    const ITEMS_PER_PAGE = 10;
    const chapterItems = data?.top_grossing_chapters || [];
    const chaptersTotalPages = Math.ceil(chapterItems.length / ITEMS_PER_PAGE);
    const chaptersPageItems = chapterItems.slice((chaptersPage - 1) * ITEMS_PER_PAGE, chaptersPage * ITEMS_PER_PAGE);
    const spenderItems = data?.top_spenders || [];
    const spendersTotalPages = Math.ceil(spenderItems.length / ITEMS_PER_PAGE);
    const spendersPageItems = spenderItems.slice((spendersPage - 1) * ITEMS_PER_PAGE, spendersPage * ITEMS_PER_PAGE);

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

    // ── Chart 1: Coins Economy ────────────────────────────────────────────────
    const coinsSeries = [
        { name: "ยอดเติมเหรียญ (Purchased)", data: (data?.coin_trend || []).map((d) => ({ x: new Date(d.date).getTime(), y: d.coins_purchased })) },
        { name: "เหรียญที่ถูกเบิร์น (Coins Burned)", data: (data?.coin_trend || []).map((d) => ({ x: new Date(d.date).getTime(), y: d.coins_burned })) },
    ];
    const coinsOptions: ApexCharts.ApexOptions = {
        chart: { type: "area", height: 350, background: "transparent", toolbar: { show: false }, animations: { enabled: true } },
        colors: ["#d4a843", "#5db8a8"],
        fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05, stops: [0, 90, 100] } },
        dataLabels: { enabled: false },
        stroke: { curve: "smooth", width: 2 },
        theme: { mode: "light" },
        xaxis: { type: "datetime", labels: { style: { colors: "#6B7280" }, datetimeFormatter: { day: 'dd MMM' } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { colors: "#6B7280" }, formatter: (value) => formatNumber(Math.floor(value)) } },
        grid: { borderColor: "rgba(0,0,0,0.05)", strokeDashArray: 4 },
        legend: { position: 'top', horizontalAlign: 'right', offsetY: 0, labels: { colors: "#6B7280" } },
        tooltip: { theme: "light", x: { format: "dd MMM yyyy" } },
    };

    // ── Chart 2: Package Popularity (Bar) ──────────────────────────────────
    const packageSeries = [{
        name: "จำนวนการซื้อ (ครั้ง)",
        data: (data?.package_popularity || []).map(p => p.count)
    }];
    const packageOptions: ApexCharts.ApexOptions = {
        chart: { type: "bar", background: "transparent", toolbar: { show: false }, animations: { enabled: true } },
        plotOptions: { bar: { borderRadius: 4, horizontal: true, distributed: true } },
        colors: ["#d4a843", "#5db8a8", "#c97b5e", "#7a8db5", "#b57aa8", "#8d9b6f"],
        dataLabels: { enabled: true, formatter: (val) => formatNumber(Number(val)), style: { colors: ["#fff"] } },
        xaxis: { categories: (data?.package_popularity || []).map(p => `${p.name} (${p.price_thb}฿)`), labels: { style: { colors: "#6B7280" } } },
        yaxis: { labels: { style: { colors: "#4B5563", fontWeight: 600 } } },
        grid: { borderColor: "rgba(0,0,0,0.05)", strokeDashArray: 4 },
        theme: { mode: "light" },
        legend: { show: false },
        tooltip: { theme: "light" }
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
                            <TrendingUp className="h-6 w-6 text-gold-dark" />
                            Advanced Coin Analytics
                        </h1>
                        <p className="text-sm text-gray-500">มุมมองนักการตลาด: วิเคราะห์พฤติกรรมการเปย์ของลูกค้า</p>
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
                    {/* Key Marketing Metrics */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: `ARPPU (เหรียญเฉลี่ยต่อคน)`, value: data?.arppu || 0, isCoin: true, icon: Coins, color: "text-amber-600", bgColor: "bg-amber-50" },
                            { label: `Conversion Rate (สายเปย์)`, value: data?.conversion_rate || 0, isPercent: true, icon: Flame, color: "text-gray-600", bgColor: "bg-gray-50" },
                            { label: `ยอดเติมเหรียญรวม (${timeRange} วัน)`, value: data?.total_earned || 0, prev: data?.prev_earned || 0, icon: TrendingUp, color: "text-gray-600", bgColor: "bg-gray-50" },
                            { label: `เหรียญที่ถูกเบิร์น (${timeRange} วัน)`, value: data?.total_burned || 0, prev: data?.prev_burned || 0, icon: Wallet, color: "text-gray-600", bgColor: "bg-gray-50" },
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
                                                {loading ? <div className="h-9 w-24 animate-pulse rounded bg-gray-200 mt-1"></div> : (card.isCoin ? `${formatNumber(Math.round(card.value))} เหรียญ` : card.isPercent ? `${card.value.toFixed(1)}%` : formatNumber(card.value))}
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

                    {/* Middle Row: Trend & Packages */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Coins Chart */}
                        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-gray-900">
                                        <Coins className="h-5 w-5 text-gold-dark" />
                                        Coin Economy Trend
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-1">เปรียบเทียบยอดเติมเหรียญ vs เหรียญที่ถูกเบิร์นรายวัน ในช่วง {timeRange} วันที่ผ่านมา</p>
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

                        {/* Package Popularity */}
                        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-gray-900">
                                        <PieChart className="h-5 w-5 text-gray-400" />
                                        Package Popularity (แพ็กเกจยอดฮิต)
                                    </h2>
                                    <p className="text-xs text-gray-500 mt-1">จำนวนครั้งที่แพ็กเกจแต่ละตัวถูกซื้อในช่วง {timeRange} วันที่ผ่านมา</p>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                {!loading && data ? (
                                    data.package_popularity.length > 0 ? (
                                        <ReactApexChart options={packageOptions} series={packageSeries} type="bar" height="100%" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-gray-500">ไม่มีข้อมูลการซื้อแพ็กเกจในช่วงเวลานี้</div>
                                    )
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-gold" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Top Grossing Chapters + Top Spenders */}
                    <div className="grid grid-cols-1 gap-6">
                        {/* Top Grossing Chapters */}
                        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm flex flex-col">
                            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold tracking-tight text-gray-900">
                                <Crown className="h-5 w-5 text-gold-dark" />
                                Top Grossing Chapters (ตอนทำเงินเก่ง)
                            </h2>
                            <p className="mb-6 text-xs text-gray-500">จัดอันดับตอนที่ทำรายได้สูงสุดในช่วง {timeRange} วันที่ผ่านมา</p>

                            <div className="overflow-x-auto rounded-lg border border-gray-100">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">อันดับ</th>
                                            <th className="px-4 py-3 font-semibold">มังงะ</th>
                                            <th className="px-4 py-3 font-semibold text-center">ตอนที่</th>
                                            <th className="px-4 py-3 font-semibold text-right text-gold-dark">เหรียญที่ทำได้</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-gray-400">
                                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                                </td>
                                            </tr>
                                        ) : chapterItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-gray-400">ไม่พบข้อมูล</td>
                                            </tr>
                                        ) : (
                                            chaptersPageItems.map((ch, index) => {
                                                const rank = (chaptersPage - 1) * ITEMS_PER_PAGE + index;
                                                return (
                                                    <tr key={ch.chapter_id} className="transition-colors hover:bg-gray-50/80">
                                                        <td className="px-4 py-3">
                                                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${rank === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                #{rank + 1}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <Link href={`/manga/${ch.manga_slug}`} target="_blank" className="font-medium text-gray-900 hover:text-gold-dark transition-colors line-clamp-1">{ch.manga_title}</Link>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="inline-flex items-center rounded-md bg-gray-100 border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600">
                                                                Ch. {ch.chapter_number}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-gold-dark">
                                                            {formatNumber(ch.coins_earned)} เหรียญ
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4">
                                <TablePagination currentPage={chaptersPage} totalPages={chaptersTotalPages} onPageChange={setChaptersPage} />
                            </div>
                        </div>

                        {/* Top Spenders */}
                        <div className="rounded-xl bg-white border border-gray-200 p-6 shadow-sm flex flex-col">
                            <h2 className="mb-1 flex items-center gap-2 text-base font-semibold tracking-tight text-gray-900">
                                <Crown className="h-5 w-5 text-gold-dark" />
                                Top Spenders (ลูกค้าสายเปย์)
                            </h2>
                            <p className="mb-6 text-xs text-gray-500">จัดอันดับผู้ใช้ที่เติมเหรียญมากที่สุดในช่วง {timeRange} วันที่ผ่านมา (Whale Users)</p>

                            <div className="overflow-x-auto rounded-lg border border-gray-100">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-100 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">อันดับ</th>
                                            <th className="px-4 py-3 font-semibold">ผู้ใช้งาน</th>
                                            <th className="px-4 py-3 font-semibold text-right text-gold-dark">ยอดเติม (เหรียญ)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={3} className="py-8 text-center text-gray-400">
                                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                                </td>
                                            </tr>
                                        ) : spenderItems.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="py-8 text-center text-gray-400">ไม่พบข้อมูลการเติมเหรียญในช่วงเวลานี้</td>
                                            </tr>
                                        ) : (
                                            spendersPageItems.map((user, index) => {
                                                const rank = (spendersPage - 1) * ITEMS_PER_PAGE + index;
                                                return (
                                                    <tr key={user.user_id} className="transition-colors hover:bg-gray-50/80">
                                                        <td className="px-4 py-3">
                                                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${rank === 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                                                                #{rank + 1}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-dark text-xs font-bold text-white">
                                                                    {user.display_name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="font-medium text-gray-900">{user.display_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-gold-dark">
                                                            {formatNumber(user.total_spent)} เหรียญ
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4">
                                <TablePagination currentPage={spendersPage} totalPages={spendersTotalPages} onPageChange={setSpendersPage} />
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

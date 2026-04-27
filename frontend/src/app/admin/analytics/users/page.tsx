"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { formatNumber, formatDateTime } from "@/lib/utils";
import { getUserDeepdiveAnalytics } from "@/lib/api";
import {
    ArrowLeft,
    Users,
    Loader2,
    TrendingUp,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    PieChart,
    UserPlus,
    Wallet,
    Award
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// ApexCharts needs to be dynamically imported
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
    ssr: false,
    loading: () => (
        <div className="flex h-[300px] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
        </div>
    ),
});

interface UserAnalyticsData {
    summary: {
        total_users: number;
        new_users: number;
        active_spenders: number;
    };
    previous_summary: {
        total_users: number;
        new_users: number;
        active_spenders: number;
    };
    segments: {
        paid_users: number;
        free_users: number;
    };
    registration_trend: { date: string; new_users: number }[];
    wealth_distribution: { tier: string; count: number }[];
    top_coin_holders: {
        id: string;
        display_name: string;
        coin_balance: number;
        created_at: string;
    }[];
}

export default function UserAnalyticsDashboard() {
    const { getToken, isLoaded } = useAuth();
    const [data, setData] = useState<UserAnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [timeRange, setTimeRange] = useState<number>(7); // days

    useEffect(() => {
        if (!isLoaded) return;
        (async () => {
            try {
                setLoading(true);
                const token = await getToken();
                if (!token) throw new Error("No token");
                const result = await getUserDeepdiveAnalytics(token, timeRange);
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

    // ── Chart 1: Registration Trend (Bar Chart) ──────────────────────────────────
    const trendSeries = [
        {
            name: "ผู้ใช้สมัครใหม่ (New Signups)",
            data: (data?.registration_trend || []).map((d) => ({
                x: new Date(d.date).getTime(),
                y: d.new_users,
            })),
        }
    ];

    const trendOptions: ApexCharts.ApexOptions = {
        chart: {
            type: "bar",
            height: 350,
            background: "transparent",
            toolbar: { show: false },
            animations: { enabled: true }
        },
        colors: ["#F97316"], // Orange
        plotOptions: {
            bar: { borderRadius: 4, columnWidth: '60%' }
        },
        dataLabels: { enabled: false },
        theme: { mode: "dark" },
        xaxis: {
            type: "datetime",
            labels: { style: { colors: "#9CA3AF" }, datetimeFormatter: { day: 'dd MMM' } },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: { style: { colors: "#9CA3AF" }, formatter: (value) => formatNumber(Math.floor(value)) },
        },
        grid: { borderColor: "rgba(255,255,255,0.05)", strokeDashArray: 4 },
        tooltip: { theme: "dark", x: { format: "dd MMM yyyy" } },
    };

    // ── Chart 2: Wealth Distribution (Donut) ──────────────────────────────────
    const wealthSeries = (data?.wealth_distribution || []).map(c => c.count);
    const wealthOptions: ApexCharts.ApexOptions = {
        chart: { type: "donut", background: "transparent", animations: { enabled: true } },
        labels: (data?.wealth_distribution || []).map(c => c.tier),
        colors: ["#9CA3AF", "#60A5FA", "#FBBF24", "#F59E0B"], // Gray, Blue, Yellow, Orange
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
                        total: { show: true, showAlways: true, label: "Total Users", color: "#9CA3AF", formatter: (w) => formatNumber(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)) }
                    }
                }
            }
        },
        legend: { position: "bottom", labels: { colors: "#9CA3AF" } },
        tooltip: { theme: "dark", y: { formatter: (val) => formatNumber(val) + " คน" } },
    };

    // Calculate Paid Ratio
    const paidRatio = data?.summary.total_users && data?.segments.paid_users 
        ? (data.segments.paid_users / data.summary.total_users) * 100 
        : 0;

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
                            <Users className="h-6 w-6 text-orange-400" />
                            User Analytics Dashboard
                        </h1>
                        <p className="text-sm text-gray-400">สถิติเชิงลึกสำหรับวิเคราะห์การเติบโตของฐานผู้ใช้งานและสายเปย์</p>
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
                                label: `ผู้ใช้ทั้งหมด`,
                                value: data?.summary?.total_users || 0,
                                prev: data?.previous_summary?.total_users || 0,
                                icon: Users,
                                color: "text-blue-400",
                                bgColor: "bg-blue-400/10",
                            },
                            {
                                label: `สมัครใหม่ใน ${timeRange} วัน`,
                                value: data?.summary?.new_users || 0,
                                prev: data?.previous_summary?.new_users || 0,
                                icon: UserPlus,
                                color: "text-orange-400",
                                bgColor: "bg-orange-400/10",
                            },
                            {
                                label: `สัดส่วนคนจ่ายเงิน (Paid Ratio)`,
                                value: paidRatio,
                                prev: undefined,
                                isPercent: true,
                                icon: TrendingUp,
                                color: "text-purple-400",
                                bgColor: "bg-purple-400/10",
                            },
                            {
                                label: `Active Spenders (${timeRange} วัน)`,
                                value: data?.summary?.active_spenders || 0,
                                prev: data?.previous_summary?.active_spenders || 0,
                                icon: Wallet,
                                color: "text-emerald-400",
                                bgColor: "bg-emerald-400/10",
                            },
                        ].map((card, i) => (
                            <div
                                key={i}
                                className="relative overflow-hidden rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10 transition-transform hover:scale-[1.02]"
                            >
                                <div className="absolute right-0 top-0 -mr-6 -mt-6 rounded-full blur-3xl opacity-20 w-32 h-32" style={{ backgroundColor: "currentColor", color: card.color === "text-blue-400" ? "#60A5FA" : card.color === "text-orange-400" ? "#F97316" : card.color === "text-purple-400" ? "#C084FC" : "#10B981" }} />

                                <div className="flex items-start justify-between">
                                    <div className="relative">
                                        <div className="mb-2 flex items-center gap-2">
                                            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{card.label}</p>
                                        </div>
                                        <div className="flex items-baseline gap-3">
                                            <p className="text-3xl font-bold text-white drop-shadow-md">
                                                {loading ? "..." : card.isPercent ? `${card.value.toFixed(1)}%` : formatNumber(card.value)}
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

                    {/* Middle Row: Trend & Demographics */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Registration Trend Chart */}
                        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5 text-orange-400" />
                                        ความเร็วในการหาสมาชิกใหม่ (Registration Velocity)
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-1">จำนวนผู้สมัครใหม่รายวันในช่วง {timeRange} วันที่ผ่านมา</p>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                {!loading && data ? (
                                    <ReactApexChart options={trendOptions} series={trendSeries} type="bar" height="100%" />
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-orange-400" />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Wealth Distribution Chart */}
                        <div className="rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <PieChart className="h-5 w-5 text-yellow-400" />
                                        อำนาจการซื้อ (Wealth Distribution)
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-1">แบ่งกลุ่มผู้ใช้ตามจำนวนเหรียญที่ถือครอง (ทั้งหมด)</p>
                                </div>
                            </div>
                            <div className="h-[300px] w-full">
                                {!loading && data ? (
                                    data.wealth_distribution.length > 0 ? (
                                        <ReactApexChart options={wealthOptions} series={wealthSeries} type="donut" height="100%" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-gray-500">ไม่มีข้อมูล</div>
                                    )
                                ) : (
                                    <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                                        <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Top Coin Holders */}
                    <div className="grid grid-cols-1 gap-6">
                        <div className="rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10 flex flex-col">
                            <h2 className="mb-1 text-lg font-bold text-white flex items-center gap-2">
                                <Award className="h-5 w-5 text-gold" />
                                เศรษฐีถือเหรียญรอเปย์ (Top Coin Holders)
                            </h2>
                            <p className="mb-6 text-xs text-gray-400">กลุ่มลูกค้า VIP ที่มีกำลังซื้อสูง จัดอันดับตามเหรียญคงเหลือในกระเป๋า</p>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-surface-200/50 text-xs uppercase text-gray-400">
                                        <tr>
                                            <th className="rounded-l-lg px-4 py-3 font-semibold">อันดับ</th>
                                            <th className="px-4 py-3 font-semibold">ผู้ใช้งาน</th>
                                            <th className="px-4 py-3 font-semibold text-right">เหรียญคงเหลือ (Coins)</th>
                                            <th className="rounded-r-lg px-4 py-3 font-semibold text-right">วันที่สมัคร</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {loading ? (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-gray-500">
                                                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                                </td>
                                            </tr>
                                        ) : data?.top_coin_holders.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-8 text-center text-gray-500">ไม่พบข้อมูล</td>
                                            </tr>
                                        ) : (
                                            data?.top_coin_holders.map((user, index) => {
                                                return (
                                                    <tr key={user.id} className="transition hover:bg-white/[0.02]">
                                                        <td className="px-4 py-3">
                                                            <div className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${index === 0 ? 'bg-yellow-400/20 text-yellow-400' : index === 1 ? 'bg-gray-400/20 text-gray-300' : index === 2 ? 'bg-orange-600/20 text-orange-400' : 'bg-surface-200 text-gray-400'}`}>
                                                                #{index + 1}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-xs font-bold text-white">
                                                                    {user.display_name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="font-medium text-white">{user.display_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-bold text-gold">
                                                            {formatNumber(user.coin_balance)}
                                                        </td>
                                                        <td className="px-4 py-3 text-right text-gray-400 text-xs">
                                                            {formatDateTime(user.created_at)}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

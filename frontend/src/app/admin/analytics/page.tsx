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
    BarChart3
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// ApexCharts needs to be dynamically imported because it references window
const ReactApexChart = dynamic(() => import("react-apexcharts"), {
    ssr: false,
    loading: () => (
        <div className="flex h-80 items-center justify-center">
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

    // Area Chart Data Setup
    const series = [
        {
            name: "ยอดวิว (Views)",
            data: (data?.chart_data || []).map((d) => ({
                x: new Date(d.date).getTime(),
                y: d.views,
            })),
        },
        {
            name: "รายได้ (Coins)",
            data: (data?.chart_data || []).map((d) => ({
                x: new Date(d.date).getTime(),
                y: d.coins_purchased,
            })),
        },
    ];

    const chartOptions: ApexCharts.ApexOptions = {
        chart: {
            type: "area",
            height: 380,
            background: "transparent",
            toolbar: {
                show: false,
            },
            animations: {
                enabled: true,
            }
        },
        colors: ["#10B981", "#FACC15"], // Emerald for Views, Gold for Coins
        fill: {
            type: "gradient",
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.05,
                stops: [0, 90, 100]
            }
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            curve: "smooth",
            width: 3,
        },
        theme: {
            mode: "dark",
        },
        xaxis: {
            type: "datetime",
            labels: {
                style: {
                    colors: "#9CA3AF",
                },
                datetimeFormatter: {
                    year: 'yyyy',
                    month: 'MMM \'yy',
                    day: 'dd MMM',
                    hour: 'HH:mm'
                }
            },
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
        },
        yaxis: [
            {
                title: {
                    text: "จำนวนวิว",
                    style: { color: "#10B981" }
                },
                labels: {
                    style: { colors: "#9CA3AF" },
                    formatter: (value) => formatNumber(Math.floor(value)),
                },
            },
            {
                opposite: true,
                title: {
                    text: "จำนวนเหรียญ",
                    style: { color: "#FACC15" }
                },
                labels: {
                    style: { colors: "#9CA3AF" },
                    formatter: (value) => formatNumber(Math.floor(value)),
                },
            }
        ],
        grid: {
            borderColor: "rgba(255,255,255,0.05)",
            strokeDashArray: 4,
            xaxis: {
                lines: { show: true }
            },
            yaxis: {
                lines: { show: true }
            },
        },
        legend: {
            position: 'top',
            horizontalAlign: 'right',
            offsetY: -20
        },
        tooltip: {
            theme: "dark",
            x: {
                format: "dd MMM yyyy"
            }
        },
    };

    const SUMMARY_CARDS = [
        { label: "ยอดวิวรวมทั้งหมด", value: data?.summary.total_views || 0, icon: Eye, color: "text-blue-400", bgColor: "bg-blue-400/10" },
        { label: "สมาชิกในระบบ", value: data?.summary.total_users || 0, icon: Users, color: "text-purple-400", bgColor: "bg-purple-400/10" },
        { label: `ยอดเติมเหรียญ (${timeRange} วัน)`, value: data?.summary.coins_earned_30d || 0, icon: Coins, color: "text-gold", bgColor: "bg-gold/10" },
        { label: `เหรียญถูกใช้ (${timeRange} วัน)`, value: data?.summary.coins_spent_30d || 0, icon: Wallet, color: "text-emerald-400", bgColor: "bg-emerald-400/10" },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
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
                        {SUMMARY_CARDS.map((card) => (
                            <div
                                key={card.label}
                                className="relative overflow-hidden rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10 transition-transform hover:scale-[1.02]"
                            >
                                <div className="absolute right-0 top-0 -mr-6 -mt-6 rounded-full blur-3xl opacity-20 w-32 h-32" style={{ backgroundColor: "currentColor", color: card.color === "text-gold" ? "#FACC15" : card.color === "text-emerald-400" ? "#10B981" : card.color === "text-blue-400" ? "#60A5FA" : "#C084FC" }} />
                                
                                <div className="flex items-start justify-between">
                                    <div className="relative">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">{card.label}</p>
                                        <p className="text-3xl font-bold text-white drop-shadow-md">
                                            {loading ? "..." : formatNumber(card.value)}
                                        </p>
                                    </div>
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bgColor} ${card.color}`}>
                                        <card.icon className="h-6 w-6" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chart Section */}
                    <div className="rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10">
                        <div className="mb-2 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-gray-400" />
                                แนวโน้มคนอ่าน vs รายได้
                            </h2>
                            <span className="text-xs font-medium px-3 py-1 bg-surface-200 rounded-full border border-white/10 text-gray-400">
                                {timeRange} วันย้อนหลัง
                            </span>
                        </div>
                        <p className="mb-6 text-sm text-gray-400">
                            เปรียบเทียบความสัมพันธ์ระหว่างจำนวนการเข้าชมมังงะ และยอดเติมเงินแต่ละวัน
                        </p>
                        
                        <div className="h-[380px] w-full">
                            {!loading && data ? (
                                <ReactApexChart
                                    options={chartOptions}
                                    series={series}
                                    type="area"
                                    height="100%"
                                />
                            ) : (
                                <div className="flex h-full w-full flex-col items-center justify-center gap-3">
                                    <Loader2 className="h-8 w-8 animate-spin text-gold" />
                                    <span className="text-sm font-medium text-gray-400">กำลังประมวลผลข้อมูล...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Top Performers Section */}
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        
                        {/* Top Grossing Manga */}
                        <div className="rounded-2xl border border-white/5 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 shadow-xl ring-1 ring-white/10 flex flex-col">
                            <h2 className="mb-1 text-lg font-bold text-white flex items-center gap-2">
                                <Flame className="h-5 w-5 text-gold" />
                                มังงะทำเงินสูงสุด (Top Grossing)
                            </h2>
                            <p className="mb-6 text-xs text-gray-400">เรียงตามยอดเหรียญที่ถูกใช้ปลดล็อก</p>

                            <div className="space-y-4 flex-1">
                                {loading ? (
                                    <div className="flex h-40 items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                                    </div>
                                ) : data?.top_grossing_mangas.length === 0 ? (
                                    <div className="flex h-40 items-center justify-center text-sm text-gray-500">
                                        ไม่พบข้อมูลการปลดล็อกตอน
                                    </div>
                                ) : (
                                    data?.top_grossing_mangas.map((manga, index) => (
                                        <Link 
                                            href={`/manga/${manga.slug}`}
                                            key={manga.id} 
                                            className="group flex items-center gap-4 rounded-xl border border-transparent p-2 transition hover:bg-surface-200/50 hover:border-white/5"
                                        >
                                            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-surface-200">
                                                <Image
                                                    src={manga.cover_image || "/placeholder.jpg"}
                                                    alt={manga.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                                <div className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-br-lg bg-black/80 text-xs font-bold text-gold backdrop-blur-sm">
                                                    {index + 1}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="truncate font-semibold text-white group-hover:text-gold transition">
                                                    {manga.title}
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-1.5 rounded-lg bg-gold/10 px-3 py-1.5 shrink-0 border border-gold/20 shadow-[0_0_10px_rgba(212,168,67,0.1)]">
                                                <Coins className="h-4 w-4 text-gold" />
                                                <span className="font-bold text-gold">{formatNumber(manga.coins_earned)}</span>
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
                                มังงะยอดวิวสูงสุด (Top Viewed)
                            </h2>
                            <p className="mb-6 text-xs text-gray-400">เรียงตามยอดเข้าชมรวมทั้งหมดตลอดกาล</p>

                            <div className="space-y-4 flex-1">
                                {loading ? (
                                    <div className="flex h-40 items-center justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                                    </div>
                                ) : data?.top_viewed_mangas.length === 0 ? (
                                    <div className="flex h-40 items-center justify-center text-sm text-gray-500">
                                        ไม่พบข้อมูลมังงะ
                                    </div>
                                ) : (
                                    data?.top_viewed_mangas.map((manga, index) => (
                                        <Link 
                                            href={`/manga/${manga.slug}`}
                                            key={manga.id} 
                                            className="group flex items-center gap-4 rounded-xl border border-transparent p-2 transition hover:bg-surface-200/50 hover:border-white/5"
                                        >
                                            <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-surface-200">
                                                <Image
                                                    src={manga.cover_image || "/placeholder.jpg"}
                                                    alt={manga.title}
                                                    fill
                                                    className="object-cover"
                                                />
                                                <div className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-br-lg bg-black/80 text-xs font-bold text-emerald-400 backdrop-blur-sm">
                                                    {index + 1}
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="truncate font-semibold text-white group-hover:text-emerald-400 transition">
                                                    {manga.title}
                                                </h3>
                                            </div>
                                            <div className="flex items-center gap-1.5 rounded-lg bg-emerald-400/10 px-3 py-1.5 shrink-0 border border-emerald-400/20">
                                                <Eye className="h-4 w-4 text-emerald-400" />
                                                <span className="font-bold text-emerald-400">{formatNumber(manga.total_views)}</span>
                                            </div>
                                        </Link>
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

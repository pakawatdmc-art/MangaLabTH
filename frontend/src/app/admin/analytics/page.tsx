"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import { formatNumber } from "@/lib/utils";
import { getAnalyticsViews } from "@/lib/api";
import {
    ArrowLeft,
    Calendar,
    CalendarDays,
    CalendarRange,
    Loader2,
    TrendingUp,
} from "lucide-react";
import Link from "next/link";

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
        today: number;
        this_week: number;
        this_month: number;
        this_year: number;
        all_time: number;
    };
    chart_data: { date: string; views: number }[];
}

export default function AnalyticsDashboard() {
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
                const result = await getAnalyticsViews(token, timeRange);
                setData(result);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : "Error loading analytics");
            } finally {
                setLoading(false);
            }
        })();
    }, [isLoaded, getToken, timeRange]);

    // Construct Candlestick Data
    // Since we only track 'total views' per day (a single metric),
    // we simulate Open, High, Low, Close (OHLC) for the visual Candlestick effect.
    const series = [
        {
            name: "ยอดวิว (Candlestick)",
            data: (data?.chart_data || []).map((d) => {
                const v = d.views;
                if (v === 0) {
                    return {
                        x: new Date(d.date).getTime(),
                        y: [0, 0, 0, 0],
                    };
                }
                // Simulated OHLC for visual representation
                const open = Math.floor(v * 0.85);
                const high = Math.floor(v * 1.15);
                const low = Math.floor(v * 0.7);
                const close = v;

                return {
                    x: new Date(d.date).getTime(),
                    y: [open, high, low, close],
                };
            }),
        },
    ];

    const chartOptions: ApexCharts.ApexOptions = {
        chart: {
            type: "candlestick",
            height: 350,
            background: "transparent",
            toolbar: {
                show: false,
            },
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
            },
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
        },
        yaxis: {
            tooltip: {
                enabled: true,
            },
            labels: {
                style: {
                    colors: "#9CA3AF",
                },
                formatter: (value) => formatNumber(Math.floor(value)),
            },
        },
        grid: {
            borderColor: "rgba(255,255,255,0.05)",
            strokeDashArray: 4,
        },
        plotOptions: {
            candlestick: {
                colors: {
                    upward: "#10B981", // Emerald
                    downward: "#EF4444", // Red
                },
            },
        },
        tooltip: {
            theme: "dark",
            custom: function ({ seriesIndex, dataPointIndex, w }) {
                const o = w.globals.seriesCandleO[seriesIndex][dataPointIndex];
                const h = w.globals.seriesCandleH[seriesIndex][dataPointIndex];
                const l = w.globals.seriesCandleL[seriesIndex][dataPointIndex];
                const c = w.globals.seriesCandleC[seriesIndex][dataPointIndex];
                const date = new Date(w.globals.seriesX[seriesIndex][dataPointIndex]).toLocaleDateString("th-TH");

                return (
                    '<div class="px-3 py-2 bg-surface-200 border border-white/10 rounded-lg shadow-xl">' +
                    '<div class="text-xs text-gray-400 mb-1">' + date + '</div>' +
                    '<div class="text-sm font-bold text-emerald-400">ปิดยอด (Close): ' + formatNumber(c) + ' ครั้ง</div>' +
                    '<div class="text-xs text-gray-300 mt-1">สูงสุด (High): ' + formatNumber(h) + '</div>' +
                    '<div class="text-xs text-gray-300">เริ่มวัน (Open): ' + formatNumber(o) + '</div>' +
                    '<div class="text-xs text-gray-300">ต่ำสุด (Low): ' + formatNumber(l) + '</div>' +
                    '</div>'
                );
            }
        },
    };

    const SUMMARY_CARDS = [
        { label: "วันนี้", value: data?.summary.today || 0, icon: TrendingUp, color: "text-emerald-400" },
        { label: "สัปดาห์นี้", value: data?.summary.this_week || 0, icon: CalendarDays, color: "text-blue-400" },
        { label: "เดือนนี้", value: data?.summary.this_month || 0, icon: Calendar, color: "text-purple-400" },
        { label: "ปีนี้", value: data?.summary.this_year || 0, icon: CalendarRange, color: "text-gold" },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href="/admin"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-surface-100 text-gray-400 transition hover:bg-surface-200 hover:text-white"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-white">สถิติยอดเข้าชม (Analytics)</h1>
                        <p className="text-sm text-gray-400">ภาพรวมการเติบโตและยอดคนอ่านมังงะ</p>
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
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {SUMMARY_CARDS.map((card) => (
                            <div
                                key={card.label}
                                className="relative overflow-hidden rounded-xl border border-white/10 bg-surface-100/80 p-5 ring-1 ring-white/5"
                            >
                                <div className="absolute right-0 top-0 -mr-4 -mt-4 opacity-10">
                                    <card.icon className={`h-24 w-24 ${card.color}`} />
                                </div>
                                <div className="relative">
                                    <p className="mb-1 text-sm text-gray-400">{card.label}</p>
                                    <p className="text-3xl font-bold text-white">
                                        {loading ? "..." : formatNumber(card.value)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Chart Section */}
                    <div className="rounded-2xl border border-white/10 bg-surface-100/80 p-5 ring-1 ring-white/5 sm:p-6">
                        <h2 className="mb-4 text-lg font-semibold text-white">ยอดวิวรายวัน (กราฟแท่งเทียน)</h2>
                        <div className="h-[350px] w-full">
                            {!loading && data ? (
                                <ReactApexChart
                                    options={chartOptions}
                                    series={series}
                                    type="candlestick"
                                    height="100%"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <Loader2 className="h-8 w-8 animate-spin text-gold" />
                                </div>
                            )}
                        </div>
                        <p className="mt-4 text-center text-xs text-gray-500">
                            * ข้อมูล Open/High/Low/Close เป็นข้อมูลจำลองจากยอดวิวสะสมรายวันเพื่อให้เห็นภาพเป็นแท่งเทียน
                        </p>
                    </div>
                </>
            )}
        </div>
    );
}

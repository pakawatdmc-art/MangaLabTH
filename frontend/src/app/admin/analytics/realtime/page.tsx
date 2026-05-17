"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Loader2,
  Radio,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  Eye,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { AnalyticsNav } from "../AnalyticsNav";
import { getRealtimeActive, type RealtimeActiveData } from "@/lib/api";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[200px] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gold" />
    </div>
  ),
});

const REFRESH_INTERVAL = 5_000; // 5 seconds

function DeviceIcon({ type }: { type: string }) {
  switch (type) {
    case "mobile":
      return <Smartphone className="h-4 w-4" />;
    case "tablet":
      return <Tablet className="h-4 w-4" />;
    case "desktop":
      return <Monitor className="h-4 w-4" />;
    default:
      return <Globe className="h-4 w-4" />;
  }
}

function formatPageName(page: string): string {
  if (page === "/") return "🏠 หน้าแรก (Home)";
  if (page === "/sign-in") return "🔑 เข้าสู่ระบบ";
  if (page === "/sign-up") return "📝 สมัครสมาชิก";
  if (page === "/coins") return "🪙 ซื้อเหรียญ";
  if (page.startsWith("/manga/")) {
    const slug = page.replace("/manga/", "").split("/")[0];
    return `📖 ${slug}`;
  }
  if (page.startsWith("/admin")) return `⚙️ Admin ${page.replace("/admin", "")}`;
  return page;
}

export default function RealtimeDashboard() {
  const { getToken } = useAuth();
  const [data, setData] = useState<RealtimeActiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const result = await getRealtimeActive(token);
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError("ไม่สามารถโหลดข้อมูลได้");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Device chart ──────────────────────────────────────────────
  const deviceSeries = data ? Object.values(data.devices) : [];
  const deviceLabels = data
    ? Object.keys(data.devices).map((d) =>
        d === "desktop" ? "Desktop" : d === "mobile" ? "Mobile" : d === "tablet" ? "Tablet" : d
      )
    : [];

  const deviceOptions: ApexCharts.ApexOptions = {
    chart: { type: "donut", background: "transparent" },
    labels: deviceLabels,
    colors: ["#3B82F6", "#10B981", "#F59E0B", "#8B5CF6"],
    stroke: { show: true, colors: ["#0a0a0a"], width: 2 },
    theme: { mode: "dark" },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            name: { show: true, color: "#9ca3af" },
            value: { show: true, color: "#f8fafc", fontSize: "20px", fontWeight: 700 },
            total: {
              show: true,
              showAlways: true,
              label: "อุปกรณ์",
              color: "#9ca3af",
              formatter: (w) =>
                String(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)),
            },
          },
        },
      },
    },
    legend: { position: "bottom", labels: { colors: "#9ca3af" } },
    tooltip: { theme: "dark" },
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <AnalyticsNav />

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/analytics"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-700 bg-ink-800 text-ink-400 transition hover:bg-ink-700 hover:text-ink-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-ink-50">
              <Radio className="h-6 w-6 text-emerald-500" />
              Real-time Dashboard
            </h1>
            <p className="text-sm text-ink-400">
              ดูจำนวนผู้ใช้งานที่กำลังออนไลน์อยู่แบบเรียลไทม์
            </p>
          </div>
        </div>

        {/* Last updated indicator */}
        <div className="flex items-center gap-2 text-sm text-ink-500">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: "3s" }} />
          {lastUpdated && (
            <span>อัปเดตล่าสุด: {lastUpdated.toLocaleTimeString("th-TH")}</span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900 bg-red-500/10 p-4 text-center text-red-400">
          {error}
        </div>
      )}

      {/* ── Hero: Active Users ──────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-900/50 bg-gradient-to-br from-emerald-950 via-ink-900 to-teal-950 p-8 shadow-sm">
        <div className="absolute right-6 top-6 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10">
          <Radio className="h-6 w-6 text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-emerald-400 uppercase tracking-wider">
          ผู้ใช้งานออนไลน์ตอนนี้
        </p>
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-6xl font-bold text-ink-50">
            {data?.active_users ?? 0}
          </span>
          <span className="text-lg text-ink-400">คน</span>
          {/* Pulse indicator */}
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
        </div>
        <p className="mt-2 text-xs text-ink-500">
          นับจาก sessions ที่มี heartbeat ภายใน 90 วินาทีล่าสุด
        </p>
      </div>

      {/* ── Charts Row ─────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Pages */}
        <div className="rounded-2xl bg-ink-800 border border-ink-700/50 p-6 shadow-lg shadow-black/20 ring-1 ring-white/5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-50">
            <Eye className="h-5 w-5 text-blue-500" />
            หน้าที่มีผู้ชมอยู่ตอนนี้
          </h2>
          <p className="text-sm text-ink-400 mb-5">หน้าเว็บที่ผู้ใช้กำลังเปิดอยู่ในขณะนี้</p>

          {data?.pages && data.pages.length > 0 ? (
            <div className="space-y-3">
              {data.pages.map((p, i) => {
                const maxCount = data.pages[0].count;
                const pct = maxCount > 0 ? (p.count / maxCount) * 100 : 0;
                return (
                  <div key={i} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-ink-300 truncate max-w-[70%]">
                        {formatPageName(p.page)}
                      </span>
                      <span className="text-sm font-bold text-blue-400">
                        {p.count} คน
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-ink-950 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-ink-500">
              <p>ยังไม่มีผู้ใช้งานออนไลน์</p>
            </div>
          )}
        </div>

        {/* Device Breakdown */}
        <div className="rounded-2xl bg-ink-800 border border-ink-700/50 p-6 shadow-lg shadow-black/20 ring-1 ring-white/5">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-50">
            <Monitor className="h-5 w-5 text-violet-500" />
            อุปกรณ์ที่ใช้งาน
          </h2>
          <p className="text-sm text-ink-400 mb-4">สัดส่วนประเภทอุปกรณ์ของผู้เข้าชม</p>

          {deviceSeries.length > 0 ? (
            <ReactApexChart
              type="donut"
              height={260}
              series={deviceSeries}
              options={deviceOptions}
            />
          ) : (
            <div className="flex h-[260px] items-center justify-center text-ink-500">
              <p>ยังไม่มีข้อมูล</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Live Sessions Table ─────────────────────────────── */}
      <div className="rounded-2xl border border-ink-700/50 bg-ink-800 shadow-lg shadow-black/20 ring-1 ring-white/5 overflow-hidden">
        <div className="border-b border-ink-800 p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-ink-50">
            <Clock className="h-5 w-5 text-amber-500" />
            รายการ Sessions ที่ออนไลน์
          </h2>
          <p className="text-sm text-ink-400">
            รายละเอียดของผู้ใช้แต่ละคนที่กำลังใช้งานอยู่
          </p>
        </div>

        {data?.sessions && data.sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-700/50 bg-ink-800">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
                    Session
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
                    หน้าที่ดูอยู่
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
                    อุปกรณ์
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
                    ระยะเวลา
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-500">
                    สถานะ
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-800/50">
                {data.sessions.map((s, i) => (
                  <tr
                    key={i}
                    className="transition-colors hover:bg-ink-800/50"
                  >
                    <td className="whitespace-nowrap px-6 py-3.5 font-mono text-xs text-ink-500">
                      {s.session_id}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="text-sm font-medium text-ink-300">
                        {formatPageName(s.current_page)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <div className="flex items-center gap-2 text-ink-400">
                        <DeviceIcon type={s.device.type} />
                        <span className="text-xs">
                          {s.device.browser} · {s.device.os}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 text-sm text-ink-400">
                      {s.duration}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        ออนไลน์
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex h-[200px] items-center justify-center text-ink-500">
            <p>ยังไม่มี sessions ออนไลน์</p>
          </div>
        )}
      </div>
    </div>
  );
}

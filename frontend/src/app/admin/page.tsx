"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { formatNumber } from "@/lib/utils";
import { getStats } from "@/lib/api";
import {
  ArrowUpRight,
  BookOpen,
  Coins,
  Eye,
  Layers,
  Loader2,
  Sparkles,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  total_manga: number;
  total_chapters: number;
  total_users: number;
  total_coins_in_circulation: number;
  total_views: number;
}

export default function AdminDashboard() {
  const { getToken, isLoaded } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    (async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("No token");
        const data = await getStats(token);
        setStats(data);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading stats");
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, getToken]);

  const STATS = [
    {
      label: "มังงะทั้งหมด",
      value: stats ? formatNumber(stats.total_manga) : "—",
      icon: BookOpen,
      href: "/admin/analytics/mangas",
    },
    {
      label: "ตอนทั้งหมด",
      value: stats ? formatNumber(stats.total_chapters) : "—",
      icon: Layers,
      href: "/admin/analytics/chapters",
    },
    {
      label: "ผู้ใช้งาน",
      value: stats ? formatNumber(stats.total_users) : "—",
      icon: Users,
      href: "/admin/analytics/users",
    },
    {
      label: "เหรียญคงเหลือในระบบ",
      value: stats ? formatNumber(stats.total_coins_in_circulation) : "—",
      icon: Coins,
      href: "/admin/analytics/coins",
      accent: true,
    },
    {
      label: "ยอดเข้าชม",
      value: stats ? formatNumber(stats.total_views) : "—",
      icon: Eye,
      href: "/admin/analytics",
    },
  ];

  const QUICK_ACTIONS = [
    {
      href: "/admin/manga",
      title: "เพิ่มมังงะใหม่",
      desc: "สร้างเรื่องใหม่พร้อมข้อมูลเมตาและรูปปก",
      icon: BookOpen,
    },
    {
      href: "/admin/chapters",
      title: "จัดการตอน",
      desc: "แก้ไขข้อมูลตอน และไปหน้าจัดการภาพได้ทันที",
      icon: Layers,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-xl bg-ink-800 border border-ink-700/50 shadow-sm p-6 sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.06),transparent_55%)]" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">Dashboard</span>
            <h1 className="text-2xl font-semibold tracking-tight text-ink-50 sm:text-3xl">แดชบอร์ดผู้ดูแลระบบ</h1>
            <p className="max-w-2xl text-balance text-sm text-ink-300">ควบคุมและติดตามความเคลื่อนไหวทั้งหมดของ MangaLabTH ได้ในที่เดียว</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-md bg-gold/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-dark">
            <Sparkles className="h-3.5 w-3.5" />
            Control Center
          </div>
        </div>
      </section>

      {loading && (
        <div className="flex items-center gap-3 justify-center py-12 text-ink-400">
          <Loader2 className="h-5 w-5 animate-spin text-gold" />
          กำลังเรียกข้อมูลสถิติ…
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400 flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {STATS.map((stat) => {
          const content = (
            <div className="relative h-full space-y-4">
              <div className="flex items-center justify-between">
                <div className={cn(
                  "rounded-md p-2 transition-colors",
                  stat.accent ? "bg-gold/10 text-gold-dark" : "bg-ink-800 text-ink-300"
                )}>
                  <stat.icon className="h-5 w-5" />
                </div>
                {stat.href && <ArrowUpRight className="h-4 w-4 text-ink-500 transition-colors group-hover:text-ink-100" />}
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-semibold tracking-tight text-ink-50">{stat.value}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">{stat.label}</p>
              </div>
            </div>
          );

          if (stat.href) {
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className="group relative overflow-hidden rounded-xl border border-ink-700/50 bg-ink-800 p-5 shadow-sm transition-all duration-200 hover:border-ink-700 hover:shadow-md"
              >
                {content}
              </Link>
            );
          }

          return (
            <div
              key={stat.label}
              className="relative overflow-hidden rounded-xl border border-ink-700/50 bg-ink-800 p-5 shadow-sm"
            >
              {content}
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <section className="space-y-5">
        <div className="flex flex-col gap-1 px-1">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">Quick Actions</span>
          <h2 className="text-lg font-semibold tracking-tight text-ink-50">งานด่วนที่ใช้บ่อย</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {QUICK_ACTIONS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex flex-col items-start justify-between rounded-xl border border-ink-700/50 bg-ink-800 p-6 shadow-sm transition-all duration-200 hover:border-ink-700 hover:shadow-md"
            >
              <div className="flex w-full items-start justify-between">
                <div className="rounded-lg bg-ink-800 p-3 transition-colors duration-200 group-hover:bg-ink-800/80">
                  <item.icon className="h-6 w-6 text-ink-300 transition-colors group-hover:text-gold-dark" />
                </div>
                <div className="rounded-full bg-ink-800 p-1.5 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100 -translate-x-2">
                  <ArrowUpRight className="h-4 w-4 text-ink-300" />
                </div>
              </div>

              <div className="mt-8 space-y-1.5">
                <h3 className="text-lg font-semibold tracking-tight text-ink-50">{item.title}</h3>
                <p className="max-w-[90%] text-sm leading-relaxed text-ink-400">{item.desc}</p>
              </div>

              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-ink-100 group-hover:text-gold-dark transition-colors">
                เริ่มดำเนินการ
                <div className="h-px w-8 bg-ink-800 group-hover:bg-gold transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

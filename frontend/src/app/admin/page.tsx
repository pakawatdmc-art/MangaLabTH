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
      color: "text-blue-400",
      glow: "group-hover:shadow-blue-500/20",
    },
    {
      label: "ตอนทั้งหมด",
      value: stats ? formatNumber(stats.total_chapters) : "—",
      icon: Layers,
      color: "text-emerald-400",
      glow: "group-hover:shadow-emerald-500/20",
    },
    {
      label: "ผู้ใช้งาน",
      value: stats ? formatNumber(stats.total_users) : "—",
      icon: Users,
      color: "text-purple-400",
      glow: "group-hover:shadow-purple-500/20",
    },
    {
      label: "เหรียญหมุนเวียน",
      value: stats ? formatNumber(stats.total_coins_in_circulation) : "—",
      icon: Coins,
      color: "text-gold",
      glow: "group-hover:shadow-gold/20",
    },
    {
      label: "ยอดเข้าชม",
      value: stats ? formatNumber(stats.total_views) : "—",
      icon: Eye,
      color: "text-pink-400",
      href: "/admin/analytics",
      glow: "group-hover:shadow-pink-500/20",
    },
  ];

  const QUICK_ACTIONS = [
    {
      href: "/admin/manga",
      title: "เพิ่มมังงะใหม่",
      desc: "สร้างเรื่องใหม่พร้อมข้อมูลเมตาและรูปปก",
      icon: BookOpen,
      bg: "bg-blue-500/5",
      border: "hover:border-blue-500/40",
      iconColor: "text-blue-400",
      iconBg: "bg-blue-500/10",
    },
    {
      href: "/admin/chapters",
      title: "จัดการตอน",
      desc: "แก้ไขข้อมูลตอน และไปหน้าจัดการภาพได้ทันที",
      icon: Layers,
      bg: "bg-emerald-500/5",
      border: "hover:border-emerald-500/40",
      iconColor: "text-emerald-400",
      iconBg: "bg-emerald-500/10",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#1b2031] via-[#121523] to-[#0b0d1a] p-6 sm:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.15),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_50%)]" />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/5 blur-[100px]" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">แดชบอร์ดผู้ดูแลระบบ</h1>
            <p className="max-w-2xl text-balance text-gray-400">ควบคุมและติดตามความเคลื่อนไหวทั้งหมดของ MangaLabTH ได้ในที่เดียว</p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-2xl border border-gold/30 bg-gold/5 px-4 py-2 text-sm font-medium text-gold backdrop-blur-md">
            <Sparkles className="h-4 w-4" />
            Control Center Active
          </div>
        </div>
      </section>

      {loading && (
        <div className="flex items-center gap-3 justify-center py-12 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
          กำลังเรียกข้อมูลสถิติ...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-4 text-sm text-red-300 backdrop-blur-md flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {STATS.map((stat) => {
          const content = (
            <div className="relative h-full space-y-3">
              <div className="flex items-center justify-between">
                <div className={cn("rounded-lg bg-white/5 p-2 transition-colors", stat.glow.replace("group-hover:", ""))}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                {stat.href && <ArrowUpRight className="h-4 w-4 text-white/20 transition-colors group-hover:text-white/60" />}
              </div>
              <div className="space-y-0.5">
                <p className="text-3xl font-bold tracking-tight text-white">{stat.value}</p>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{stat.label}</p>
              </div>
            </div>
          );

          if (stat.href) {
            return (
              <Link
                key={stat.label}
                href={stat.href}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-white/10 bg-surface-100/40 p-5 transition-all hover:-translate-y-1 hover:border-white/20 hover:bg-surface-100/60",
                  stat.glow
                )}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                {content}
              </Link>
            );
          }

          return (
            <div
              key={stat.label}
              className="relative overflow-hidden rounded-2xl border border-white/5 bg-surface-100/20 p-5"
            >
              {content}
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="h-1.5 w-1.5 rounded-full bg-gold" />
          <h2 className="text-lg font-bold text-white tracking-tight">งานด่วนที่ใช้บ่อย</h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {QUICK_ACTIONS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex flex-col items-start justify-between rounded-[1.5rem] border border-white/5 p-6 transition-all duration-300",
                item.bg,
                item.border,
                "hover:bg-surface-100/40 hover:shadow-2xl hover:shadow-black/20"
              )}
            >
              <div className="flex w-full items-start justify-between">
                <div className={cn("rounded-2xl p-4 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3", item.iconBg)}>
                  <item.icon className={cn("h-8 w-8", item.iconColor)} />
                </div>
                <div className="rounded-full bg-white/5 p-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100 -translate-x-2">
                  <ArrowUpRight className="h-5 w-5 text-white/50" />
                </div>
              </div>

              <div className="mt-8 space-y-1">
                <h3 className="text-xl font-bold text-white">{item.title}</h3>
                <p className="max-w-[80%] text-sm leading-relaxed text-gray-400">{item.desc}</p>
              </div>

              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-white group-hover:text-gold transition-colors">
                เริ่มดำเนินการ
                <div className="h-px w-8 bg-white/20 group-hover:bg-gold/50 transition-all" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

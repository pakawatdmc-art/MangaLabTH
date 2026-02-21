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
    },
    {
      label: "ตอนทั้งหมด",
      value: stats ? formatNumber(stats.total_chapters) : "—",
      icon: Layers,
      color: "text-emerald-400",
    },
    {
      label: "ผู้ใช้งาน",
      value: stats ? formatNumber(stats.total_users) : "—",
      icon: Users,
      color: "text-purple-400",
    },
    {
      label: "เหรียญหมุนเวียน",
      value: stats ? formatNumber(stats.total_coins_in_circulation) : "—",
      icon: Coins,
      color: "text-gold",
    },
    {
      label: "ยอดเข้าชม",
      value: stats ? formatNumber(stats.total_views) : "—",
      icon: Eye,
      color: "text-pink-400",
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
    {
      href: "/admin/upload",
      title: "อัปโหลดภาพตอน",
      desc: "อัปโหลดเป็นชุดใหญ่แล้วบันทึกครั้งเดียวไปยัง R2",
      icon: Coins,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#1b2031_0%,#121523_45%,#101726_100%)] p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.18),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.16),transparent_48%)]" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white">แดชบอร์ดผู้ดูแลระบบ</h1>
          <p className="mt-1 text-sm text-gray-300">ภาพรวมระบบ mangaFactory และทางลัดการจัดการหลัก</p>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-gold">
            <Sparkles className="h-3.5 w-3.5" />
            ทุกฟีเจอร์พร้อมใช้งานในแผงเดียว
          </div>
        </div>
      </section>

      {loading && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/10 bg-surface-100/80 p-4 ring-1 ring-white/5"
          >
            <stat.icon className={`mb-2 h-5 w-5 ${stat.color}`} />
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <section className="rounded-2xl border border-white/10 bg-surface-100/80 p-5 ring-1 ring-white/5">
        <h2 className="mb-3 text-base font-semibold text-white">งานด่วนที่ใช้บ่อย</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {QUICK_ACTIONS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-xl border border-white/10 bg-surface-200/40 p-4 transition hover:border-gold/35 hover:bg-surface-200"
            >
              <item.icon className="mb-2 h-5 w-5 text-gold" />
              <p className="text-sm font-medium text-white">{item.title}</p>
              <p className="mt-1 text-xs text-gray-400">{item.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-gold opacity-0 transition group-hover:opacity-100">
                ไปที่หน้านี้
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

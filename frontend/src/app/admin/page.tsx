"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { formatNumber } from "@/lib/utils";
import {
  BookOpen,
  Coins,
  Eye,
  Layers,
  Loader2,
  Users,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

interface Stats {
  manga_count: number;
  chapter_count: number;
  user_count: number;
  total_coins: number;
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
        const res = await fetch(`${API}/users/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load stats");
        setStats(await res.json());
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
      value: stats ? formatNumber(stats.manga_count) : "—",
      icon: BookOpen,
      color: "text-blue-400",
    },
    {
      label: "ตอนทั้งหมด",
      value: stats ? formatNumber(stats.chapter_count) : "—",
      icon: Layers,
      color: "text-emerald-400",
    },
    {
      label: "ผู้ใช้งาน",
      value: stats ? formatNumber(stats.user_count) : "—",
      icon: Users,
      color: "text-purple-400",
    },
    {
      label: "เหรียญหมุนเวียน",
      value: stats ? formatNumber(stats.total_coins) : "—",
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">แดชบอร์ด</h1>
        <p className="text-sm text-gray-500">ภาพรวมระบบ mangaFactory</p>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl bg-surface-100 p-4 ring-1 ring-white/5"
          >
            <stat.icon className={`mb-2 h-5 w-5 ${stat.color}`} />
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-white">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <a
            href="/admin/manga"
            className="rounded-xl bg-surface-100 p-4 ring-1 ring-white/5 transition hover:ring-gold/20"
          >
            <BookOpen className="mb-2 h-5 w-5 text-gold" />
            <p className="text-sm font-medium text-white">เพิ่มมังงะใหม่</p>
            <p className="text-xs text-gray-500">สร้างเรื่องใหม่พร้อมข้อมูลเมตา</p>
          </a>
          <a
            href="/admin/upload"
            className="rounded-xl bg-surface-100 p-4 ring-1 ring-white/5 transition hover:ring-gold/20"
          >
            <Layers className="mb-2 h-5 w-5 text-gold" />
            <p className="text-sm font-medium text-white">อัปโหลดตอนใหม่</p>
            <p className="text-xs text-gray-500">
              อัปโหลดรูปภาพแบบ Batch ไปยัง R2
            </p>
          </a>
          <a
            href="/admin/transactions"
            className="rounded-xl bg-surface-100 p-4 ring-1 ring-white/5 transition hover:ring-gold/20"
          >
            <Coins className="mb-2 h-5 w-5 text-gold" />
            <p className="text-sm font-medium text-white">ตรวจสอบรายการ</p>
            <p className="text-xs text-gray-500">
              ดูประวัติการเติมเหรียญและปลดล็อก
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}

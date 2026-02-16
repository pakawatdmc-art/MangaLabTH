"use client";

import { BookOpen, Coins, Eye, Layers, TrendingUp, Users } from "lucide-react";

const STATS = [
  { label: "มังงะทั้งหมด", value: "—", icon: BookOpen, color: "text-blue-400" },
  { label: "ตอนทั้งหมด", value: "—", icon: Layers, color: "text-emerald-400" },
  { label: "ผู้ใช้งาน", value: "—", icon: Users, color: "text-purple-400" },
  { label: "เหรียญหมุนเวียน", value: "—", icon: Coins, color: "text-gold" },
  { label: "ยอดเข้าชม", value: "—", icon: Eye, color: "text-pink-400" },
  { label: "รายได้เดือนนี้", value: "—", icon: TrendingUp, color: "text-green-400" },
];

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">แดชบอร์ด</h1>
        <p className="text-sm text-gray-500">ภาพรวมระบบ mangaFactory</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
            <p className="text-xs text-gray-500">อัปโหลดรูปภาพแบบ Batch ไปยัง R2</p>
          </a>
          <a
            href="/admin/transactions"
            className="rounded-xl bg-surface-100 p-4 ring-1 ring-white/5 transition hover:ring-gold/20"
          >
            <Coins className="mb-2 h-5 w-5 text-gold" />
            <p className="text-sm font-medium text-white">ตรวจสอบรายการ</p>
            <p className="text-xs text-gray-500">ดูประวัติการเติมเหรียญและปลดล็อก</p>
          </a>
        </div>
      </div>
    </div>
  );
}

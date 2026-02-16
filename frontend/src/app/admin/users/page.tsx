"use client";

import { useState } from "react";
import { Coins, Shield, Users } from "lucide-react";
import type { User } from "@/lib/types";

export default function AdminUsersPage() {
  const [users] = useState<User[]>([]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          <Users className="mr-2 inline-block h-6 w-6 text-gold" />
          ผู้ใช้งาน
        </h1>
        <p className="text-sm text-gray-500">จัดการบัญชีผู้ใช้และยอดเหรียญ</p>
      </div>

      <div className="overflow-x-auto rounded-xl bg-surface-100 ring-1 ring-white/5">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs text-gray-500">
              <th className="px-4 py-3">อีเมล</th>
              <th className="px-4 py-3">ชื่อ</th>
              <th className="px-4 py-3">สิทธิ์</th>
              <th className="px-4 py-3">เหรียญ</th>
              <th className="px-4 py-3">วันที่สมัคร</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-600">
                  ยังไม่มีข้อมูลผู้ใช้
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-2 text-white">{u.email}</td>
                  <td className="px-4 py-2 text-gray-400">
                    {u.display_name || "—"}
                  </td>
                  <td className="px-4 py-2">
                    {u.role === "admin" ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold">
                        <Shield className="h-3 w-3" />
                        Admin
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Reader</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center gap-1 text-gold">
                      <Coins className="h-3 w-3" />
                      {u.coin_balance}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {new Date(u.created_at).toLocaleDateString("th-TH")}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button className="rounded bg-gold/10 px-2 py-1 text-xs text-gold transition hover:bg-gold/20">
                      เติมเหรียญ
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

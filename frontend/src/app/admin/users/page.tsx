"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Coins, Loader2, Shield, Users } from "lucide-react";
import type { User } from "@/lib/types";
import { listUsers, adminGrantCoins, updateUser } from "@/lib/api";

export default function AdminUsersPage() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Grant coins modal
  const [grantTarget, setGrantTarget] = useState<User | null>(null);
  const [grantAmount, setGrantAmount] = useState(0);
  const [grantNote, setGrantNote] = useState("");
  const [granting, setGranting] = useState(false);

  const fetchUsers = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const data = await listUsers(token);
      setUsers(data);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลผู้ใช้ล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGrant = async () => {
    if (!grantTarget || grantAmount <= 0) return;
    setGranting(true);
    try {
      const token = await getToken();
      if (!token) return;
      await adminGrantCoins(grantTarget.id, grantAmount, grantNote || "Admin grant", token);
      setGrantTarget(null);
      setGrantAmount(0);
      setGrantNote("");
      await fetchUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "เติมเหรียญล้มเหลว");
    } finally {
      setGranting(false);
    }
  };

  const handleToggleRole = async (user: User) => {
    const newRole = user.role === "admin" ? "reader" : "admin";
    if (!confirm(`เปลี่ยนสิทธิ์ ${user.email || user.clerk_id} เป็น ${newRole}?`)) return;
    try {
      const token = await getToken();
      if (!token) return;
      await updateUser(user.id, { role: newRole }, token);
      await fetchUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "เปลี่ยนสิทธิ์ล้มเหลว");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          <Users className="mr-2 inline-block h-6 w-6 text-gold" />
          ผู้ใช้งาน
        </h1>
        <p className="text-sm text-gray-500">
          จัดการบัญชีผู้ใช้และยอดเหรียญ — {users.length} คน
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Grant coins modal */}
      {grantTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-2xl bg-surface-100 p-6 ring-1 ring-white/10">
            <h3 className="mb-4 text-lg font-bold text-white">
              <Coins className="mr-2 inline-block h-5 w-5 text-gold" />
              เติมเหรียญ
            </h3>
            <p className="mb-3 text-sm text-gray-400">
              ให้ {grantTarget.email || grantTarget.clerk_id}
            </p>
            <input
              type="number"
              min={1}
              value={grantAmount || ""}
              onChange={(e) => setGrantAmount(Number(e.target.value))}
              placeholder="จำนวนเหรียญ"
              className="mb-3 h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
            />
            <input
              type="text"
              value={grantNote}
              onChange={(e) => setGrantNote(e.target.value)}
              placeholder="หมายเหตุ (ไม่บังคับ)"
              className="mb-4 h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handleGrant}
                disabled={granting || grantAmount <= 0}
                className="flex-1 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-gold-light disabled:opacity-50"
              >
                {granting ? "กำลังเติม..." : "เติมเหรียญ"}
              </button>
              <button
                onClick={() => setGrantTarget(null)}
                className="rounded-lg bg-surface-200 px-4 py-2 text-sm text-gray-300 transition hover:bg-surface-50"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl bg-surface-100 ring-1 ring-white/5">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs text-gray-500">
              <th className="px-4 py-3">ชื่อผู้ใช้ / อีเมล</th>
              <th className="px-4 py-3">ชื่อเล่น</th>
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
                  <td className="px-4 py-2 text-white">
                    <div className="font-medium">{u.display_name || u.email || "—"}</div>
                    <div className="text-xs text-gray-500">{u.clerk_id}</div>
                  </td>
                  <td className="px-4 py-2 text-gray-400">
                    {u.display_name === u.email ? "—" : u.email}
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
                    <button
                      onClick={() => setGrantTarget(u)}
                      className="mr-2 rounded bg-gold/10 px-2 py-1 text-xs text-gold transition hover:bg-gold/20"
                    >
                      เติมเหรียญ
                    </button>
                    <button
                      onClick={() => handleToggleRole(u)}
                      className="rounded bg-surface-200 px-2 py-1 text-xs text-gray-400 transition hover:text-white"
                    >
                      {u.role === "admin" ? "ลดสิทธิ์" : "เลื่อนเป็น Admin"}
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

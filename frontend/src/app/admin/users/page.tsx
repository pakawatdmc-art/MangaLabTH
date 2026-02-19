"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Coins, Loader2, Search, Shield, Sparkles, Users } from "lucide-react";
import type { User } from "@/lib/types";
import { listUsers, adminGrantCoins, updateUser } from "@/lib/api";

function getUsername(u: User): string {
  if (u.username?.trim()) return u.username.trim();
  if (u.display_name?.trim()) return u.display_name.trim();
  if (u.email?.includes("@")) return u.email.split("@")[0];
  return u.clerk_id;
}

export default function AdminUsersPage() {
  const { getToken } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

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

  const filteredUsers = users.filter((u) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;

    const searchable = [
      getUsername(u),
      u.username || "",
      u.display_name || "",
      u.email || "",
      u.clerk_id || "",
      u.role || "",
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(q);
  });
  const adminCount = users.filter((u) => u.role === "admin").length;
  const readerCount = users.length - adminCount;
  const filteredAdmins = filteredUsers.filter((u) => u.role === "admin");
  const filteredReaders = filteredUsers.filter((u) => u.role !== "admin");

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
      setError("");
      await fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เติมเหรียญล้มเหลว");
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
      setError("");
      await fetchUsers();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เปลี่ยนสิทธิ์ล้มเหลว");
    }
  };

  const renderUserRows = (tableUsers: User[]) =>
    tableUsers.map((u) => (
      <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.03]">
        <td className="px-4 py-2 text-white">
          <div className="font-medium">@{getUsername(u)}</div>
          {u.display_name && (
            <div className="text-xs text-gray-500">{u.display_name}</div>
          )}
        </td>
        <td className="px-4 py-2 text-gray-400">
          <div>{u.email || "—"}</div>
          <div className="text-xs text-gray-600">{u.clerk_id}</div>
        </td>
        <td className="px-4 py-2">
          {u.role === "admin" ? (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2 py-0.5 text-xs text-gold">
                <Shield className="h-3 w-3" />
                Admin
              </span>
              {u.is_primary_admin && (
                <span className="inline-flex items-center rounded-full border border-emerald-400/35 bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                  Admin Master
                </span>
              )}
            </div>
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
            className="mr-2 rounded-md border border-gold/20 bg-gold/10 px-2.5 py-1 text-xs text-gold transition hover:bg-gold/20"
          >
            เติมเหรียญ
          </button>
          <button
            onClick={() => handleToggleRole(u)}
            disabled={u.is_primary_admin}
            title={u.is_primary_admin ? "บัญชีหลักไม่สามารถลดสิทธิ์ได้" : undefined}
            className="rounded-md border border-white/10 bg-surface-200 px-2.5 py-1 text-xs text-gray-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:border-emerald-500/35 disabled:bg-emerald-500/10 disabled:font-semibold disabled:text-emerald-300"
          >
            {u.is_primary_admin
              ? "Admin Master"
              : u.role === "admin"
                ? "ลดสิทธิ์"
                : "เลื่อนเป็น Admin"}
          </button>
        </td>
      </tr>
    ));

  const renderUserTable = (tableUsers: User[], emptyMessage: string) => (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-surface-100/80 ring-1 ring-white/5">
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="border-b border-white/5 text-left text-xs text-gray-500">
            <th className="px-4 py-3">Username</th>
            <th className="px-4 py-3">อีเมล / Clerk ID</th>
            <th className="px-4 py-3">สิทธิ์</th>
            <th className="px-4 py-3">เหรียญ</th>
            <th className="px-4 py-3">วันที่สมัคร</th>
            <th className="px-4 py-3 text-right">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {tableUsers.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-gray-600">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            renderUserRows(tableUsers)
          )}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#1b2130_0%,#131826_48%,#12151d_100%)] p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.16),transparent_44%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.14),transparent_46%)]" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white">
            <Users className="mr-2 inline-block h-6 w-6 text-gold" />
            ผู้ใช้งาน
          </h1>
          <p className="mt-1 text-sm text-gray-300">
            จัดการบัญชีผู้ใช้ สิทธิ์ และยอดเหรียญ — ทั้งหมด {users.length} คน
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-gold">
            <Sparkles className="h-3.5 w-3.5" />
            ค้นหาเร็วและจัดการผู้ใช้ได้ทันที
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-surface-100/80 p-4 ring-1 ring-white/5 sm:p-5">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-surface-200/50 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">ผู้ใช้ทั้งหมด</p>
            <p className="text-lg font-semibold text-white">{users.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-surface-200/50 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">แอดมิน</p>
            <p className="text-lg font-semibold text-gold">{adminCount}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-surface-200/50 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">ผู้อ่าน</p>
            <p className="text-lg font-semibold text-emerald-300">{readerCount}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-surface-200/50 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">ผลลัพธ์ค้นหา</p>
            <p className="text-lg font-semibold text-white">{filteredUsers.length}</p>
          </div>
        </div>

        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหา username, email, clerk id, role..."
            className="h-10 w-full rounded-xl border border-white/10 bg-surface-200 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-gold/40 focus:outline-none"
          />
        </label>
      </section>

      {error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
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
              ให้ @{getUsername(grantTarget)}
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

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Shield className="h-4 w-4 text-gold" />
            ตารางทีมแอดมิน
          </h2>
          <span className="rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold">
            {filteredAdmins.length} คน
          </span>
        </div>
        {renderUserTable(
          filteredAdmins,
          query ? "ไม่พบแอดมินที่ตรงกับคำค้นหา" : "ยังไม่มีบัญชีแอดมิน"
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-white">
            <Users className="h-4 w-4 text-emerald-300" />
            ตารางผู้ใช้ทั่วไป
          </h2>
          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
            {filteredReaders.length} คน
          </span>
        </div>
        {renderUserTable(
          filteredReaders,
          query ? "ไม่พบผู้ใช้ทั่วไปที่ตรงกับคำค้นหา" : "ยังไม่มีบัญชีผู้ใช้ทั่วไป"
        )}
      </section>
    </div>
  );
}

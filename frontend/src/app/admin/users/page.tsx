"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { ChevronDown, ChevronUp, Coins, Loader2, Search, Shield, Sparkles, Trash2, Users as UsersIcon } from "lucide-react";
import type { User } from "@/lib/types";
import { listUsers, adminGrantCoins, updateUser, deleteUser } from "@/lib/api";
import { formatDateTime } from "@/lib/utils";

function getUsername(u: User): string {
  if (u.username?.trim()) return u.username.trim();
  if (u.display_name?.trim()) return u.display_name.trim();
  if (u.email?.includes("@")) return u.email.split("@")[0];
  return u.clerk_id;
}

export default function AdminUsersPage() {
  const { getToken, userId } = useAuth();
  const [admins, setAdmins] = useState<User[]>([]);
  const [readers, setReaders] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [isAdminTableOpen, setIsAdminTableOpen] = useState(false);
  
  // Pagination for readers
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [readerTotal, setReaderTotal] = useState(0);
  const [adminTotal, setAdminTotal] = useState(0);
  const itemsPerPage = 20;

  // Debounce timer for search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Grant coins modal
  const [grantTarget, setGrantTarget] = useState<User | null>(null);
  const [grantAmount, setGrantAmount] = useState(0);
  const [grantNote, setGrantNote] = useState("");
  const [granting, setGranting] = useState(false);

  const fetchUsers = useCallback(async (page: number, q?: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      
      setTableLoading(true);

      // Fetch Admins and Readers in parallel
      const [adminRes, readerRes] = await Promise.all([
        listUsers(token, { role: "admin", per_page: 100, q: q }),
        listUsers(token, { role: "reader", page: page, per_page: itemsPerPage, q: q }),
      ]);

      setAdmins(adminRes.items);
      setAdminTotal(adminRes.total);
      
      setReaders(readerRes.items);
      setReaderTotal(readerRes.total);
      setTotalPages(readerRes.total_pages);
      setCurrentPage(readerRes.page);
      
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลผู้ใช้ล้มเหลว");
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  }, [getToken, itemsPerPage]);

  useEffect(() => {
    fetchUsers(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers(1, value);
    }, 400);
  };

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    fetchUsers(page, query);
  };

  const currentUser = admins.find((u) => u.clerk_id === userId) || readers.find((u) => u.clerk_id === userId);
  const isPrimaryAdmin = currentUser?.is_primary_admin || false;

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
      await fetchUsers(currentPage, query);
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
      // Reset to page 1 because user role changed
      await fetchUsers(1, query);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เปลี่ยนสิทธิ์ล้มเหลว");
    }
  };

  const handleDeleteUser = async (user: User) => {
    const displayName = user.email || getUsername(user);
    if (!confirm(`⚠️ ยืนยันลบบัญชี "${displayName}" ?\n\nข้อมูลผู้ใช้และประวัติธุรกรรมทั้งหมดจะถูกลบออกจากทั้งระบบของเราและ Clerk อย่างถาวร`)) return;
    try {
      const token = await getToken();
      if (!token) return;
      await deleteUser(user.id, token);
      setError("");
      await fetchUsers(currentPage, query);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ลบผู้ใช้ล้มเหลว");
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
        <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">
          {formatDateTime(u.created_at)}
        </td>
        <td className="px-4 py-2 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => setGrantTarget(u)}
              className="rounded-md border border-gold/20 bg-gold/10 px-2.5 py-1 text-xs text-gold transition hover:bg-gold/20"
            >
              เติมเหรียญ
            </button>
            {isPrimaryAdmin && (
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
            )}
            {!u.is_primary_admin && u.id !== currentUser?.id && (
              <button
                onClick={() => handleDeleteUser(u)}
                title="ลบบัญชีผู้ใช้"
                className="rounded-md border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
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
            จัดการบัญชีผู้ใช้ สิทธิ์ และยอดเหรียญ — ทั้งหมด {adminTotal + readerTotal} คน
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
            <p className="text-lg font-semibold text-white">{adminTotal + readerTotal}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-surface-200/50 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">แอดมิน</p>
            <p className="text-lg font-semibold text-gold">{adminTotal}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-surface-200/50 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">ผู้อ่าน</p>
            <p className="text-lg font-semibold text-emerald-300">{readerTotal}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-surface-200/50 px-3 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">แสดงผลหน้านี้</p>
            <p className="text-lg font-semibold text-white">{admins.length + readers.length}</p>
          </div>
        </div>

        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md transition-all duration-300 animate-in fade-in">
          <div className="w-full max-w-sm rounded-[1.5rem] border border-white/10 bg-[linear-gradient(135deg,#1b2130_0%,#131826_100%)] p-6 sm:p-7 shadow-2xl ring-1 ring-gold/10 transition-all duration-300 animate-in zoom-in-95">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-gold/10 shadow-[0_0_15px_rgba(212,168,67,0.15)]">
                <Coins className="h-6 w-6 text-gold" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">เติมเหรียญ</h3>
                <p className="text-sm text-gray-400">ให้ <span className="text-emerald-300">@{getUsername(grantTarget)}</span></p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wide">จำนวนเหรียญ</label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                    <Sparkles className="h-4 w-4 text-gold/50" />
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={grantAmount || ""}
                    onChange={(e) => setGrantAmount(Number(e.target.value))}
                    placeholder="0"
                    className="h-12 w-full rounded-xl border border-white/10 bg-black/40 pl-11 pr-4 text-lg font-medium text-gold placeholder:text-gray-600 focus:border-gold/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-gold/50 transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-400 uppercase tracking-wide">หมายเหตุ (ไม่บังคับ)</label>
                <input
                  type="text"
                  value={grantNote}
                  onChange={(e) => setGrantNote(e.target.value)}
                  placeholder="เช่น กิจกรรมพิเศษ..."
                  className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-white placeholder:text-gray-600 focus:border-gold/50 focus:bg-black/60 focus:outline-none focus:ring-1 focus:ring-gold/50 transition-all"
                />
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setGrantTarget(null)}
                className="flex-1 rounded-xl border border-white/10 bg-surface-200/50 py-3 text-sm font-semibold text-gray-300 transition hover:bg-surface-200 hover:text-white"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleGrant}
                disabled={granting || grantAmount <= 0}
                className="flex-1 rounded-xl bg-gold py-3 text-sm font-bold text-black shadow-[0_0_20px_rgba(212,168,67,0.25)] transition hover:bg-gold-light hover:shadow-[0_0_25px_rgba(212,168,67,0.4)] disabled:opacity-50 disabled:shadow-none"
              >
                {granting ? "กำลังเติม..." : "ยืนยันการเติม"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="space-y-3">
        <button 
          onClick={() => setIsAdminTableOpen(!isAdminTableOpen)}
          className="flex w-full items-center justify-between gap-3 rounded-xl p-2 transition hover:bg-white/5"
        >
          <div className="flex items-center gap-2 text-base font-semibold text-white">
            <Shield className="h-4 w-4 text-gold" />
            ตารางทีมแอดมิน
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 text-xs font-medium text-gold">
              {adminTotal} คน
            </span>
            {isAdminTableOpen ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </button>
        {isAdminTableOpen && renderUserTable(
          admins,
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
            {readerTotal} คน
          </span>
        </div>
        
        {tableLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
            <span className="ml-2 text-sm text-gray-400">กำลังโหลด...</span>
          </div>
        )}
        
        {!tableLoading && renderUserTable(
          readers,
          query ? "ไม่พบผู้ใช้ทั่วไปที่ตรงกับคำค้นหา" : "ยังไม่มีบัญชีผู้ใช้ทั่วไป"
        )}
        
        {/* Pagination Controls */}
        {!tableLoading && totalPages > 1 && (
          <div className="flex items-center justify-between px-2 pt-2 pb-4">
            <p className="text-xs text-gray-500">
              แสดง {(currentPage - 1) * itemsPerPage + 1} ถึง {Math.min(currentPage * itemsPerPage, readerTotal)} จากทั้งหมด {readerTotal} รายการ
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="rounded-lg border border-white/10 bg-surface-200 px-3 py-1.5 text-xs text-white transition hover:bg-surface-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ก่อนหน้า
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
                  // Show max 5 page numbers
                  if (
                    totalPages <= 5 || 
                    i === 0 || 
                    i === totalPages - 1 || 
                    Math.abs(currentPage - 1 - i) <= 1
                  ) {
                    return (
                      <button
                        key={i}
                        onClick={() => handlePageChange(i + 1)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border text-xs transition ${
                          currentPage === i + 1
                            ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-400 font-medium"
                            : "border-white/10 bg-surface-200 text-gray-400 hover:bg-surface-100 hover:text-white"
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  }
                  
                  // Add ellipsis
                  if (
                    (i === 1 && currentPage > 3) || 
                    (i === totalPages - 2 && currentPage < totalPages - 2)
                  ) {
                    return <span key={i} className="px-1 text-gray-500">...</span>;
                  }
                  
                  return null;
                })}
              </div>

              <button
                onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-white/10 bg-surface-200 px-3 py-1.5 text-xs text-white transition hover:bg-surface-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

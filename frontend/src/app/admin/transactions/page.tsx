"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ArrowDownCircle, ArrowUpCircle, Coins, History, Loader2, Search, Sparkles } from "lucide-react";
import type { Transaction, User } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { listAllTransactions, listUsers } from "@/lib/api";

const TX_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  coin_purchase: { label: "เติมเหรียญ", color: "text-emerald-400" },
  chapter_unlock: { label: "ปลดล็อกตอน", color: "text-orange-400" },
  admin_grant: { label: "แอดมินเติม", color: "text-blue-400" },
  refund: { label: "คืนเหรียญ", color: "text-purple-400" },
};

function translateNote(note: string | null | undefined): string {
  if (!note) return "—";
  let translated = note;
  if (translated.startsWith("Unlocked ")) {
    translated = translated.replace("Unlocked ", "ปลดล็อกเรื่อง ");
    translated = translated.replace(" chapter ", " ตอนที่ ");
  } else if (translated.startsWith("Purchased ")) {
    translated = translated.replace("Purchased ", "เติมเงิน ");
  } else if (translated === "Admin grant") {
    translated = "แอดมินเติมเงินให้";
  }
  return translated;
}

export default function AdminTransactionsPage() {
  const { getToken } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userMap, setUserMap] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const data = await listAllTransactions(token);
        setTransactions(
          [...data].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
        );

        // Fetch users for username lookup
        try {
          const users = await listUsers(token);
          const map = new Map<string, User>();
          users.forEach((u) => map.set(u.id, u));
          setUserMap(map);
        } catch {
          // Non-critical: fallback to showing user_id
        }

        setError("");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "โหลดรายการเหรียญล้มเหลว");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Summary calculations
  const totalIn = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const latestBalance = totalIn - totalOut;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredTransactions = transactions.filter((tx) => {
    const typeMatched = typeFilter === "all" || tx.type === typeFilter;
    if (!typeMatched) return false;
    if (!normalizedQuery) return true;

    const searchable = [
      tx.type,
      tx.user_id,
      userMap.get(tx.user_id)?.username || "",
      userMap.get(tx.user_id)?.email || "",
      tx.note || "",
      translateNote(tx.note),
      String(tx.amount),
      String(tx.balance_after),
      formatDateTime(tx.created_at),
    ]
      .join(" ")
      .toLowerCase();

    return searchable.includes(normalizedQuery);
  });

  // Pagination for transactions
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [query, typeFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#1b2130_0%,#141b2b_52%,#10151f_100%)] p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.18),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.14),transparent_46%)]" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white">
            <History className="mr-2 inline-block h-6 w-6 text-gold" />
            รายการเหรียญ
          </h1>
          <p className="mt-1 text-sm text-gray-300">ประวัติการเติมเหรียญ ปลดล็อกตอน และการคืนเงิน</p>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs text-gold">
            <Sparkles className="h-3.5 w-3.5" />
            ตรวจสอบการเคลื่อนไหวเหรียญได้จากหน้าจอเดียว
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-surface-100/80 p-4 ring-1 ring-white/5 sm:p-5">
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-surface-200/50 px-3 py-2.5">
            <ArrowUpCircle className="mb-1 h-4 w-4 text-emerald-400" />
            <p className="text-lg font-semibold text-white">{totalIn.toLocaleString()}</p>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">ยอดเติม</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-surface-200/50 px-3 py-2.5">
            <ArrowDownCircle className="mb-1 h-4 w-4 text-orange-400" />
            <p className="text-lg font-semibold text-white">{totalOut.toLocaleString()}</p>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">ยอดใช้</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-surface-200/50 px-3 py-2.5">
            <Coins className="mb-1 h-4 w-4 text-gold" />
            <p className="text-lg font-semibold text-white">{latestBalance.toLocaleString()}</p>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">เหรียญคงเหลือล่าสุด</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-surface-200/50 px-3 py-2.5">
            <History className="mb-1 h-4 w-4 text-blue-400" />
            <p className="text-lg font-semibold text-white">{transactions.length}</p>
            <p className="text-[11px] uppercase tracking-wide text-gray-500">รายการทั้งหมด</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ค้นหา user id, หมายเหตุ, จำนวน, วันที่..."
              className="h-10 w-full rounded-xl border border-white/10 bg-surface-200 pl-9 pr-3 text-sm text-white placeholder:text-gray-500 focus:border-gold/40 focus:outline-none"
            />
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-10 rounded-xl border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/40 focus:outline-none"
          >
            <option value="all">ทุกประเภท</option>
            {Object.entries(TX_TYPE_LABELS).map(([value, info]) => (
              <option key={value} value={value}>
                {info.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-surface-100/80 ring-1 ring-white/5">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs text-gray-500">
              <th className="px-4 py-3">ประเภท</th>
              <th className="px-4 py-3">ผู้ใช้</th>
              <th className="px-4 py-3">จำนวน</th>
              <th className="px-4 py-3">ยอดคงเหลือ</th>
              <th className="px-4 py-3">หมายเหตุ</th>
              <th className="px-4 py-3">วันที่</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-600">
                  {transactions.length === 0
                    ? "ยังไม่มีรายการ"
                    : "ไม่พบรายการที่ตรงกับคำค้นหาหรือตัวกรอง"}
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((tx) => {
                const typeInfo = TX_TYPE_LABELS[tx.type] || {
                  label: tx.type,
                  color: "text-gray-400",
                };
                return (
                  <tr key={tx.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium ${typeInfo.color}`}>
                        {typeInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col" title={`User ID: ${tx.user_id}`}>
                        <span className="text-white text-xs font-medium">
                          @{userMap.get(tx.user_id)?.username || tx.user_id.slice(0, 12) + "…"}
                        </span>
                        {userMap.get(tx.user_id)?.email && (
                          <span className="text-[10px] text-gray-500 truncate max-w-[180px]" title={userMap.get(tx.user_id)!.email}>
                            {userMap.get(tx.user_id)!.email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={tx.amount >= 0 ? "text-emerald-400 font-medium" : "text-orange-400 font-medium"}>
                        {tx.amount >= 0 ? "+" : ""}
                        {tx.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-400 font-medium">{tx.balance_after.toLocaleString()}</td>
                    <td className="max-w-[320px] px-4 py-2.5 text-xs text-gray-300 leading-relaxed break-words" title={translateNote(tx.note)}>
                      {translateNote(tx.note)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(tx.created_at)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
            <p className="text-xs text-gray-500">
              แสดง {(currentPage - 1) * itemsPerPage + 1} ถึง {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} จากทั้งหมด {filteredTransactions.length} รายการ
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                        onClick={() => setCurrentPage(i + 1)}
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
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="rounded-lg border border-white/10 bg-surface-200 px-3 py-1.5 text-xs text-white transition hover:bg-surface-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ถัดไป
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

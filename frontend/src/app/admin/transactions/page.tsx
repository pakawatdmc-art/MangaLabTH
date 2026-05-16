"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { ArrowDownCircle, ArrowUpCircle, Coins, History, Loader2, Search } from "lucide-react";
import type { Transaction } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { listAllTransactions, getTransactionSummary } from "@/lib/api";

const TX_TYPE_LABELS: Record<string, { label: string; tone: string }> = {
  coin_purchase: { label: "เติมเหรียญ", tone: "bg-emerald-500/10 text-emerald-300" },
  chapter_unlock: { label: "ปลดล็อกตอน", tone: "bg-gold/10 text-gold" },
  admin_grant: { label: "แอดมินเติม", tone: "bg-ink-700 text-ink-200" },
  refund: { label: "คืนเหรียญ", tone: "bg-ink-700 text-ink-200" },
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

const ITEMS_PER_PAGE = 20;

export default function AdminTransactionsPage() {
  const { getToken } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [error, setError] = useState("");

  // Pagination state (server-side)
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Summary state (separate lightweight query)
  const [summary, setSummary] = useState({ total_in: 0, total_out: 0, net_balance: 0, total_count: 0 });

  // Filter state
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Debounce timer for search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch transactions for current page ──
  const fetchPage = useCallback(async (page: number, type?: string, q?: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      setTableLoading(true);

      const params: { page: number; per_page: number; type?: string; q?: string } = {
        page,
        per_page: ITEMS_PER_PAGE,
      };
      if (type && type !== "all") params.type = type;
      if (q && q.trim()) params.q = q.trim();

      const data = await listAllTransactions(token, params);

      setTransactions(data.items);
      setTotalPages(data.total_pages);
      setTotalItems(data.total);
      setCurrentPage(data.page);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "โหลดรายการเหรียญล้มเหลว");
    } finally {
      setTableLoading(false);
    }
  }, [getToken]);

  // ── Initial load: summary + first page in parallel ──
  useEffect(() => {
    const init = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const [pageData, summaryData] = await Promise.all([
          listAllTransactions(token, { page: 1, per_page: ITEMS_PER_PAGE }),
          getTransactionSummary(token),
        ]);

        setTransactions(pageData.items);
        setTotalPages(pageData.total_pages);
        setTotalItems(pageData.total);
        setCurrentPage(pageData.page);

        setSummary(summaryData);

        setError("");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "โหลดรายการเหรียญล้มเหลว");
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Page change handler ──
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    fetchPage(page, typeFilter, query);
  };

  // ── Filter change handlers ──
  const handleTypeChange = (newType: string) => {
    setTypeFilter(newType);
    setCurrentPage(1);
    fetchPage(1, newType, query);
  };

  const handleSearchChange = (value: string) => {
    setQuery(value);
    // Debounce: รอ 400ms หลังพิมพ์เสร็จค่อยค้นหา
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchPage(1, typeFilter, value);
    }, 400);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-lg bg-ink-800/70 p-6 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.06),transparent_55%)]" />
        <div className="relative">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-300">Ledger</span>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-ink-100 sm:text-3xl">
            <History className="h-5 w-5 text-gold" />
            รายการเหรียญ
          </h1>
          <p className="mt-1 text-sm text-ink-400">ประวัติการเติมเหรียญ ปลดล็อกตอน และการคืนเงินทั้งหมด</p>
        </div>
      </section>

      {error && (
        <div className="rounded-md bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: ArrowUpCircle, label: "ยอดเติม", value: summary.total_in, accent: false },
          { icon: ArrowDownCircle, label: "ยอดใช้", value: summary.total_out, accent: false },
          { icon: Coins, label: "เหรียญคงเหลือล่าสุด", value: summary.net_balance, accent: true },
          { icon: History, label: "รายการทั้งหมด", value: summary.total_count, accent: false },
        ].map(({ icon: Icon, label, value, accent }) => (
          <div key={label} className="relative overflow-hidden rounded-md bg-ink-800/70 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] p-5">
            <div className="flex items-center justify-between">
              <div className={`rounded-xs p-2 ${accent ? "bg-gold/10" : "bg-ink-900"}`}>
                <Icon className={`h-4 w-4 ${accent ? "text-gold" : "text-ink-300"}`} />
              </div>
            </div>
            <p className="mt-4 text-3xl font-bold tracking-tight text-white">{value.toLocaleString()}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <section className="rounded-md bg-ink-800/70 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_220px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="ค้นหาหมายเหตุ…"
              className="h-10 w-full rounded-sm bg-ink-900 pl-9 pr-3 text-sm text-ink-100 placeholder:text-ink-500 transition focus:ring-1 focus:ring-gold/40 focus:outline-none"
            />
          </label>
          <select
            value={typeFilter}
            onChange={(e) => handleTypeChange(e.target.value)}
            className="h-10 rounded-sm bg-ink-900 px-3 text-sm text-ink-100 transition focus:ring-1 focus:ring-gold/40 focus:outline-none"
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

      <div className="overflow-x-auto rounded-md bg-ink-800/70 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
        {/* Loading overlay for page transitions */}
        {tableLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
            <span className="ml-2 text-sm text-ink-400">กำลังโหลด…</span>
          </div>
        )}

        {!tableLoading && (
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-ink-900/40">
              <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
                <th className="px-4 py-3">ประเภท</th>
                <th className="px-4 py-3">ผู้ใช้</th>
                <th className="px-4 py-3">จำนวน</th>
                <th className="px-4 py-3">ยอดคงเหลือ</th>
                <th className="px-4 py-3">หมายเหตุ</th>
                <th className="px-4 py-3">วันที่</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-800">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-ink-500">
                    {totalItems === 0
                      ? "ยังไม่มีรายการ"
                      : "ไม่พบรายการที่ตรงกับคำค้นหาหรือตัวกรอง"}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const typeInfo = TX_TYPE_LABELS[tx.type] || {
                    label: tx.type,
                    tone: "bg-ink-700 text-ink-300",
                  };
                  return (
                    <tr key={tx.id} className="transition-colors hover:bg-ink-900/40">
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex rounded-xs px-2 py-0.5 text-[11px] font-semibold ${typeInfo.tone}`}>
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col" title={`User ID: ${tx.user_id}`}>
                          <span className="text-ink-100 text-xs font-medium">
                            @{tx.user_username || tx.user_clerk_id || tx.user_id.slice(0, 12) + "…"}
                          </span>
                          {tx.user_email && (
                            <span className="text-[10px] text-ink-500 truncate max-w-[180px]" title={tx.user_email}>
                              {tx.user_email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={tx.amount >= 0 ? "text-emerald-300 font-semibold" : "text-gold font-semibold"}>
                          {tx.amount >= 0 ? "+" : ""}
                          {tx.amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-ink-300 font-medium">{tx.balance_after.toLocaleString()}</td>
                      <td className="max-w-[320px] px-4 py-2.5 text-xs text-ink-300 leading-relaxed break-words" title={translateNote(tx.note)}>
                        {translateNote(tx.note)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-ink-500 whitespace-nowrap">{formatDateTime(tx.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-ink-900/40 px-4 py-3">
            <p className="text-xs text-ink-500">
              แสดง {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} จากทั้งหมด {totalItems.toLocaleString()} รายการ
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || tableLoading}
                className="rounded-sm bg-ink-800/70 px-3 py-1.5 text-xs text-ink-200 transition-colors hover:bg-ink-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ก่อนหน้า
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => {
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
                        disabled={tableLoading}
                        className={`flex h-8 w-8 items-center justify-center rounded-sm text-xs font-semibold transition-colors ${
                          currentPage === i + 1
                            ? "bg-gold text-ink-950"
                            : "bg-ink-800/70 text-ink-300 hover:bg-ink-800 hover:text-ink-100"
                        }`}
                      >
                        {i + 1}
                      </button>
                    );
                  }

                  if (
                    (i === 1 && currentPage > 3) ||
                    (i === totalPages - 2 && currentPage < totalPages - 2)
                  ) {
                    return <span key={i} className="px-1 text-ink-500">…</span>;
                  }

                  return null;
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages || tableLoading}
                className="rounded-sm bg-ink-800/70 px-3 py-1.5 text-xs text-ink-200 transition-colors hover:bg-ink-800 disabled:opacity-40 disabled:cursor-not-allowed"
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

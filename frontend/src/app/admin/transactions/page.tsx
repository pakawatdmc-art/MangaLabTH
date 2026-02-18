"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ArrowDownCircle, ArrowUpCircle, Coins, History, Loader2 } from "lucide-react";
import type { Transaction } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { listAllTransactions } from "@/lib/api";

const TX_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  coin_purchase: { label: "เติมเหรียญ", color: "text-emerald-400" },
  chapter_unlock: { label: "ปลดล็อกตอน", color: "text-orange-400" },
  admin_grant: { label: "แอดมินเติม", color: "text-blue-400" },
  refund: { label: "คืนเหรียญ", color: "text-purple-400" },
};

export default function AdminTransactionsPage() {
  const { getToken } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const data = await listAllTransactions(token);
        setTransactions(data);
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
  const totalIn = transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
  const latestBalance = transactions.length > 0 ? transactions[0].balance_after : 0;

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
          <History className="mr-2 inline-block h-6 w-6 text-gold" />
          รายการเหรียญ
        </h1>
        <p className="text-sm text-gray-500">ประวัติการเติมเหรียญ ปลดล็อกตอน และการคืนเงิน</p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-surface-100 p-4 ring-1 ring-white/5">
          <ArrowUpCircle className="mb-1 h-5 w-5 text-emerald-400" />
          <p className="text-xl font-bold text-white">{totalIn.toLocaleString()}</p>
          <p className="text-xs text-gray-500">ยอดเติม</p>
        </div>
        <div className="rounded-xl bg-surface-100 p-4 ring-1 ring-white/5">
          <ArrowDownCircle className="mb-1 h-5 w-5 text-orange-400" />
          <p className="text-xl font-bold text-white">{totalOut.toLocaleString()}</p>
          <p className="text-xs text-gray-500">ยอดใช้</p>
        </div>
        <div className="rounded-xl bg-surface-100 p-4 ring-1 ring-white/5">
          <Coins className="mb-1 h-5 w-5 text-gold" />
          <p className="text-xl font-bold text-white">{latestBalance.toLocaleString()}</p>
          <p className="text-xs text-gray-500">เหรียญหมุนเวียน</p>
        </div>
        <div className="rounded-xl bg-surface-100 p-4 ring-1 ring-white/5">
          <History className="mb-1 h-5 w-5 text-blue-400" />
          <p className="text-xl font-bold text-white">{transactions.length}</p>
          <p className="text-xs text-gray-500">รายการทั้งหมด</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl bg-surface-100 ring-1 ring-white/5">
        <table className="w-full min-w-[600px] text-sm">
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
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-600">
                  ยังไม่มีรายการ
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const typeInfo = TX_TYPE_LABELS[tx.type] || {
                  label: tx.type,
                  color: "text-gray-400",
                };
                return (
                  <tr
                    key={tx.id}
                    className="border-b border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className={`px-4 py-2 text-xs font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </td>
                    <td className="px-4 py-2 text-gray-400">{tx.user_id}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          tx.amount >= 0 ? "text-emerald-400" : "text-orange-400"
                        }
                      >
                        {tx.amount >= 0 ? "+" : ""}
                        {tx.amount}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-400">{tx.balance_after}</td>
                    <td className="max-w-[200px] truncate px-4 py-2 text-xs text-gray-500">
                      {tx.note || "—"}
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500">
                      {formatDate(tx.created_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowLeft,
  Coins,
  CreditCard,
  Loader2,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Wallet,
  Unlock,
  User as UserIcon,
  Mail,
  Calendar,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { getUserProfile, type UserProfileData } from "@/lib/api";
import { formatNumber, formatDateTime } from "@/lib/utils";

const TX_TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  coin_purchase: { label: "เติมเหรียญ", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
  chapter_unlock: { label: "ปลดล็อกตอน", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  admin_grant: { label: "Admin เติม", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  refund: { label: "คืนเงิน", color: "text-rose-700", bg: "bg-rose-50 border-rose-200" },
};

export default function AdminUserProfilePage() {
  const { getToken, isLoaded } = useAuth();
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const [data, setData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Transaction filters
  const [txPage, setTxPage] = useState(1);
  const [txType, setTxType] = useState<string>("");

  const fetchProfile = useCallback(
    async (page: number, type: string) => {
      try {
        setLoading(true);
        const token = await getToken();
        if (!token) throw new Error("No token");
        const result = await getUserProfile(userId, token, {
          tx_page: page,
          tx_per_page: 15,
          tx_type: type || undefined,
        });
        setData(result);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error loading profile");
      } finally {
        setLoading(false);
      }
    },
    [getToken, userId]
  );

  useEffect(() => {
    if (!isLoaded || !userId) return;
    fetchProfile(txPage, txType);
  }, [isLoaded, userId, txPage, txType, fetchProfile]);

  const user = data?.user;
  const summary = data?.summary;
  const topManga = data?.top_manga ?? [];
  const txData = data?.transactions;

  function getDisplayName(u: NonNullable<typeof user>) {
    if (u.username?.trim()) return `@${u.username.trim()}`;
    if (u.display_name?.trim()) return u.display_name.trim();
    if (u.email?.includes("@")) return u.email.split("@")[0];
    return u.clerk_id;
  }

  // ── Loading / Error ──
  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-red-600">❌ {error}</p>
        <button onClick={() => router.back()} className="text-amber-700 underline">
          ← กลับ
        </button>
      </div>
    );
  }

  if (!data || !user) return null;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
            User Profile
          </p>
          <h1 className="text-2xl font-bold text-gray-900">
            โปรไฟล์ผู้ใช้
          </h1>
        </div>
      </div>

      {/* ── User Info Card ── */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* Avatar */}
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-amber-200 bg-amber-50 shadow">
            {user.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={getDisplayName(user)}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <UserIcon className="h-10 w-10 text-amber-400" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">
                {getDisplayName(user)}
              </h2>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  user.role === "admin"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {user.role === "admin" && <Shield className="h-3 w-3" />}
                {user.role === "admin" ? "Admin" : "Reader"}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {user.email || "—"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                สมัคร {user.created_at ? formatDateTime(user.created_at) : "—"}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                คงเหลือ{" "}
                <strong className="text-gray-900">
                  {formatNumber(user.coin_balance)}
                </strong>{" "}
                เหรียญ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {summary && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
            label="ยอดเติมรวม"
            value={`+${formatNumber(summary.total_in)}`}
            sub={`${formatNumber(summary.topup_count)} ครั้ง`}
            color="emerald"
          />
          <KpiCard
            icon={<TrendingDown className="h-5 w-5 text-rose-600" />}
            label="ยอดใช้รวม"
            value={`-${formatNumber(summary.total_out)}`}
            sub="เหรียญ"
            color="rose"
          />
          <KpiCard
            icon={<Wallet className="h-5 w-5 text-blue-600" />}
            label="คงเหลือ"
            value={formatNumber(user.coin_balance)}
            sub="เหรียญ"
            color="blue"
          />
          <KpiCard
            icon={<Unlock className="h-5 w-5 text-amber-600" />}
            label="ปลดล็อกตอน"
            value={formatNumber(summary.unlock_count)}
            sub="ตอน"
            color="amber"
          />
        </div>
      )}

      {/* ── Top Manga ── */}
      {topManga.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-bold text-gray-900">
              มังงะที่อ่านมากที่สุด
            </h3>
          </div>
          <div className="space-y-3">
            {topManga.map((m, i) => (
              <div
                key={m.manga_id}
                className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-3 transition hover:bg-gray-50"
              >
                {/* Rank */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                    i === 0
                      ? "bg-amber-100 text-amber-700"
                      : i === 1
                      ? "bg-gray-200 text-gray-700"
                      : i === 2
                      ? "bg-orange-100 text-orange-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {i + 1}
                </div>

                {/* Cover */}
                <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-gray-200 shadow-sm">
                  {m.cover_url ? (
                    <Image src={m.cover_url} alt={m.title} fill className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                      📖
                    </div>
                  )}
                </div>

                {/* Title & Stats */}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {m.title}
                  </p>
                  <p className="text-xs text-gray-500">
                    {m.chapters_unlocked} ตอน · ใช้ {formatNumber(m.coins_spent)} เหรียญ
                  </p>
                </div>

                {/* Badge */}
                <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                  {m.chapters_unlocked} ตอน
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Transaction History ── */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 p-6 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-600" />
              <h3 className="text-lg font-bold text-gray-900">
                ประวัติรายการ
              </h3>
              {txData && (
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {formatNumber(txData.total)} รายการ
                </span>
              )}
            </div>

            {/* Filter by type */}
            <select
              value={txType}
              onChange={(e) => {
                setTxType(e.target.value);
                setTxPage(1);
              }}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100"
            >
              <option value="">ทุกประเภท</option>
              <option value="coin_purchase">เติมเหรียญ</option>
              <option value="chapter_unlock">ปลดล็อกตอน</option>
              <option value="admin_grant">Admin เติม</option>
              <option value="refund">คืนเงิน</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                <th className="px-6 py-3">ประเภท</th>
                <th className="px-6 py-3 text-right">จำนวน</th>
                <th className="px-6 py-3 text-right">ยอดคงเหลือ</th>
                <th className="px-6 py-3">หมายเหตุ</th>
                <th className="px-6 py-3 text-right">วันที่</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-500" />
                  </td>
                </tr>
              ) : txData?.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    ไม่พบรายการ
                  </td>
                </tr>
              ) : (
                txData?.items.map((tx) => {
                  const meta = TX_TYPE_LABELS[tx.type] ?? {
                    label: tx.type,
                    color: "text-gray-700",
                    bg: "bg-gray-50 border-gray-200",
                  };
                  const isPositive = tx.amount > 0;
                  return (
                    <tr key={tx.id} className="transition hover:bg-gray-50/60">
                      <td className="px-6 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.bg} ${meta.color}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-3 text-right font-semibold tabular-nums ${
                          isPositive ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {isPositive ? "+" : ""}
                        {formatNumber(tx.amount)}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                        {formatNumber(tx.balance_after)}
                      </td>
                      <td className="max-w-xs truncate px-6 py-3 text-gray-600">
                        {tx.note || "—"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-3 text-right text-gray-400">
                        {tx.created_at ? formatDateTime(tx.created_at) : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {txData && txData.total_pages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
            <p className="text-sm text-gray-500">
              หน้า {txData.page} / {txData.total_pages}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                disabled={txPage <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTxPage((p) => Math.min(txData.total_pages, p + 1))}
                disabled={txPage >= txData.total_pages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── KPI Card Component ──
function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  const bgMap: Record<string, string> = {
    emerald: "bg-emerald-50 border-emerald-100",
    rose: "bg-rose-50 border-rose-100",
    blue: "bg-blue-50 border-blue-100",
    amber: "bg-amber-50 border-amber-100",
  };
  return (
    <div className={`rounded-2xl border p-5 shadow-sm ${bgMap[color] ?? "bg-gray-50 border-gray-100"}`}>
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm">
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">
        {label} · {sub}
      </p>
    </div>
  );
}

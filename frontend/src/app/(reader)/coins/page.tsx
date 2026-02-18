"use client";

import { Suspense, useEffect, useState } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { Coins, CreditCard, History, Loader2, Sparkles, AlertCircle, CheckCircle } from "lucide-react";

import { getPackages, createCheckoutSession, getMyTransactions, getMe } from "@/lib/api";
import type { CoinPackage, Transaction } from "@/lib/types";

export default function CoinsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      }
    >
      <CoinsPageContent />
    </Suspense>
  );
}

function CoinsPageContent() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = await getToken();
        if (!token) return;

        const [pkgData, txData, userData] = await Promise.all([
          getPackages(),
          getMyTransactions(token),
          getMe(token),
        ]);

        setPackages(pkgData);
        setTransactions(txData);
        setBalance(userData.coin_balance);
      } catch (err) {
        console.error(err);
        setError("ไม่สามารถโหลดข้อมูลได้");
      } finally {
        setLoading(false);
      }
    }
    if (isSignedIn) fetchData();
  }, [isSignedIn, getToken]);

  const handleBuy = async (pkg: CoinPackage) => {
    setProcessingId(pkg.id);
    setError("");

    try {
      const token = await getToken();
      if (!token) return;
      const { url } = await createCheckoutSession(pkg.id, token);
      if (url) window.location.href = url;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อ");
      setProcessingId(null);
    }
  };

  if (loading || !isLoaded) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Balance card */}
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-gold/20 via-surface-100 to-surface-200 p-6 ring-1 ring-gold/20">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/20">
            <Coins className="h-6 w-6 text-gold" />
          </div>
          <div>
            <p className="text-sm text-gray-400">ยอดเหรียญคงเหลือ</p>
            <p className="text-3xl font-bold text-gold">{balance.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {success && (
        <div className="mb-6 rounded-xl bg-green-500/10 p-4 text-center ring-1 ring-green-500/20">
          <CheckCircle className="mx-auto mb-2 h-6 w-6 text-green-400" />
          <h3 className="text-lg font-bold text-green-400">เติมเหรียญสำเร็จ!</h3>
          <p className="text-sm text-green-300">ยอดเหรียญของคุณอัปเดตแล้ว</p>
        </div>
      )}

      {canceled && (
        <div className="mb-6 rounded-xl bg-red-500/10 p-4 text-center ring-1 ring-red-500/20">
          <AlertCircle className="mx-auto mb-2 h-6 w-6 text-red-400" />
          <p className="text-red-400">ยกเลิกการชำระเงิน</p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl bg-red-500/10 p-4 text-center ring-1 ring-red-500/20">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Packages */}
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <CreditCard className="h-5 w-5 text-gold" />
          เติมเหรียญ
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => handleBuy(pkg)}
              disabled={!!processingId}
              className={`relative flex flex-col justify-between rounded-xl p-4 text-center ring-1 transition hover:ring-gold/50 disabled:opacity-50 ${pkg.sort_order === 2
                ? "bg-gold/10 ring-gold/30"
                : "bg-surface-100 ring-white/10 hover:bg-surface-50"
                }`}
            >
              {pkg.sort_order === 2 && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-black">
                  <Sparkles className="mr-0.5 inline-block h-3 w-3" />
                  ขายดี
                </span>
              )}
              <div>
                <Coins className="mx-auto mb-2 h-8 w-8 text-gold" />
                <p className="text-xl font-bold text-white">{pkg.coins}</p>
                <p className="text-xs text-gray-400">เหรียญ</p>
              </div>
              <div className="mt-4">
                {processingId === pkg.id ? (
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-gold" />
                ) : (
                  <p className="text-sm font-semibold text-gold">
                    ฿{(pkg.price_thb / 100).toLocaleString()}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-gray-600">
          ชำระผ่าน Stripe — รองรับบัตรเครดิต/เดบิต และ PromptPay
        </p>
      </section>

      {/* Transaction history */}
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <History className="h-5 w-5 text-gold" />
          ประวัติการทำรายการ
        </h2>
        <div className="overflow-hidden rounded-xl bg-surface-100 ring-1 ring-white/5">
          {transactions.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">
              ยังไม่มีรายการ
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-200 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3">รายการ</th>
                  <th className="px-4 py-3 text-right">จำนวน</th>
                  <th className="px-4 py-3 text-right">วันที่</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="text-white">
                        {tx.type === "coin_purchase" && "เติมเหรียญ"}
                        {tx.type === "chapter_unlock" && "ปลดล็อกตอน"}
                        {tx.type === "admin_grant" && "ได้รับจากระบบ"}
                        {tx.type === "refund" && "คืนเงิน"}
                      </div>
                      <div className="text-xs text-gray-500">{tx.note || "-"}</div>
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${tx.amount > 0 ? "text-green-400" : "text-red-400"
                      }`}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString("th-TH")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}

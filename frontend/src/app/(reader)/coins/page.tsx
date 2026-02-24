"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  CheckCircle2,
  Coins,
  History,
  Loader2,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  confirmCheckoutPayment,
  createCheckoutSession,
  getMe,
  getMyTransactions,
  getPackages,
} from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";
import type { Transaction, User, CoinPackage } from "@/lib/types";

const TX_LABEL: Record<string, string> = {
  coin_purchase: "ซื้อเหรียญ",
  chapter_unlock: "ปลดล็อกตอน",
  admin_grant: "Admin เติม",
  refund: "คืนเงิน",
};

function CoinsPageInner() {
  const searchParams = useSearchParams();
  const { getToken, isLoaded } = useAuth();

  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const prevBalanceRef = useRef<number | null>(null);

  const paymentStatus = searchParams.get("success")
    ? "success"
    : searchParams.get("canceled")
      ? "canceled"
      : null;
  const checkoutSessionId = searchParams.get("session_id");

  const fetchUserData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return null;
      const [me, txs, pkgs] = await Promise.all([
        getMe(token),
        getMyTransactions(token, 20),
        getPackages(),
      ]);
      setUser(me);
      setTransactions(txs);
      setPackages(pkgs);

      // Notify Navbar to update balance (e.g., after a successful poll)
      window.dispatchEvent(new Event("balance-update"));

      return me;
    } catch (err) {
      console.error("Failed to load coins page:", err);
      return null;
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    fetchUserData()
      .then((me) => {
        // Capture the pre-payment balance so the poller knows when it truly changes
        if (me !== null) prevBalanceRef.current = me.coin_balance;
      })
      .finally(() => setLoading(false));
  }, [isLoaded, fetchUserData]);

  const confirmAndRefreshPayment = useCallback(async (): Promise<boolean> => {
    try {
      let confirmStatus: string | null = null;
      let confirmNewBalance: number | undefined;

      if (checkoutSessionId) {
        const token = await getToken();
        if (!token) return true;

        const confirm = await confirmCheckoutPayment(checkoutSessionId, token);
        confirmStatus = confirm.status;
        confirmNewBalance = confirm.new_balance;
      }

      const me = await fetchUserData();
      const balanceChanged =
        me !== null &&
        prevBalanceRef.current !== null &&
        me.coin_balance !== prevBalanceRef.current;

      if (confirmStatus === "success") return true;
      if (confirmStatus === "ignored" && typeof confirmNewBalance === "number") return true;
      if (balanceChanged) return true;

      return false;
    } catch (err) {
      console.error("Failed to confirm checkout payment:", err);
      const me = await fetchUserData();
      return (
        me !== null &&
        prevBalanceRef.current !== null &&
        me.coin_balance !== prevBalanceRef.current
      );
    }
  }, [checkoutSessionId, fetchUserData, getToken]);

  // Confirm + poll every 2 seconds after successful payment until balance is updated.
  useEffect(() => {
    if (paymentStatus !== "success" || !isLoaded) return;

    setIsRefreshing(true);
    let cancelled = false;
    let attempts = 0;
    const MAX = 15; // up to 30 seconds
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const run = async () => {
      attempts++;
      const done = await confirmAndRefreshPayment();

      if (cancelled) return;

      if (done || attempts >= MAX) {
        setIsRefreshing(false);
        return;
      }

      timeoutId = setTimeout(run, 2000);
    };

    void run();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      setIsRefreshing(false);
    };
  }, [paymentStatus, isLoaded, confirmAndRefreshPayment]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await confirmAndRefreshPayment();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCheckout = async () => {
    if (!selectedPackage) {
      setError("กรุณาเลือกแพ็กเกจที่ต้องการเติม");
      return;
    }
    setError(null);
    try {
      setBuying(true);
      const token = await getToken();
      if (!token) return;
      const { url } = await createCheckoutSession(selectedPackage.id, token);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "ไม่สามารถสร้างรายการชำระเงินได้");
    } finally {
      setBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,168,67,0.12),transparent_60%)]" />

      <div className="relative mx-auto max-w-2xl px-4 py-8 pb-24 sm:px-6 sm:pb-10">

        {/* Payment status banners */}
        {paymentStatus === "success" && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5 text-emerald-300">
            <div className="flex items-start gap-3">
              {isRefreshing ? (
                <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              <div>
                <p className="font-semibold">ชำระเงินสำเร็จ!</p>
                <p className="text-sm opacity-80">
                  {isRefreshing ? "กำลังอัปเดตยอดเหรียญ..." : "เหรียญอัปเดตแล้ว!"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="shrink-0 rounded-lg border border-emerald-500/40 px-3 py-1 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        )}
        {paymentStatus === "canceled" && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3.5 text-yellow-300">
            <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-sm">ยกเลิกการชำระเงินแล้ว — คุณสามารถลองอีกครั้งได้เลย</p>
          </div>
        )}

        {/* Balance card */}
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/15 via-surface-100 to-surface-200 px-5 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/20">
              {isRefreshing ? (
                <Loader2 className="h-7 w-7 animate-spin text-gold" />
              ) : (
                <Coins className="h-7 w-7 text-gold" />
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">
                {isRefreshing ? "กำลังอัปเดต..." : "ยอดเหรียญคงเหลือ"}
              </p>
              <p className="text-4xl font-bold text-gold">
                {user ? formatNumber(user.coin_balance) : "0"}
              </p>
            </div>
          </div>
          {isRefreshing && (
            <p className="text-xs text-emerald-400 animate-pulse">รอสักครู…</p>
          )}
        </div>

        {/* Top-up card */}
        <section className="rounded-3xl border border-white/10 bg-surface-100/80 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:p-6">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-gold" />
            <h2 className="text-lg font-semibold text-white">เติมเครดิต</h2>
          </div>
          <p className="mb-5 text-xs text-gray-400">
            เลือกแพ็กเกจที่ต้องการเติม — ยิ่งเติมแพ็กเกจใหญ่ ยิ่งได้โบนัสสุดคุ้ม
          </p>

          {/* Preset chips */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {packages.map((pkg) => {
              const active = selectedPackage?.id === pkg.id;
              const priceBaht = pkg.price_thb / 100;
              const hasBonus = pkg.coins > priceBaht;
              const bonusAmount = pkg.coins - priceBaht;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => {
                    setSelectedPackage(pkg);
                    setError(null);
                  }}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border p-4 text-center transition ${active
                    ? "border-gold bg-gold/15 text-white shadow-[0_0_15px_rgba(212,168,67,0.2)]"
                    : "border-white/10 bg-surface-200/70 text-gray-300 hover:border-gold/40 hover:bg-surface-50"
                    }`}
                >
                  <p className="text-xl font-bold text-white">฿{formatNumber(priceBaht)}</p>
                  <p className="mt-1 text-sm font-semibold text-gold">{pkg.coins} เหรียญ</p>
                  {hasBonus && (
                    <span className="mt-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                      แถมโบนัส {formatNumber(bonusAmount)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {packages.length === 0 && (
            <div className="mb-6 rounded-xl border border-dashed border-white/10 py-8 text-center text-sm text-gray-500">
              ไม่มีแพ็กเกจให้เลือกในขณะนี้
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleCheckout}
            disabled={buying || !selectedPackage}
            className="w-full rounded-2xl bg-gold py-3.5 text-base font-semibold text-black shadow-[0_8px_30px_rgba(212,168,67,0.3)] transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            {buying ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                กำลังเชื่อมต่อ Stripe...
              </span>
            ) : selectedPackage ? (
              `ชำระเงิน ฿${formatNumber(selectedPackage.price_thb)} → รับ ${formatNumber(selectedPackage.coins)} เหรียญ`
            ) : (
              "กรุณาเลือกแพ็กเกจ"
            )}
          </button>

          <p className="mt-4 text-center text-xs text-gray-400">
            ชำระผ่าน Stripe — รองรับบัตรเครดิต/เดบิต และ PromptPay
          </p>
        </section>

        {/* Transaction history */}
        <section className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <History className="h-5 w-5 text-gold" />
            ประวัติการทำรายการ
          </h2>
          {transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl bg-surface-100/60 px-4 py-3 ring-1 ring-white/5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tx.amount >= 0 ? "bg-emerald-500/10" : "bg-gold/10"
                        }`}
                    >
                      <Coins
                        className={`h-4 w-4 ${tx.amount >= 0 ? "text-emerald-400" : "text-gold"
                          }`}
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-white">
                        {TX_LABEL[tx.type] || tx.type}
                      </p>
                      {tx.note && (
                        <p className="truncate text-xs text-gray-500">{tx.note}</p>
                      )}
                    </div>
                  </div>
                  <div className="ml-3 shrink-0 text-right">
                    <p
                      className={`text-sm font-semibold ${tx.amount >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                    >
                      {tx.amount >= 0 ? "+" : ""}
                      {formatNumber(tx.amount)}
                    </p>
                    <p className="text-[10px] text-gray-600">
                      {formatDate(tx.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-surface-100/60 py-12 text-center ring-1 ring-white/5">
              <Coins className="mx-auto mb-2 h-8 w-8 text-gray-600" />
              <p className="text-sm text-gray-500">ยังไม่มีรายการ</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function CoinsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
        </div>
      }
    >
      <CoinsPageInner />
    </Suspense>
  );
}

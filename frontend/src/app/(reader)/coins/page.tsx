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
  createCustomCheckout,
  getMe,
  getMyTransactions,
} from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/utils";
import type { Transaction, User } from "@/lib/types";

// ── Coin calculation (mirrors backend calculate_coins) ──────────────────────
const BONUS_MAP: Record<number, number> = { 50: 55, 100: 120, 150: 170 };

function calculateCoins(amountThb: number): number {
  const a = Math.floor(amountThb);
  if (a <= 0) return 0;
  return BONUS_MAP[a] ?? a; // preset amounts get bonus, everything else is 1:1
}

function getBonusCoins(amountThb: number): number {
  const a = Math.floor(amountThb);
  return (BONUS_MAP[a] ?? a) - a;
}

// ── Preset suggestions ───────────────────────────────────────────────────────
const PRESETS = [
  { amountThb: 50, coins: 55, bonusPct: 10, recommended: false },
  { amountThb: 100, coins: 120, bonusPct: 20, recommended: true },
  { amountThb: 150, coins: 170, bonusPct: 13, recommended: false },
] as const;

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
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rawInput, setRawInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
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
      const [me, txs] = await Promise.all([
        getMe(token),
        getMyTransactions(token, 20),
      ]);
      setUser(me);
      setTransactions(txs);
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

  const amountThb = useMemo(() => {
    const n = parseInt(rawInput, 10);
    return isNaN(n) || n < 0 ? 0 : n;
  }, [rawInput]);

  const coinsPreview = useMemo(() => calculateCoins(amountThb), [amountThb]);
  const bonusCoins = useMemo(() => getBonusCoins(amountThb), [amountThb]);
  const baseCoins = coinsPreview - bonusCoins;

  const handlePreset = (amount: number) => {
    setRawInput(String(amount));
    inputRef.current?.focus();
  };

  const handleCheckout = async () => {
    if (amountThb < 20) {
      setError("จำนวนเงินขั้นต่ำ 20 บาท");
      return;
    }
    setError(null);
    try {
      setBuying(true);
      const token = await getToken();
      if (!token) return;
      const { url } = await createCustomCheckout(amountThb, token);
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
            <h2 className="text-lg font-semibold text-white">เติมเหรียญ</h2>
          </div>
          <p className="mb-5 text-xs text-gray-400">
            ระบุจำนวนเงิน (บาท) ที่ต้องการเติม — ยิ่งเติมมาก ยิ่งได้โบนัสสูง
          </p>

          {/* Preset chips */}
          <div className="mb-4 grid grid-cols-3 gap-2.5">
            {PRESETS.map((p) => {
              const active = amountThb === p.amountThb;
              return (
                <button
                  key={p.amountThb}
                  type="button"
                  onClick={() => handlePreset(p.amountThb)}
                  className={`relative rounded-2xl border px-3 py-3 text-center transition ${active
                    ? "border-gold bg-gold/15 text-white"
                    : "border-white/10 bg-surface-200/70 text-gray-300 hover:border-gold/40 hover:bg-surface-50"
                    }`}
                >
                  {p.recommended && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-black">
                      <Sparkles className="mr-0.5 mb-px inline-block h-2.5 w-2.5" />
                      แนะนำ
                    </span>
                  )}
                  <p className="text-lg font-bold text-white">฿{p.amountThb}</p>
                  <p className="text-xs text-gold">{p.coins} เหรียญ</p>
                  <span className="mt-1 inline-block rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                    +{p.bonusPct}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom amount input */}
          <div className="relative mb-4">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-gray-400">
              ฿
            </span>
            <input
              ref={inputRef}
              type="number"
              inputMode="numeric"
              min={20}
              placeholder="ระบุจำนวนเงิน..."
              value={rawInput}
              onChange={(e) => {
                setRawInput(e.target.value);
                setError(null);
              }}
              className="w-full rounded-2xl border border-white/10 bg-surface-200/80 py-4 pl-10 pr-4 text-xl font-semibold text-white placeholder:text-gray-600 focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/40"
            />
          </div>

          {/* Coin preview */}
          {amountThb >= 1 && (
            <div className="mb-5 rounded-2xl border border-white/10 bg-surface-200/60 px-4 py-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">คุณจะได้รับ</span>
                <span className="text-2xl font-bold text-gold">
                  {formatNumber(coinsPreview)} เหรียญ
                </span>
              </div>
              {bonusCoins > 0 && (
                <div className="mt-1.5 flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {formatNumber(baseCoins)} + โบนัส {formatNumber(bonusCoins)} เหรียญ
                  </span>
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-400">
                    ได้พิเศษ!
                  </span>
                </div>
              )}
              {amountThb > 0 && !BONUS_MAP[amountThb] && (
                <p className="mt-1.5 text-xs text-gray-500">
                  เติม ฿50 / ฿100 / ฿150 เพื่อรับโบนัสเหรียญพิเศษ
                </p>
              )}
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
            disabled={buying || amountThb <= 0}
            className="w-full rounded-2xl bg-gold py-3.5 text-base font-semibold text-black shadow-[0_8px_30px_rgba(212,168,67,0.3)] transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            {buying ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                กำลังเชื่อมต่อ Stripe...
              </span>
            ) : amountThb > 0 ? (
              `เติม ฿${formatNumber(amountThb)} → รับ ${formatNumber(coinsPreview)} เหรียญ`
            ) : (
              "ระบุจำนวนเงินเพื่อเติมเหรียญ"
            )}
          </button>

          <p className="mt-3 text-center text-xs text-gray-600">
            ชำระผ่าน Stripe — รองรับบัตรเครดิต/เดบิต และ PromptPay
          </p>
        </section>

        <p className="mt-6 text-center text-xs text-gray-600">
          ราคาอื่น ๆ คิดเรท 1 บาท = 1 เหรียญ (ไม่มีโบนัส)
        </p>

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

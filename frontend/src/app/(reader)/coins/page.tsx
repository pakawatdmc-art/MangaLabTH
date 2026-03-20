"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  CheckCircle2,
  Coins,
  History,
  Loader2,
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

  const [paymentMethod, setPaymentMethod] = useState<"truewallet" | "qr">("truewallet");
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [activeReferenceNo, setActiveReferenceNo] = useState<string | null>(null);

  const paymentStatus = searchParams.get("status") === "processing"
    ? "processing"
    : searchParams.get("success")
      ? "success"
      : searchParams.get("canceled")
        ? "canceled"
        : null;
  const currentReferenceNo = searchParams.get("reference_no");

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

  useEffect(() => {
    if (currentReferenceNo) {
      setActiveReferenceNo(currentReferenceNo);
    }
  }, [currentReferenceNo]);

  const confirmAndRefreshPayment = useCallback(async (refNo: string): Promise<boolean> => {
    try {
      let confirmStatus: string | null = null;
      let confirmNewBalance: number | undefined;

      const token = await getToken();
      if (!token) return true;

      const confirm = await confirmCheckoutPayment(refNo, token);
      confirmStatus = confirm.status;
      confirmNewBalance = confirm.new_balance;

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
  }, [currentReferenceNo, fetchUserData, getToken]);

  // Poll every 2 seconds if status is processing or QR is active until balance is updated.
  useEffect(() => {
    const isProcessing = paymentStatus === "processing";
    const hasQR = !!qrCodeData;

    if ((!isProcessing && !hasQR) || !activeReferenceNo || !isLoaded) return;

    setIsRefreshing(true);
    let cancelled = false;
    let attempts = 0;
    const MAX = 15; // up to 30 seconds
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const run = async () => {
      attempts++;
      const done = await confirmAndRefreshPayment(activeReferenceNo);

      if (cancelled) return;

      if (done || attempts >= MAX) {
        setIsRefreshing(false);
        // If it was a QR code and it's done, clear it
        if (done && hasQR) {
          setQrCodeData(null);
          setActiveReferenceNo(null);
        }
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
    if (!activeReferenceNo) return;
    setIsRefreshing(true);
    try {
      const done = await confirmAndRefreshPayment(activeReferenceNo);
      if (done && qrCodeData) {
        setQrCodeData(null);
        setActiveReferenceNo(null);
      }
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
    setQrCodeData(null);
    try {
      setBuying(true);
      const token = await getToken();
      if (!token) return;

      const res = await createCheckoutSession(selectedPackage.id, paymentMethod, token);

      if (res.type === "qr" && res.qr_data) {
        // QR Code: Server returns base64 PNG image inline
        setQrCodeData(res.qr_data);
        setActiveReferenceNo(res.reference_no || null);
      } else if (res.type === "truewallet_form" && res.action_url && res.parameters) {
        // TrueWallet: Browser must POST form directly to FFP
        const form = document.createElement("form");
        form.method = "POST";
        form.action = res.action_url;

        for (const [key, value] of Object.entries(res.parameters)) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = key;
          input.value = String(value);
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
      } else {
        throw new Error("รูปแบบการตอบกลับจากระบบชำระเงินไม่ถูกต้อง");
      }
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
        {paymentStatus === "processing" && (
          <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3.5 text-emerald-300">
            <div className="flex items-start gap-3">
              {isRefreshing ? (
                <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              <div>
                <p className="font-semibold">กำลังตรวจสอบรายการ...</p>
                <p className="text-sm opacity-80">
                  {isRefreshing ? "กำลังอัปเดตยอดเหรียญ..." : "รอการยืนยันจากระบบชำระเงิน"}
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
            1. เลือกแพ็กเกจที่ต้องการเติม
          </p>

          {/* Preset chips */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {packages.map((pkg) => {
              const active = selectedPackage?.id === pkg.id;
              const priceBaht = pkg.price_thb;
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

          <div className="mb-6">
            <p className="mb-3 text-xs text-gray-400">2. เลือกช่องทางการชำระเงิน</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("truewallet")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition ${paymentMethod === "truewallet"
                  ? "border-orange-500 bg-orange-500/10 text-orange-400"
                  : "border-white/10 bg-surface-200/50 text-gray-400 hover:border-orange-500/50"
                  }`}
              >
                TrueMoney Wallet
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("qr")}
                className={`flex items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition ${paymentMethod === "qr"
                  ? "border-blue-500 bg-blue-500/10 text-blue-400"
                  : "border-white/10 bg-surface-200/50 text-gray-400 hover:border-blue-500/50"
                  }`}
              >
                QR Code
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={buying || !selectedPackage}
            className="w-full rounded-2xl bg-gold py-3.5 text-base font-semibold text-black shadow-[0_8px_30px_rgba(212,168,67,0.3)] transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
          >
            {buying ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                กำลังเปิดระบบชำระเงิน...
              </span>
            ) : selectedPackage ? (
              `ชำระเงิน ฿${formatNumber(selectedPackage.price_thb)} → รับ ${formatNumber(selectedPackage.coins)} เหรียญ`
            ) : (
              "กรุณาเลือกแพ็กเกจ"
            )}
          </button>

          {qrCodeData && (
            <div className="mt-6 flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white p-6 shadow-2xl">
              <div className="mb-4 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                <p className="text-sm font-bold text-gray-900 italic tracking-tight">กำลังรอการชำระเงิน...</p>
              </div>

              {qrCodeData.startsWith("data:image") ? (
                <div className="group relative mx-auto flex w-64 h-64 sm:w-72 sm:h-72 items-center justify-center overflow-hidden bg-white rounded-2xl border-4 border-emerald-500/20 shadow-inner p-2">
                  <img src={qrCodeData} alt="QR Code" className="w-full h-full object-contain transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
                </div>
              ) : (
                <div className="mx-auto flex h-64 w-64 sm:h-72 sm:w-72 items-center justify-center bg-gray-50 text-gray-800 break-words text-[10px] p-4 overflow-hidden border border-gray-200 rounded-2xl">
                  {qrCodeData}
                </div>
              )}

              <div className="mt-5 space-y-2">
                <p className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full inline-block">
                  แสกนได้ทันทีผ่านทุก App ธนาคาร
                </p>
                <p className="text-xs text-gray-400">
                  โปรดรอสักครู่หลังจากสแกนสำเร็จ ยอดเหรียญจะอัปเดตอัตโนมัติ
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setQrCodeData(null);
                  setActiveReferenceNo(null);
                }}
                className="mt-6 text-xs font-semibold text-gray-400 hover:text-red-400 transition"
              >
                ยกเลิกรายการนี้
              </button>
            </div>
          )}

          <p className="mt-4 text-center text-xs text-gray-400">
            ชำระผ่าน FeelFreePay — ปลอดภัยและรวดเร็ว
          </p>
        </section>

        {/* Transaction history */}
        <section className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <History className="h-5 w-5 text-gold" />
            ประวัติการทำรายการ
          </h2>
          {transactions.filter(tx => !(tx.type === "coin_purchase" && tx.balance_after === 0)).length > 0 ? (
            <div className="space-y-2">
              {transactions.filter(tx => !(tx.type === "coin_purchase" && tx.balance_after === 0)).map((tx) => (
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

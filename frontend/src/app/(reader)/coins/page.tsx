"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  CheckCircle2,
  Coins,
  History,
  Loader2,
  XCircle,
  Sparkles,
  Zap,
  QrCode,
  Wallet,
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
      const token = await getToken();
      if (!token) return true;

      const confirm = await confirmCheckoutPayment(refNo, token);
      const confirmStatus = confirm.status;
      const confirmNewBalance = confirm.new_balance;

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
  }, [fetchUserData, getToken]);

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
        <div className="relative mb-10 overflow-hidden rounded-[2rem] border border-white/10 bg-surface-100/40 px-6 py-8 sm:px-8 shadow-2xl">
          {/* Glass glare effect */}
          <div className="absolute -left-[20%] -top-[50%] h-[200%] w-[50%] rotate-45 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />
          
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="relative flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/30 to-gold/5 border border-gold/20 shadow-inner">
                {isRefreshing ? (
                  <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 animate-spin text-gold" />
                ) : (
                  <Coins className="h-8 w-8 sm:h-10 sm:w-10 text-gold drop-shadow-[0_0_10px_rgba(212,168,67,0.8)]" />
                )}
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-400">
                  {isRefreshing ? "กำลังอัปเดต..." : "ยอดเหรียญคงเหลือ"}
                </p>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-4xl sm:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold to-gold-dark drop-shadow-sm">
                    {user ? formatNumber(user.coin_balance) : "0"}
                  </p>
                  <span className="text-sm font-bold text-gold/70">C</span>
                </div>
              </div>
            </div>
            {isRefreshing && (
              <p className="hidden sm:block rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400 animate-pulse border border-emerald-500/20">
                กำลัง Sync...
              </p>
            )}
          </div>
        </div>

        {/* Top-up section */}
        <section className="relative">
          
          <div className="relative mb-4 flex items-center gap-2.5 px-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20">
              <Sparkles className="h-4 w-4 text-gold" />
            </div>
            <h2 className="text-[19px] sm:text-xl font-bold text-white tracking-tight">เลือกแพ็กเกจสุดคุ้ม</h2>
          </div>
          <p className="mb-8 text-sm text-gray-400 px-3">
            เติมเหรียญเพื่อสนับสนุนนักเขียนและปลดล็อกตอนพิเศษ
          </p>

          {/* Preset chips */}
          <div className="relative mb-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
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
                  className={`group relative flex flex-col items-center justify-center rounded-3xl border transition-all duration-300 overflow-hidden ${
                    active
                      ? "border-gold bg-surface-100 ring-1 ring-gold shadow-[0_0_20px_rgba(212,168,67,0.15)] scale-[1.02]"
                      : "border-white/5 bg-surface-100/40 text-gray-300 hover:border-white/20 hover:bg-surface-100 hover:-translate-y-1"
                    }`}
                >
                  {/* Subtle active glow inside card */}
                  {active && <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,168,67,0.08),transparent_70%)] pointer-events-none" />}
                  
                  {hasBonus && (
                    <div className="absolute top-0 right-0 z-10 flex items-center justify-center rounded-bl-2xl bg-emerald-500 px-3 py-1.5 shadow-lg shadow-emerald-500/20">
                      <span className="text-[10px] sm:text-[11px] font-bold text-black tracking-wide">
                        โบนัส +{formatNumber(bonusAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex w-full flex-col px-4 py-8 sm:py-10 items-center z-0">
                    <Coins className={`h-8 w-8 sm:h-10 sm:w-10 transition-all duration-300 ${active ? "text-gold drop-shadow-[0_0_12px_rgba(212,168,67,0.8)] scale-110" : "text-gray-500 group-hover:text-gold/80"}`} />
                    <p className={`mt-3 text-[1.35rem] sm:text-2xl font-black tracking-tight ${active ? "text-white" : "text-gray-100"}`}>
                      ฿{formatNumber(priceBaht)}
                    </p>
                    <p className={`mt-1 text-xs sm:text-sm font-bold ${active ? "text-gold" : "text-gold/70"}`}>
                      {pkg.coins} <span className="opacity-90">เหรียญ</span>
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {packages.length === 0 && (
            <div className="mb-6 rounded-2xl border border-dashed border-white/10 py-12 text-center text-sm text-gray-500">
              ไม่มีแพ็กเกจให้เลือกในขณะนี้
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          <div className="relative mb-10 px-2 mt-4">
            <div className="mb-4 flex items-center gap-2 text-sm text-gray-400">
              <Wallet className="h-4 w-4" />
              <span className="font-medium">เลือกช่องทางการชำระเงิน</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod("truewallet")}
                className={`flex items-center justify-center gap-2.5 rounded-2xl border p-3.5 sm:p-4 text-sm font-semibold transition-all ${
                  paymentMethod === "truewallet"
                    ? "border-orange-500 bg-gradient-to-b from-orange-500/20 to-orange-500/5 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)] scale-[1.02]"
                    : "border-white/5 bg-surface-200/50 text-gray-400 hover:border-white/20 hover:bg-surface-200"
                  }`}
              >
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${paymentMethod === "truewallet" ? "bg-orange-500 text-white shadow-sm" : "bg-surface-50 text-gray-500"}`}>
                  <span className="text-[10px] font-black tracking-tighter">TM</span>
                </div>
                TrueMoney
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("qr")}
                className={`flex items-center justify-center gap-2.5 rounded-2xl border p-3.5 sm:p-4 text-sm font-semibold transition-all ${
                  paymentMethod === "qr"
                    ? "border-blue-500 bg-gradient-to-b from-blue-500/20 to-blue-500/5 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)] scale-[1.02]"
                    : "border-white/5 bg-surface-200/50 text-gray-400 hover:border-white/20 hover:bg-surface-200"
                  }`}
              >
                <div className={`flex h-6 w-6 items-center justify-center rounded-full ${paymentMethod === "qr" ? "bg-blue-500 text-white shadow-sm" : "bg-surface-50 text-gray-500"}`}>
                  <QrCode className="h-3.5 w-3.5" />
                </div>
                QR PromptPay
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={buying || !selectedPackage}
            className={`group relative w-full overflow-hidden rounded-[1.25rem] py-4 text-base sm:text-lg font-bold transition-all duration-300 ${
              selectedPackage && !buying
                ? "bg-gradient-to-r from-gold-dark via-gold to-gold-light text-black shadow-[0_0_30px_rgba(212,168,67,0.4)] hover:shadow-[0_0_40px_rgba(212,168,67,0.6)] hover:scale-[1.01]"
                : "bg-surface-200 text-gray-500 cursor-not-allowed border border-white/5"
            }`}
          >
            {/* Shimmer effect for active button */}
            {selectedPackage && !buying && (
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-all duration-1000 ease-in-out group-hover:translate-x-full" />
            )}
            
            <div className="relative flex items-center justify-center gap-2">
              {buying ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  กำลังเชื่อมต่อตู้รับชำระเงิน...
                </>
              ) : selectedPackage ? (
                <>
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6 fill-black/20 text-black/40" />
                  ชำระเงิน ฿{formatNumber(selectedPackage.price_thb)}
                  <span className="mx-1 opacity-40 font-normal">|</span>
                  รับ {formatNumber(selectedPackage.coins)} <Coins className="h-4 w-4 sm:h-5 sm:w-5 inline ml-0.5" />
                </>
              ) : (
                "กรุณาเลือกตระกร้าเหรียญ"
              )}
            </div>
          </button>

          {qrCodeData && (
            <div className="mt-8 flex flex-col items-center justify-center rounded-[2rem] border border-white/10 bg-white p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400" />
              <div className="mb-5 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
                </div>
                <p className="text-base font-bold text-gray-900 tracking-tight">กำลังรอการชำระเงิน...</p>
              </div>

              {qrCodeData.startsWith("data:image") ? (
                <div className="group relative mx-auto flex w-64 h-64 sm:w-72 sm:h-72 items-center justify-center overflow-hidden bg-white rounded-2xl border-2 border-emerald-500/20 shadow-lg shadow-emerald-500/5 p-2 transition-all hover:border-emerald-500/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCodeData} alt="QR Code" className="w-full h-full object-contain transition duration-500 group-hover:scale-[1.02]" />
                  <div className="absolute inset-0 bg-emerald-500/5 pointer-events-none" />
                </div>
              ) : (
                <div className="mx-auto flex h-64 w-64 sm:h-72 sm:w-72 items-center justify-center bg-gray-50 text-gray-800 break-words text-[10px] p-4 overflow-hidden border border-gray-200 rounded-2xl">
                  {qrCodeData}
                </div>
              )}

              <div className="mt-6 space-y-2 text-center">
                <p className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-4 py-1.5 rounded-full inline-block">
                  ⚡ แสกนได้ทันทีผ่านทุก App ธนาคาร
                </p>
                <p className="text-xs text-gray-500 max-w-xs mx-auto pt-2">
                  โปรดรอสักครู่หลังจากสแกนสำเร็จ ยอดเหรียญจะอัปเดตอัตโนมัติ
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setQrCodeData(null);
                  setActiveReferenceNo(null);
                }}
                className="mt-6 rounded-full px-4 py-2 text-xs font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
              >
                ยกเลิกรายการนี้
              </button>
            </div>
          )}

          <div className="mt-8 flex items-center justify-center gap-2 opacity-60">
            <CheckCircle2 className="h-3.5 w-3.5 text-gray-400" />
            <p className="text-center text-[11px] font-medium text-gray-400 uppercase tracking-wide">
              Secure Payment via FeelFreePay
            </p>
          </div>
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

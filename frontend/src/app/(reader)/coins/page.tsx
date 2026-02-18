"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Coins, CreditCard, History, Loader2, Sparkles } from "lucide-react";
import { getMe, getMyTransactions, getPackages, createCheckoutSession } from "@/lib/api";
import { formatNumber, formatDate } from "@/lib/utils";
import type { User, Transaction, CoinPackage } from "@/lib/types";

const FALLBACK_PACKAGES = [
  { id: "1", name: "Starter", coins: 50, price_thb: 29, stripe_price_id: "", is_active: true, sort_order: 1 },
  { id: "2", name: "Standard", coins: 150, price_thb: 79, stripe_price_id: "", is_active: true, sort_order: 2 },
  { id: "3", name: "Premium", coins: 350, price_thb: 159, stripe_price_id: "", is_active: true, sort_order: 3 },
  { id: "4", name: "Mega", coins: 800, price_thb: 299, stripe_price_id: "", is_active: true, sort_order: 4 },
];

export default function CoinsPage() {
  const { getToken, isLoaded } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    (async () => {
      try {
        const token = await getToken();

        // Fetch packages (public endpoint)
        let pkgs: CoinPackage[] = [];
        try {
          pkgs = await getPackages();
        } catch {
          // API unavailable — use fallback
        }
        setPackages(pkgs.length > 0 ? pkgs : FALLBACK_PACKAGES as unknown as CoinPackage[]);

        // Fetch user + transactions if authenticated
        if (token) {
          const [me, txs] = await Promise.all([
            getMe(token),
            getMyTransactions(token, 20),
          ]);
          setUser(me);
          setTransactions(txs);
        }
      } catch (err) {
        console.error("Failed to load coins page:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, getToken]);

  const handleBuy = async (pkg: CoinPackage) => {
    if (!pkg.stripe_price_id) {
      alert("แพ็กเกจนี้ยังไม่พร้อมใช้งาน — กรุณาตั้งค่า Stripe ก่อน");
      return;
    }
    try {
      setBuying(pkg.id);
      const token = await getToken();
      if (!token) return;
      const { url } = await createCheckoutSession(pkg.id, token);
      window.location.href = url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "ไม่สามารถสร้างรายการชำระเงินได้");
    } finally {
      setBuying(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  const txTypeLabel: Record<string, string> = {
    coin_purchase: "ซื้อเหรียญ",
    chapter_unlock: "ปลดล็อกตอน",
    admin_grant: "Admin เติม",
    refund: "คืนเงิน",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Balance card */}
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-gold/20 via-surface-100 to-surface-200 p-6 ring-1 ring-gold/20">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/20">
            <Coins className="h-6 w-6 text-gold" />
          </div>
          <div>
            <p className="text-xs text-gray-400">ยอดเหรียญคงเหลือ</p>
            <p className="text-3xl font-bold text-gold">
              {user ? formatNumber(user.coin_balance) : "0"}
            </p>
          </div>
        </div>
      </div>

      {/* Packages */}
      <section className="mb-10">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <CreditCard className="h-5 w-5 text-gold" />
          เติมเหรียญ
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {packages.map((pkg, idx) => (
            <button
              key={pkg.id}
              onClick={() => handleBuy(pkg)}
              disabled={buying === pkg.id}
              className={`relative rounded-xl p-4 text-center ring-1 transition hover:ring-gold/50 disabled:opacity-50 ${
                idx === 1
                  ? "bg-gold/10 ring-gold/30"
                  : "bg-surface-100 ring-white/10 hover:bg-surface-50"
              }`}
            >
              {idx === 1 && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-black">
                  <Sparkles className="mr-0.5 inline-block h-3 w-3" />
                  แนะนำ
                </span>
              )}
              <Coins className="mx-auto mb-2 h-8 w-8 text-gold" />
              <p className="text-xl font-bold text-white">{pkg.coins}</p>
              <p className="text-xs text-gray-400">เหรียญ</p>
              <p className="mt-2 text-sm font-semibold text-gold">
                ฿{formatNumber(pkg.price_thb)}
              </p>
              {buying === pkg.id && (
                <Loader2 className="mx-auto mt-2 h-4 w-4 animate-spin text-gold" />
              )}
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
        {transactions.length > 0 ? (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-xl bg-surface-100/60 px-4 py-3 ring-1 ring-white/5"
              >
                <div className="flex items-center gap-3">
                  <Coins className="h-4 w-4 text-gold" />
                  <div>
                    <p className="text-sm text-white">
                      {txTypeLabel[tx.type] || tx.type}
                    </p>
                    {tx.note && (
                      <p className="text-xs text-gray-500">{tx.note}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${tx.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {tx.amount >= 0 ? "+" : ""}{formatNumber(tx.amount)}
                  </p>
                  <p className="text-[10px] text-gray-600">{formatDate(tx.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl bg-surface-100/60 py-12 text-center ring-1 ring-white/5">
            <p className="text-sm text-gray-500">ยังไม่มีรายการ</p>
          </div>
        )}
      </section>
    </div>
  );
}

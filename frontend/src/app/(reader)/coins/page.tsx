"use client";

import { Coins, CreditCard, History, Sparkles } from "lucide-react";
import { useState } from "react";

const PACKAGES = [
  { id: "1", name: "Starter", coins: 50, price: 29, popular: false },
  { id: "2", name: "Standard", coins: 150, price: 79, popular: true },
  { id: "3", name: "Premium", coins: 350, price: 159, popular: false },
  { id: "4", name: "Mega", coins: 800, price: 299, popular: false },
];

export default function CoinsPage() {
  const [balance] = useState(0);

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
            <p className="text-3xl font-bold text-gold">{balance}</p>
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
          {PACKAGES.map((pkg) => (
            <button
              key={pkg.id}
              className={`relative rounded-xl p-4 text-center ring-1 transition hover:ring-gold/50 ${
                pkg.popular
                  ? "bg-gold/10 ring-gold/30"
                  : "bg-surface-100 ring-white/10 hover:bg-surface-50"
              }`}
            >
              {pkg.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-black">
                  <Sparkles className="mr-0.5 inline-block h-3 w-3" />
                  แนะนำ
                </span>
              )}
              <Coins className="mx-auto mb-2 h-8 w-8 text-gold" />
              <p className="text-xl font-bold text-white">{pkg.coins}</p>
              <p className="text-xs text-gray-400">เหรียญ</p>
              <p className="mt-2 text-sm font-semibold text-gold">
                ฿{pkg.price}
              </p>
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
        <div className="rounded-xl bg-surface-100/60 py-12 text-center ring-1 ring-white/5">
          <p className="text-sm text-gray-500">ยังไม่มีรายการ</p>
        </div>
      </section>
    </div>
  );
}

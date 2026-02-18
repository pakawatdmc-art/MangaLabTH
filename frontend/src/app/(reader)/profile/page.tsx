"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { getMe, getMyTransactions } from "@/lib/api";
import type { User, Transaction } from "@/lib/types";
import { formatNumber, formatDate } from "@/lib/utils";
import {
    Coins,
    History,
    Loader2,
    Lock,
    Mail,
    ShieldCheck,
    UserCircle,
} from "lucide-react";

export default function ProfilePage() {
    const { getToken, isLoaded } = useAuth();
    const [user, setUser] = useState<User | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isLoaded) return;
        (async () => {
            try {
                const token = await getToken();
                if (!token) return;
                const [me, txs] = await Promise.all([
                    getMe(token),
                    getMyTransactions(token, 20),
                ]);
                setUser(me);
                setTransactions(txs);
            } catch (err) {
                console.error("Failed to load profile:", err);
            } finally {
                setLoading(false);
            }
        })();
    }, [isLoaded, getToken]);

    if (loading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gold" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center px-4">
                <div className="text-center">
                    <UserCircle className="mx-auto mb-3 h-12 w-12 text-gray-600" />
                    <p className="text-gray-300">กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์</p>
                </div>
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
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
            {/* Profile card */}
            <section className="mb-8 rounded-2xl bg-surface-100/70 p-6 ring-1 ring-white/10">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                    {user.avatar_url ? (
                        <img
                            src={user.avatar_url}
                            alt={user.display_name}
                            className="h-20 w-20 rounded-full ring-2 ring-gold/30"
                        />
                    ) : (
                        <UserCircle className="h-20 w-20 text-gray-600" />
                    )}
                    <div className="flex-1 text-center sm:text-left">
                        <h1 className="text-2xl font-bold text-white">
                            {user.display_name || "ผู้ใช้งาน"}
                        </h1>
                        <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-sm text-gray-400 sm:justify-start">
                            <span className="flex items-center gap-1">
                                <Mail className="h-3.5 w-3.5" />
                                {user.email}
                            </span>
                            <span className="flex items-center gap-1">
                                <ShieldCheck className="h-3.5 w-3.5" />
                                {user.role === "admin" ? "แอดมิน" : "ผู้อ่าน"}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                            สมัครเมื่อ {formatDate(user.created_at)}
                        </p>
                    </div>
                    <div className="rounded-xl bg-gold/10 px-5 py-3 text-center ring-1 ring-gold/20">
                        <Coins className="mx-auto mb-1 h-5 w-5 text-gold" />
                        <p className="text-2xl font-bold text-gold">
                            {formatNumber(user.coin_balance)}
                        </p>
                        <p className="text-[10px] text-gold/70">เหรียญ</p>
                    </div>
                </div>
            </section>

            {/* Transaction history */}
            <section>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                    <History className="h-5 w-5 text-gold" />
                    ประวัติรายการ
                </h2>

                {transactions.length > 0 ? (
                    <div className="space-y-2">
                        {transactions.map((tx) => (
                            <div
                                key={tx.id}
                                className="flex items-center justify-between rounded-xl bg-surface-100/60 px-4 py-3 ring-1 ring-white/5"
                            >
                                <div className="flex items-center gap-3">
                                    {tx.type === "chapter_unlock" ? (
                                        <Lock className="h-4 w-4 text-purple-400" />
                                    ) : (
                                        <Coins className="h-4 w-4 text-gold" />
                                    )}
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
                                    <p
                                        className={`text-sm font-medium ${tx.amount >= 0 ? "text-emerald-400" : "text-red-400"
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
                        <History className="mx-auto mb-2 h-6 w-6 text-gray-600" />
                        <p className="text-sm text-gray-400">ยังไม่มีรายการ</p>
                    </div>
                )}
            </section>
        </div>
    );
}

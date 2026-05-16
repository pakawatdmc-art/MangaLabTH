"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Admin route error:", error);
    }, [error]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-surface-300 px-4 py-10">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#11131c]/90 p-6 text-center backdrop-blur-xl">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-400">
                    <AlertTriangle className="h-6 w-6" />
                </div>
                <h1 className="mt-4 text-base font-semibold text-white">
                    เกิดข้อผิดพลาดในแผงผู้ดูแลระบบ
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">
                    {error.message || "ไม่สามารถโหลดหน้านี้ได้ กรุณาลองใหม่อีกครั้ง"}
                </p>
                {error.digest && (
                    <p className="mt-3 font-mono text-[10px] text-gray-600">
                        Ref: {error.digest}
                    </p>
                )}
                <div className="mt-6 flex flex-col gap-2">
                    <button
                        onClick={reset}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-black transition hover:bg-gold-light"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        ลองใหม่
                    </button>
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-400 transition hover:border-white/20 hover:text-white"
                    >
                        <Home className="h-3.5 w-3.5" />
                        กลับหน้าหลัก
                    </Link>
                </div>
            </div>
        </div>
    );
}

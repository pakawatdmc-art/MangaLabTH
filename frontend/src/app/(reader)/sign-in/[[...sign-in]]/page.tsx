"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { HAS_CLERK } from "@/lib/clerk";
import { clerkAuthElements } from "@/lib/clerkAppearance";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-[85vh] items-center justify-center overflow-hidden py-10 sm:py-14 bg-white dark:bg-transparent">
      <section className="relative z-10 w-full max-w-[420px] px-4 sm:px-0">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            เข้าสู่ระบบ <span className="text-gold">MangaLabTH</span>
          </h1>
          <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            เลือกช่องทางเข้าสู่ระบบด้านล่าง<br />
            เพื่อเริ่มอ่านมังงะได้ทันที
          </p>
        </div>

        {!HAS_CLERK ? (
          <div className="mx-auto w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-white/5 dark:bg-surface-100/60">
            <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">ระบบเข้าสู่ระบบ</h2>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">ระบบ Authentication ยังไม่ได้ตั้งค่า</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-white transition hover:bg-gold-light shadow-md"
            >
              กลับหน้าแรก
            </Link>
          </div>
        ) : (
          <div id="clerk-social-only" className="relative flex justify-center">
            <SignIn
              appearance={{ elements: clerkAuthElements }}
              routing="hash"
            />
          </div>
        )}
      </section>
    </div>
  );
}

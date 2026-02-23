"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { HAS_CLERK } from "@/lib/clerk";
import { clerkAuthElements } from "@/lib/clerkAppearance";

export default function SignInPage() {
  return (
    <div className="relative overflow-hidden flex min-h-[70vh] items-center justify-center py-10 sm:py-14">
      {/* Background Ambience */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,168,67,0.15),transparent_50%)]" />

      <section className="relative z-10 w-full max-w-md px-4 sm:px-0">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold leading-tight text-white mb-2">
            ยินดีต้อนรับสู่ <span className="text-gold">MangaLabTH</span>
          </h1>
          <p className="text-sm text-gray-400">
            เข้าสู่ระบบเพื่อปลดล็อคประสบการณ์การอ่านเต็มรูปแบบ แบบซิงก์ทุกอุปกรณ์
          </p>
        </div>

        {!HAS_CLERK ? (
          <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-surface-100/90 p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <h2 className="mb-2 text-xl font-semibold text-white">เข้าสู่ระบบ</h2>
            <p className="mb-5 text-sm text-gray-400">ระบบ Authentication ยังไม่ได้ตั้งค่า</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-gold-light"
            >
              กลับหน้าแรก
            </Link>
          </div>
        ) : (
          <SignIn appearance={{ elements: clerkAuthElements }} />
        )}
      </section>
    </div>
  );
}

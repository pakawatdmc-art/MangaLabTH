"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { HAS_CLERK } from "@/lib/clerk";
import { clerkAuthElements } from "@/lib/clerkAppearance";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-[85vh] items-center justify-center overflow-hidden py-10 sm:py-14">
      {/* Animated Deep Gold Background Ambience */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[100px]" />
        <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-gold/10 rounded-full blur-[120px]" />
      </div>

      <section className="relative z-10 w-full max-w-[420px] px-4 sm:px-0">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-white drop-shadow-lg">
            ยินดีต้อนรับสู่ <span className="text-gold text-transparent bg-clip-text bg-gradient-to-r from-gold to-yellow-400">MangaLabTH</span>
          </h1>
          <p className="text-sm leading-relaxed text-gray-400">
            เข้าสู่ระบบเพื่อปลดล็อคประสบการณ์การอ่าน<br />
            เต็มรูปแบบ แบบซิงก์ทุกอุปกรณ์
          </p>
        </div>

        {!HAS_CLERK ? (
          <div className="mx-auto w-full max-w-md rounded-3xl border border-white/5 bg-surface-100/60 p-8 text-center shadow-[0_30px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl ring-1 ring-white/10">
            <h2 className="mb-2 text-xl font-semibold text-white">เข้าสู่ระบบ</h2>
            <p className="mb-5 text-sm text-gray-400">ระบบ Authentication ยังไม่ได้ตั้งค่า</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-gold-light shadow-[0_0_20px_rgba(212,168,67,0.3)]"
            >
              กลับหน้าแรก
            </Link>
          </div>
        ) : (
          <div className="relative">
            {/* Soft inner glow behind the card */}
            <div className="absolute -inset-0.5 rounded-[2rem] bg-gradient-to-b from-white/10 to-transparent opacity-50 blur-sm mix-blend-overlay"></div>
            <SignIn appearance={{ elements: clerkAuthElements }} />
          </div>
        )}
      </section>
    </div>
  );
}

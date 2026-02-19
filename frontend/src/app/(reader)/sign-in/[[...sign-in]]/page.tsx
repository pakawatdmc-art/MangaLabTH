"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { BookOpen, ShieldCheck, Sparkles } from "lucide-react";
import { HAS_CLERK } from "@/lib/clerk";
import { clerkAuthElements } from "@/lib/clerkAppearance";

const AUTH_HIGHLIGHTS = [
  "ระบบอ่านลื่นบนมือถือและเดสก์ท็อป",
  "ปลดล็อคตอนพิเศษได้ทันทีด้วยเหรียญ",
  "เก็บประวัติการอ่านข้ามอุปกรณ์อัตโนมัติ",
];

export default function SignInPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,168,67,0.14),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-[radial-gradient(circle_at_left,rgba(255,255,255,0.06),transparent_72%)]" />

      <div className="relative mx-auto grid min-h-[70vh] max-w-6xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-14">
        <section className="hidden rounded-3xl border border-white/10 bg-surface-100/55 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:block">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
            <Sparkles className="h-3.5 w-3.5" />
            Premium Reading Experience
          </div>

          <h1 className="text-3xl font-bold leading-tight text-white">
            ยินดีต้อนรับกลับสู่
            <span className="block text-gold">mangaFactory</span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-300">
            เข้าสู่ระบบเพื่อซิงก์คลังมังงะ, ประวัติการอ่าน และการปลดล็อคตอนพิเศษให้ต่อเนื่องทุกอุปกรณ์
          </p>

          <ul className="mt-7 space-y-3">
            {AUTH_HIGHLIGHTS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-gray-200">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-center gap-2 text-sm text-gray-400">
            <BookOpen className="h-4 w-4 text-gold" />
            อัปเดตตอนใหม่ทุกวัน
          </div>
        </section>

        <section className="relative">
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
    </div>
  );
}

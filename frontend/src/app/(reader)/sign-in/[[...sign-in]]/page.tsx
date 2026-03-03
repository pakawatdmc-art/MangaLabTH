"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { HAS_CLERK } from "@/lib/clerk";
import { clerkAuthElements } from "@/lib/clerkAppearance";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-[85vh] items-center justify-center overflow-hidden py-10 sm:py-14">
      <section className="relative z-10 w-full max-w-[420px] px-4 sm:px-0">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-white drop-shadow-lg">
            เข้าสู่ระบบ <span className="text-gold">MangaLabTH</span>
          </h1>
          <p className="text-sm leading-relaxed text-gray-400">
            เลือกช่องทางเข้าสู่ระบบด้านล่าง<br />
            เพื่อเริ่มอ่านมังงะได้ทันที
          </p>
        </div>

        {!HAS_CLERK ? (
          <div className="mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-surface-100/60 p-8 text-center shadow-lg backdrop-blur-md">
            <h2 className="mb-2 text-xl font-semibold text-white">ระบบเข้าสู่ระบบ</h2>
            <p className="mb-5 text-sm text-gray-400">ระบบ Authentication ยังไม่ได้ตั้งค่า</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-gold-light"
            >
              กลับหน้าแรก
            </Link>
          </div>
        ) : (
          <div className="relative">
            <div className="relative flex justify-center w-full">
              <SignIn
                appearance={{
                  elements: {
                    ...clerkAuthElements,
                    card: "mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-surface-100/60 shadow-lg backdrop-blur-md p-8",
                    headerTitle: "text-2xl font-bold tracking-tight text-white mb-1",
                    headerSubtitle: "text-gray-400 text-sm",
                    socialButtonsBlockButton: "border border-white/10 bg-surface-200/50 text-white transition-all duration-300 hover:bg-white/5 hover:border-gold/30 hover:shadow-[0_0_15px_rgba(212,168,67,0.15)]",
                    socialButtonsBlockButtonText: "text-sm font-medium text-gray-200",
                    footerActionText: "text-gray-400 text-sm",
                    footerActionLink: "text-gold font-medium transition-colors hover:text-gold-light",
                  }
                }}
                routing="hash"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

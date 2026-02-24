"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { HAS_CLERK } from "@/lib/clerk";
import { clerkAuthElements } from "@/lib/clerkAppearance";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-[85vh] items-center justify-center overflow-hidden py-10 sm:py-14">
      {/* Animated Deep Gold Background Ambience (Restored) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold/5 rounded-full blur-[100px]" />
        <div className="absolute right-0 top-0 w-[400px] h-[400px] bg-gold/10 rounded-full blur-[120px]" />
      </div>

      <section className="relative z-10 w-full max-w-[420px] px-4 sm:px-0">
        <div className="mb-8 text-center">
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-white drop-shadow-lg">
            เข้าสู่ระบบ <span className="text-gold text-transparent bg-clip-text bg-gradient-to-r from-gold to-yellow-400">MangaLabTH</span>
          </h1>
          <p className="text-sm leading-relaxed text-gray-400">
            เลือกช่องทางเข้าสู่ระบบด้านล่าง<br />
            เพื่อเริ่มอ่านมังงะได้ทันที
          </p>
        </div>

        {!HAS_CLERK ? (
          <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/5 bg-white p-8 text-center shadow-[0_30px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
            <h2 className="mb-2 text-xl font-semibold text-gray-900">ระบบเข้าสู่ระบบ</h2>
            <p className="mb-5 text-sm text-gray-500">ระบบ Authentication ยังไม่ได้ตั้งค่า</p>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-white transition hover:bg-gold-light shadow-md"
            >
              กลับหน้าแรก
            </Link>
          </div>
        ) : (
          <div className="relative">
            {/* Soft inner glow behind the card */}
            <div className="absolute -inset-0.5 rounded-[2rem] bg-gradient-to-b from-white/10 to-transparent opacity-50 blur-sm mix-blend-overlay"></div>
            <div id="clerk-social-only" className="relative flex justify-center w-full">
              <SignIn
                appearance={{
                  variables: {
                    colorBackground: "white",
                    colorText: "#1f2937", // text-gray-800
                  },
                  elements: {
                    ...clerkAuthElements,
                    card: "mx-auto w-full max-w-md rounded-[2rem] border border-gray-200 bg-white shadow-[0_30px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/10 p-8",
                    headerTitle: "text-2xl font-bold tracking-tight text-gray-900 mb-1",
                    headerSubtitle: "text-gray-500 text-sm",
                    socialButtonsBlockButton: "border border-gray-200 bg-white text-gray-700 transition-all duration-300 hover:bg-gray-50 hover:border-gold/30 hover:shadow-[0_0_15px_rgba(212,168,67,0.15)]",
                    socialButtonsBlockButtonText: "text-sm font-medium text-gray-700",
                    footerActionText: "text-gray-500 text-sm",
                    footerActionLink: "text-gold font-medium transition-colors hover:text-gold-dark hover:drop-shadow-none",
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

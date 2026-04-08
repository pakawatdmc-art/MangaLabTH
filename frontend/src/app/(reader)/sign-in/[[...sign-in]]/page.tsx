"use client";

import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { HAS_CLERK } from "@/lib/clerk";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-[85vh] w-full flex-col items-center justify-center py-12 px-4 sm:px-6">
      
      {/* Decorative background gradients */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[500px] w-full max-w-[800px] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(212,175,55,0.08),transparent_70%)] blur-[80px]"></div>

      {/* Brand Text - replacing the M logo */}
      <div className="mb-8 text-center">
        <h1 className="mb-3 text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-lg">
          เข้าสู่ระบบ <span className="text-gold">MangaLabTH</span>
        </h1>
        <p className="text-sm leading-relaxed text-gray-400">
          เลือกช่องทางเข้าสู่ระบบด้านล่าง<br />
          เพื่อเริ่มอ่านมังงะได้ทันที
        </p>
      </div>

      <section className="relative z-10 w-full max-w-[420px]">
        {!HAS_CLERK ? (
          <div className="mx-auto w-full rounded-3xl border border-white/10 bg-surface-100/60 p-8 text-center shadow-2xl backdrop-blur-md">
            <h2 className="mb-2 text-xl font-bold text-white">ระบบเข้าสู่ระบบ</h2>
            <p className="mb-6 text-sm text-gray-400">ระบบ Authentication ยังไม่ได้ตั้งค่า</p>
            <Link
              href="/"
              className="inline-flex w-full items-center justify-center rounded-xl bg-gold px-4 py-3.5 text-sm font-bold text-black transition-all hover:bg-gold-light hover:shadow-lg hover:shadow-gold/30"
            >
              กลับหน้าแรก
            </Link>
          </div>
        ) : (
          <div className="flex w-full justify-center">
            <SignIn
              appearance={{
                variables: {
                  colorPrimary: "#d4af37", // Gold
                  colorText: "#ffffff", // Pure white for text
                  colorTextSecondary: "#9ca3af", // Gray 400
                  colorBackground: "rgba(30, 30, 30, 0.4)", // Dark Glassmorphism
                  colorInputBackground: "rgba(255, 255, 255, 0.05)", // Very light white for inputs
                  colorInputText: "#ffffff",
                  borderRadius: "1.25rem", // 20px smooth corners
                },
                elements: {
                  card: "w-full shadow-2xl shadow-black/80 border border-white/10 rounded-[1.5rem] p-6 sm:p-8 m-0 backdrop-blur-2xl",
                  headerTitle: "hidden", // Hide clerk default header to avoid duplication
                  headerSubtitle: "hidden", // Hide subtitle too
                  socialButtonsBlockButton: "border border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:border-gold/40 hover:shadow-[0_0_15px_rgba(212,168,67,0.15)] h-12 rounded-xl text-white",
                  socialButtonsBlockButtonText: "font-semibold text-gray-200",
                  socialButtonsProviderIcon: "scale-110",
                  dividerLine: "bg-white/10",
                  dividerText: "text-xs font-semibold text-gray-500 tracking-widest uppercase",
                  formFieldLabel: "text-sm font-bold text-gray-300 mb-1.5",
                  formFieldInput: "border border-white/10 focus:bg-white/10 focus:ring-1 focus:ring-gold/60 focus:border-gold h-12 rounded-xl text-base transition-all",
                  formButtonPrimary: "font-bold text-base text-black bg-gold hover:bg-gold-light shadow-lg shadow-black/30 hover:shadow-[0_0_20px_rgba(212,168,67,0.3)] transition-all h-12 rounded-xl mt-2",
                  footerActionText: "text-sm font-medium text-gray-400",
                  footerActionLink: "text-sm font-bold text-gold hover:text-gold-light transition-colors",
                  identityPreviewText: "text-gray-200 font-semibold",
                  identityPreviewEditButtonIcon: "text-gold hover:text-gold-light transition-colors",
                  formResendCodeLink: "text-gold font-bold hover:text-gold-light transition-colors",
                }
              }}
              routing="hash"
            />
          </div>
        )}
      </section>
      
    </div>
  );
}

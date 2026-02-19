import Link from "next/link";
import { UserProfile } from "@clerk/nextjs";
import { BookOpen, ShieldCheck, Sparkles } from "lucide-react";
import { HAS_CLERK } from "@/lib/clerk";
import { clerkAccountElements } from "@/lib/clerkAppearance";

const ACCOUNT_TIPS = [
  "แก้ไขโปรไฟล์และข้อมูลติดต่อได้ในที่เดียว",
  "จัดการความปลอดภัยของบัญชีอย่างมั่นใจ",
  "เชื่อมต่อบัญชี Social เพื่อเข้าสู่ระบบได้สะดวกขึ้น",
];

export default function AccountPage() {
  if (!HAS_CLERK) {
    return (
      <div className="mx-auto flex min-h-[65vh] max-w-xl items-center px-4 py-10 sm:px-6">
        <div className="w-full rounded-3xl border border-white/10 bg-surface-100/90 p-8 text-center shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <h1 className="mb-2 text-2xl font-semibold text-white">จัดการบัญชี</h1>
          <p className="mb-6 text-sm text-gray-400">ระบบ Authentication ยังไม่ได้ตั้งค่า</p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-gold-light"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,168,67,0.16),transparent_62%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[radial-gradient(circle_at_right,rgba(255,255,255,0.06),transparent_75%)]" />

      <div className="relative mx-auto grid min-h-[75vh] max-w-6xl items-start gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:py-14">
        <section className="rounded-3xl border border-white/10 bg-surface-100/55 p-7 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
            <Sparkles className="h-3.5 w-3.5" />
            Account Center
          </div>

          <h1 className="text-3xl font-bold leading-tight text-white">
            จัดการบัญชีของคุณ
            <span className="block text-gold">ให้ปลอดภัยและใช้งานง่าย</span>
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-gray-300">
            อัปเดตโปรไฟล์, ความปลอดภัย, และการเชื่อมต่อบัญชีได้ทันที โดยคงโทนการใช้งานเดียวกับหน้าอ่านมังงะของคุณ
          </p>

          <ul className="mt-7 space-y-3">
            {ACCOUNT_TIPS.map((tip) => (
              <li key={tip} className="flex items-start gap-2.5 text-sm text-gray-200">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {tip}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex items-center gap-2 text-sm text-gray-400">
            <BookOpen className="h-4 w-4 text-gold" />
            mangaFactory account suite
          </div>
        </section>

        <section className="min-w-0">
          <UserProfile
            path="/account"
            routing="path"
            appearance={{ elements: clerkAccountElements }}
          />
        </section>
      </div>
    </div>
  );
}

import Link from "next/link";
import { UserProfile } from "@clerk/nextjs";
import { HAS_CLERK } from "@/lib/clerk";
import { clerkAccountElements } from "@/lib/clerkAppearance";

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

      <div className="relative mx-auto flex min-h-[75vh] max-w-5xl justify-center px-4 py-10 sm:px-6 lg:py-14">
        <section className="flex w-full min-w-0 justify-center">
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

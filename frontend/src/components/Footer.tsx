import Link from "next/link";
import { BookOpen } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/types";

const FOOTER_CATEGORIES = Object.entries(CATEGORY_LABELS);

export default function Footer() {
  return (
    <footer className="bg-ink-950 pb-20 md:pb-0">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {/* Top section — brand + links */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-sm text-ink-200 hover:text-ink-100 transition-colors">
              <BookOpen className="h-4 w-4 text-gold/70" />
              <span className="font-semibold tracking-tight">
                MangaLab<span className="text-gold">TH</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-ink-400">
              เว็บอ่านมังงะแปลไทยคุณภาพสูง อัปเดตทุกวัน
              ทั้งมังงะญี่ปุ่น เกาหลี และจีน
            </p>
          </div>

          {/* Categories */}
          <nav aria-label="หมวดหมู่มังงะ" className="col-span-2 sm:col-span-1 lg:col-span-2">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
              หมวดหมู่
            </h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {FOOTER_CATEGORIES.map(([key, label]) => (
                <li key={key}>
                  <Link
                    href={`/category/${key}`}
                    className="text-xs text-ink-300 transition-colors hover:text-gold"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick Links */}
          <nav aria-label="ลิงก์ด่วน" className="col-span-1">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
              ลิงก์ด่วน
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-xs text-ink-300 transition-colors hover:text-gold">
                  หน้าแรก
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-xs text-ink-300 transition-colors hover:text-gold">
                  ค้นหามังงะ
                </Link>
              </li>
              <li>
                <Link href="/coins" className="text-xs text-ink-300 transition-colors hover:text-gold">
                  เติมเหรียญ
                </Link>
              </li>
            </ul>
          </nav>

          {/* About */}
          <div className="col-span-2 lg:col-span-1">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-400">
              เกี่ยวกับ
            </h3>
            <p className="text-xs leading-relaxed text-ink-400">
              MangaLabTH คัดสรรเฉพาะเรื่องฮิต แปลไทยโดย Admin ทุกเรื่อง
              อัปเดตตอนใหม่ล่าสุดก่อนใคร ในราคาที่คุ้มค่า
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 text-center">
          <p className="text-[11px] text-ink-500 tracking-wide">
            © {new Date().getFullYear()} MangaLabTH · All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

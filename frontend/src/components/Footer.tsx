import Link from "next/link";
import { BookOpen } from "lucide-react";
import { CATEGORY_LABELS } from "@/lib/types";

const FOOTER_CATEGORIES = Object.entries(CATEGORY_LABELS);

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-surface-300 pb-20 md:pb-0">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {/* Top section — brand + links */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
              <BookOpen className="h-4 w-4 text-gold/50" />
              <span>
                MangaLab<span className="text-gold/50">TH</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-xs leading-relaxed text-gray-600">
              เว็บอ่านมังงะแปลไทยคุณภาพสูง อัปเดตทุกวัน
              ทั้งมังงะญี่ปุ่น เกาหลี และจีน
            </p>
          </div>

          {/* Categories */}
          <nav aria-label="หมวดหมู่มังงะ" className="col-span-2 sm:col-span-1 lg:col-span-2">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              หมวดหมู่
            </h3>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
              {FOOTER_CATEGORIES.map(([key, label]) => (
                <li key={key}>
                  <Link
                    href={`/category/${key}`}
                    className="text-xs text-gray-500 transition hover:text-gold"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick Links */}
          <nav aria-label="ลิงก์ด่วน" className="col-span-1">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              ลิงก์ด่วน
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-xs text-gray-500 transition hover:text-gold">
                  หน้าแรก
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-xs text-gray-500 transition hover:text-gold">
                  ค้นหามังงะ
                </Link>
              </li>
              <li>
                <Link href="/coins" className="text-xs text-gray-500 transition hover:text-gold">
                  เติมเหรียญ
                </Link>
              </li>
            </ul>
          </nav>

          {/* About */}
          <div className="col-span-2 lg:col-span-1">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
              เกี่ยวกับ
            </h3>
            <p className="text-xs leading-relaxed text-gray-500">
              MangaLabTH คัดสรรเฉพาะเรื่องฮิต แปลไทยโดย Admin ทุกเรื่อง
              อัปเดตตอนใหม่ล่าสุดก่อนใคร ในราคาที่คุ้มค่า
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-white/5 pt-6 text-center">
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} MangaLabTH — สร้างด้วย ❤️ สำหรับคนรักมังงะ
          </p>
        </div>
      </div>
    </footer>
  );
}

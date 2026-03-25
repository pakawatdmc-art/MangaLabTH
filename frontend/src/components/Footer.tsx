"use client";

import { BookOpen } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();

  if (decodeURIComponent(pathname).includes("/ตอนที่-")) {
    return null;
  }

  return (
    <footer className="border-t border-white/5 bg-surface-300 pb-20 md:pb-0">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <BookOpen className="h-4 w-4 text-gold/50" />
          <span>
            MangaLab<span className="text-gold/50">TH</span>
          </span>
        </div>
        <p className="text-xs text-gray-600">
          © {new Date().getFullYear()} MangaLabTH — สร้างด้วย ❤️ สำหรับคนรักมังงะ
        </p>
      </div>
    </footer>
  );
}

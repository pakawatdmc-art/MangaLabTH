"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Coins, Users, Layers, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TABS = [
  { name: "ภาพรวม (Traffic)", href: "/admin/analytics", icon: Activity },
  { name: "เหรียญ (Coins)", href: "/admin/analytics/coins", icon: Coins },
  { name: "ผู้ใช้ (Users)", href: "/admin/analytics/users", icon: Users },
  { name: "ตอน (Chapters)", href: "/admin/analytics/chapters", icon: Layers },
  { name: "มังงะ (Mangas)", href: "/admin/analytics/mangas", icon: BookOpen },
];

export function AnalyticsNav() {
  const pathname = usePathname();

  return (
    <div className="mb-8 flex flex-wrap items-center gap-1 rounded-md bg-ink-800/40 p-1.5 backdrop-blur">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              "relative flex items-center gap-2 rounded-sm px-3.5 py-2 text-sm font-medium transition-colors duration-200",
              isActive ? "text-ink-100" : "text-ink-400 hover:text-ink-100"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="analytics-nav-bg"
                className="absolute inset-0 rounded-sm bg-ink-900"
                transition={{ type: "spring", bounce: 0.18, duration: 0.5 }}
              />
            )}
            <div className="relative z-10 flex items-center gap-2">
              <tab.icon className={cn("h-4 w-4", isActive ? "text-gold" : "text-ink-400")} />
              {tab.name}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

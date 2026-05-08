"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Coins, Users, Layers, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const TABS = [
  {
    name: "ภาพรวม (Traffic)",
    href: "/admin/analytics",
    icon: Activity,
    color: "text-blue-400",
  },
  {
    name: "เหรียญ (Coins)",
    href: "/admin/analytics/coins",
    icon: Coins,
    color: "text-gold",
  },
  {
    name: "ผู้ใช้ (Users)",
    href: "/admin/analytics/users",
    icon: Users,
    color: "text-purple-400",
  },
  {
    name: "ตอน (Chapters)",
    href: "/admin/analytics/chapters",
    icon: Layers,
    color: "text-emerald-400",
  },
  {
    name: "มังงะ (Mangas)",
    href: "/admin/analytics/mangas",
    icon: BookOpen,
    color: "text-pink-400",
  },
];

export function AnalyticsNav() {
  const pathname = usePathname();

  return (
    <div className="mb-8 flex flex-wrap items-center gap-2 rounded-2xl border border-white/5 bg-surface-100/50 p-2 backdrop-blur-md">
      {TABS.map((tab) => {
        const isActive = pathname === tab.href;

        return (
          <Link
            key={tab.name}
            href={tab.href}
            className={cn(
              "relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors",
              isActive ? "text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="analytics-nav-bg"
                className="absolute inset-0 rounded-xl bg-white/10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <div className="relative z-10 flex items-center gap-2">
              <tab.icon className={cn("h-4 w-4", isActive ? tab.color : "text-gray-500")} />
              {tab.name}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

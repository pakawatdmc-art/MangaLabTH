"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Coins,
  Home,
  Layers,
  LayoutDashboard,
  Menu,
  Upload,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

const SIDEBAR_LINKS = [
  { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/admin/manga", label: "จัดการมังงะ", icon: BookOpen },
  { href: "/admin/chapters", label: "จัดการตอน", icon: Layers },
  { href: "/admin/upload", label: "อัปโหลดรูปภาพ", icon: Upload },
  { href: "/admin/users", label: "ผู้ใช้งาน", icon: Users },
  { href: "/admin/transactions", label: "รายการเหรียญ", icon: Coins },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/5 bg-surface-300 transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-14 items-center justify-between border-b border-white/5 px-4">
          <Link href="/admin" className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-gold" />
            <span className="text-sm font-bold text-white">
              manga<span className="text-gold">Factory</span>
            </span>
            <span className="ml-1 rounded bg-gold/20 px-1.5 py-0.5 text-[10px] font-medium text-gold">
              Admin
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-gray-400 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {SIDEBAR_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive =
              href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-gold/15 text-gold"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Back to reader */}
        <div className="border-t border-white/5 p-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 transition hover:text-white"
          >
            <Home className="h-4 w-4" />
            กลับหน้าอ่าน
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-white/5 bg-surface-300/50 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-1.5 text-gray-400 hover:text-white"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium text-white">Admin Panel</span>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

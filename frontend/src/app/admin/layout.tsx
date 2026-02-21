"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Coins,
  Plus,
  Home,
  Layers,
  LayoutDashboard,
  Loader2,
  Menu,
  Sparkles,
  Upload,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { getMe } from "@/lib/api";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

const SIDEBAR_LINKS = [
  { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard },
  { href: "/admin/manga", label: "จัดการมังงะ", icon: BookOpen },
  { href: "/admin/chapters", label: "จัดการตอน", icon: Layers },
  { href: "/admin/users", label: "ผู้ใช้งาน", icon: Users },
  { href: "/admin/transactions", label: "รายการเหรียญ", icon: Coins },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const activeSection =
    SIDEBAR_LINKS.find(({ href }) =>
      href === "/admin" ? pathname === "/admin" : pathname.startsWith(href)
    )?.label || "แผงควบคุม";

  // ── Frontend Shield: Verify Admin Role ──
  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/");
      return;
    }

    const checkRole = async () => {
      try {
        const token = await getToken();
        if (!token) {
          router.replace("/");
          return;
        }
        const user = await getMe(token);
        if (user.role !== "admin") {
          router.replace("/");
        } else {
          setIsPrimaryAdmin(!!user.is_primary_admin);
          setAdminToken(token);
          setChecking(false);
        }
      } catch (err) {
        console.error("Admin check failed", err);
        router.replace("/");
      } finally {
        setChecking(false);
      }
    };

    checkRole();
  }, [isLoaded, isSignedIn, getToken, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-300">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-surface-300">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.16),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.14),transparent_45%)]" />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="relative flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/10 bg-gradient-to-b from-[#151725]/95 via-[#11131c]/95 to-[#0b0d14]/95 backdrop-blur-xl transition-transform lg:static lg:translate-x-0",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Logo */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
            <Link href="/admin" className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-gold" />
              <div>
                <span className="text-sm font-bold text-white">
                  MangaLab<span className="text-gold">TH</span>
                </span>
                <p className="text-[10px] text-gray-500">Control Center</p>
              </div>
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

          <div className="px-3 pb-2 pt-3">
            <div className="rounded-xl border border-gold/25 bg-gold/10 px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-gold">
                <Sparkles className="h-3.5 w-3.5" />
                โหมดผู้ดูแลระบบ
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-400">
                จัดการมังงะ ตอน รูปภาพ และผู้ใช้งานได้ในหน้าเดียว
              </p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3 pt-1">
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
                    "group flex items-center justify-between rounded-xl border px-3 py-2.5 text-sm transition",
                    isActive
                      ? "border-gold/40 bg-gold/20 text-gold shadow-[0_0_0_1px_rgba(212,168,67,0.3)]"
                      : "border-transparent text-gray-400 hover:border-white/10 hover:bg-white/[0.05] hover:text-white"
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full transition",
                      isActive ? "bg-gold" : "bg-transparent group-hover:bg-white/40"
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          {isPrimaryAdmin && adminToken && (
            <ThemeSwitcher token={adminToken} isPrimaryAdmin={isPrimaryAdmin} />
          )}

          <div className="space-y-2 border-t border-white/10 p-3">
            <Link
              href="/admin/manga"
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-gold px-3 py-2 text-xs font-semibold text-black transition hover:bg-gold-light"
            >
              <Plus className="h-3.5 w-3.5" />
              เพิ่มเรื่องใหม่
            </Link>
            <Link
              href="/"
              className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-400 transition hover:border-white/20 hover:text-white"
            >
              <Home className="h-3.5 w-3.5" />
              กลับหน้าอ่าน
            </Link>
          </div>
        </aside>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-surface-300/75 backdrop-blur-xl">
            <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="rounded-lg border border-white/10 p-1.5 text-gray-300 hover:border-white/30 hover:text-white lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{activeSection}</p>
                  <p className="truncate text-xs text-gray-500">Admin workspace · MangaLabTH</p>
                </div>
              </div>

              <div className="hidden items-center gap-2 sm:flex">
                <Link
                  href="/admin/chapters"
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 transition hover:border-gold/30 hover:text-gold"
                >
                  จัดการตอน
                </Link>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-4 pb-8 pt-5 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Coins,
  Home,
  LogIn,
  Menu,
  Search,
  Shield,
  User,
  X,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { SignedIn, SignedOut, UserButton, useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { getMe } from "@/lib/api";

const NAV_LINKS = [
  { href: "/", label: "หน้าแรก", icon: Home },
  { href: "/search", label: "ค้นหา", icon: Search },
];

export default function Navbar() {
  const pathname = usePathname();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<{ coin_balance: number } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      return;
    }
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;
        const me = await getMe(token);
        setUser(me);
        setIsAdmin(me.role === "admin");
      } catch {
        setUser(null);
        setIsAdmin(false);
      }
    })();
  }, [isLoaded, isSignedIn, getToken]);

  if (pathname.startsWith("/read/")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-surface-300/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-gold" />
          <span className="text-lg font-bold text-white">
            MangaLab<span className="text-gold">TH</span>
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition",
                pathname === href
                  ? "bg-gold/15 text-gold"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <SignedIn>
            <Link
              href="/coins"
              className="hidden items-center gap-1.5 rounded-lg bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold ring-1 ring-gold/20 transition hover:bg-gold/20 md:flex"
            >
              <Coins className="h-3.5 w-3.5" />
              {user ? formatNumber(user.coin_balance) : "..."} เหรียญ
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  "hidden items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition md:inline-flex",
                  pathname.startsWith("/admin")
                    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
                    : "bg-white/5 text-gray-200 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"
                )}
              >
                <Shield className="h-3.5 w-3.5" />
                แอดมิน
              </Link>
            )}
            <UserButton
              userProfileMode="navigation"
              userProfileUrl="/account"
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8 ring-2 ring-gold/25",
                  userButtonPopoverCard:
                    "border border-white/10 bg-surface-100/95 text-white shadow-2xl backdrop-blur-xl",
                  userButtonPopoverActionButton:
                    "text-gray-300 hover:bg-white/5 hover:text-white",
                  userButtonPopoverActionButtonText: "text-sm",
                  userButtonPopoverActionButtonIcon: "text-gray-400",
                  userButtonPopoverFooter: "hidden",
                },
              }}
            />
          </SignedIn>
          <SignedOut>
            <Link
              href="/sign-in"
              className="hidden rounded-lg bg-gold px-4 py-1.5 text-sm font-semibold text-black transition hover:bg-gold-light md:inline-flex"
            >
              เข้าสู่ระบบ
            </Link>
          </SignedOut>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-surface-200/60 text-gray-200 transition hover:border-gold/30 hover:text-white md:hidden"
            aria-label={mobileMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-nav-menu"
          className="border-t border-white/10 bg-surface-200/95 px-4 py-3 shadow-2xl backdrop-blur-xl md:hidden"
        >
          <nav className="space-y-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  pathname === href
                    ? "bg-gold/15 text-gold"
                    : "text-gray-200 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}

            <SignedIn>
              <Link
                href="/coins"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  pathname === "/coins"
                    ? "bg-gold/15 text-gold"
                    : "text-gray-200 hover:bg-white/5 hover:text-white"
                )}
              >
                <span className="flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  เหรียญ
                </span>
                <span className="text-xs text-gray-400">
                  {user ? `${formatNumber(user.coin_balance)} เหรียญ` : "..."}
                </span>
              </Link>

              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-white/5 hover:text-white"
              >
                <User className="h-4 w-4" />
                บัญชีผู้ใช้
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-white/5 hover:text-white"
                >
                  <Shield className="h-4 w-4" />
                  แอดมิน
                </Link>
              )}
            </SignedIn>

            <SignedOut>
              <Link
                href="/sign-in"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-xl bg-gold px-3 py-2.5 text-sm font-semibold text-black transition hover:bg-gold-light"
              >
                <LogIn className="h-4 w-4" />
                เข้าสู่ระบบ
              </Link>
            </SignedOut>
          </nav>
        </div>
      )}
    </header>
  );
}

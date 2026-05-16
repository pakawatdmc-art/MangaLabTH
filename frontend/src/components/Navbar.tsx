"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Coins,
  Home,
  LogIn,
  Menu,
  Search,
  Shield,
  User,
  X,
  Info,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { SignedIn, SignedOut, UserButton, useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { getMe } from "@/lib/api";

// Extend Window interface to type the user cache
declare global {
  interface Window {
    __cachedUser?: { coin_balance: number; role?: string } | null;
    __cachedUserTime?: number;
  }
}

const NAV_LINKS = [
  { href: "/", label: "หน้าแรก", icon: Home },
  { href: "/search", label: "ค้นหา", icon: Search },
  { href: "/about", label: "เกี่ยวกับเรา", icon: Info },
];

export default function Navbar() {
  const pathname = usePathname();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState<{ coin_balance: number; role?: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchUser = useCallback(async (force = false) => {
    try {
      const w = window;
      const now = Date.now();
      if (!force && w.__cachedUser && now - (w.__cachedUserTime || 0) < 30000) {
        setUser(w.__cachedUser);
        setIsAdmin(w.__cachedUser.role === "admin");
        return;
      }
      const token = await getToken();
      if (!token) return;
      const me = await getMe(token);
      w.__cachedUser = me;
      w.__cachedUserTime = Date.now();
      setUser(me);
      setIsAdmin(me.role === "admin");
    } catch {
      setUser(null);
      setIsAdmin(false);
      if (typeof window !== "undefined") window.__cachedUser = null;
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(null);
      setIsAdmin(false);
      if (typeof window !== "undefined") window.__cachedUser = null;
      return;
    }
    fetchUser();

    // Listen for manual balance updates
    const handleUpdate = () => fetchUser(true);
    window.addEventListener("balance-update", handleUpdate);
    return () => window.removeEventListener("balance-update", handleUpdate);
  }, [isLoaded, isSignedIn, fetchUser]);

  if (decodeURIComponent(pathname).includes("/ตอนที่-")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-ink-900/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="group flex items-center gap-2 transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.98]">
          <Image
            src="/logo.webp"
            alt="MangaLabTH Logo"
            width={36}
            height={36}
            className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-cover transition-all duration-200 group-hover:ring-1 group-hover:ring-gold/40"
            priority
          />
          <span className="text-[16px] sm:text-[17px] font-semibold tracking-tight text-ink-100">
            MangaLab<span className="text-gold">TH</span>
          </span>
        </Link>

        {/* Center nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm transition-colors duration-200",
                  isActive
                    ? "text-ink-100"
                    : "text-ink-300 hover:text-ink-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {isActive && (
                  <span className="pointer-events-none absolute inset-x-3 -bottom-[15px] h-px bg-gold" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <SignedIn>
            <Link
              href="/coins"
              className="hidden items-center gap-1.5 rounded-sm bg-ink-800/70 px-3 py-1.5 text-xs font-medium text-ink-300 transition-colors duration-200 hover:bg-ink-800 hover:text-ink-100 md:flex"
            >
              <Coins className="h-3.5 w-3.5 text-gold" />
              <span className="text-gold">{user ? formatNumber(user.coin_balance) : "..."}</span>
              <span>เหรียญ</span>
            </Link>
            {isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  "hidden items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors duration-200 md:inline-flex",
                  pathname.startsWith("/admin")
                    ? "bg-gold/10 text-gold"
                    : "bg-ink-800/70 text-ink-300 hover:bg-ink-800 hover:text-ink-100"
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
                  avatarBox: "h-8 w-8 hover:ring-1 hover:ring-gold/40 transition",
                  userButtonPopoverCard:
                    "bg-ink-900/95 text-ink-100 shadow-2xl backdrop-blur-xl",
                  userButtonPopoverActionButton:
                    "text-ink-300 hover:bg-ink-800 hover:text-ink-100",
                  userButtonPopoverActionButtonText: "text-sm",
                  userButtonPopoverActionButtonIcon: "text-ink-400",
                  userButtonPopoverFooter: "hidden",
                },
              }}
            />
          </SignedIn>
          <SignedOut>
            <Link
              href="/sign-in"
              className="hidden rounded-sm bg-gold px-4 py-1.5 text-sm font-semibold text-ink-950 transition-colors duration-200 hover:bg-gold-light md:inline-flex"
            >
              เข้าสู่ระบบ
            </Link>
          </SignedOut>
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-sm bg-ink-800/70 text-ink-200 transition-colors duration-200 hover:bg-ink-800 hover:text-ink-100 md:hidden"
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
          className="bg-ink-900/95 px-4 py-3 shadow-2xl backdrop-blur-xl md:hidden"
        >
          <nav className="space-y-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                  pathname === href
                    ? "bg-ink-800 text-gold"
                    : "text-ink-200 hover:bg-ink-800 hover:text-ink-100"
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
                  "flex items-center justify-between rounded-sm px-3 py-2.5 text-sm font-medium transition-colors duration-200",
                  pathname === "/coins"
                    ? "bg-ink-800 text-gold"
                    : "text-ink-200 hover:bg-ink-800 hover:text-ink-100"
                )}
              >
                <span className="flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  เหรียญ
                </span>
                <span className="text-xs text-gold">
                  {user ? `${formatNumber(user.coin_balance)} เหรียญ` : "..."}
                </span>
              </Link>

              <Link
                href="/account"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-ink-200 transition-colors duration-200 hover:bg-ink-800 hover:text-ink-100"
              >
                <User className="h-4 w-4" />
                บัญชีผู้ใช้
              </Link>

              {isAdmin && (
                <Link
                  href="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-sm px-3 py-2.5 text-sm font-medium text-ink-200 transition-colors duration-200 hover:bg-ink-800 hover:text-ink-100"
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
                className="flex items-center gap-2 rounded-sm bg-gold px-3 py-2.5 text-sm font-semibold text-ink-950 transition-colors duration-200 hover:bg-gold-light"
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

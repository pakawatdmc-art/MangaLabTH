"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Coins, Home, Search, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

const NAV_LINKS = [
  { href: "/", label: "หน้าแรก", icon: Home },
  { href: "/search", label: "ค้นหา", icon: Search },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-surface-300/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-gold" />
          <span className="text-lg font-bold text-white">
            manga<span className="text-gold">Factory</span>
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
        <div className="flex items-center gap-3">
          <SignedIn>
            <Link
              href="/coins"
              className="flex items-center gap-1 rounded-lg bg-gold/10 px-3 py-1.5 text-xs font-medium text-gold ring-1 ring-gold/20 transition hover:bg-gold/20"
            >
              <Coins className="h-3.5 w-3.5" />
              เหรียญ
            </Link>
            <Link
              href="/admin"
              className="rounded-lg p-2 text-gray-400 transition hover:bg-white/5 hover:text-white"
              title="แอดมิน"
            >
              <Shield className="h-4 w-4" />
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8",
                },
              }}
            />
          </SignedIn>
          <SignedOut>
            <Link
              href="/sign-in"
              className="rounded-lg bg-gold px-4 py-1.5 text-sm font-semibold text-black transition hover:bg-gold-light"
            >
              เข้าสู่ระบบ
            </Link>
          </SignedOut>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-14 items-center justify-around border-t border-white/5 bg-surface-300/95 backdrop-blur-xl md:hidden">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center gap-0.5 text-[10px] transition",
              pathname === href ? "text-gold" : "text-gray-500"
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
        <SignedIn>
          <Link
            href="/coins"
            className={cn(
              "flex flex-col items-center gap-0.5 text-[10px] transition",
              pathname === "/coins" ? "text-gold" : "text-gray-500"
            )}
          >
            <Coins className="h-5 w-5" />
            เหรียญ
          </Link>
        </SignedIn>
      </nav>
    </header>
  );
}

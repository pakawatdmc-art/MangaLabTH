"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    BookCopy,
    BookOpen,
    Coins,
    Home,
    Layers,
    LayoutDashboard,
    Library,
    Menu,
    Plus,
    Sparkles,
    UserCog,
    Users,
    Wallet,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

type SidebarLink = {
    readonly href: string;
    readonly label: string;
    readonly icon: React.ComponentType<{ className?: string }>;
};

type SidebarSection = {
    readonly title?: string;
    readonly items: readonly SidebarLink[];
};

const SIDEBAR_SECTIONS: readonly SidebarSection[] = [
    {
        items: [
            { href: "/admin", label: "แดชบอร์ด", icon: LayoutDashboard },
        ],
    },
    {
        title: "วิเคราะห์ข้อมูล",
        items: [
            { href: "/admin/analytics", label: "ยอดเข้าชม", icon: Sparkles },
            { href: "/admin/analytics/coins", label: "ยอดเติมเหรียญ", icon: Coins },
            { href: "/admin/analytics/users", label: "สถิติผู้ใช้งาน", icon: Users },
            { href: "/admin/analytics/chapters", label: "สถิติตอน", icon: Layers },
            { href: "/admin/analytics/mangas", label: "สถิติมังงะ", icon: BookOpen },
        ],
    },
    {
        title: "จัดการเนื้อหา",
        items: [
            { href: "/admin/manga", label: "จัดการมังงะ", icon: Library },
            { href: "/admin/chapters", label: "จัดการตอน", icon: BookCopy },
            { href: "/admin/users", label: "จัดการบัญชีผู้ใช้", icon: UserCog },
            { href: "/admin/transactions", label: "จัดการธุรกรรม", icon: Wallet },
        ],
    },
] as const;

const ALL_LINKS: readonly SidebarLink[] = SIDEBAR_SECTIONS.flatMap((s) => s.items);

interface Props {
    children: React.ReactNode;
    isPrimaryAdmin: boolean;
    adminToken: string;
}

function isLinkActive(pathname: string, href: string): boolean {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
}

export default function AdminLayoutClient({ children, isPrimaryAdmin, adminToken }: Props) {
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Pick the most-specific matching link (longest href) to avoid
    // parent prefixes like /admin/analytics also matching /admin/analytics/coins
    const activeLink = useMemo(
        () =>
            ALL_LINKS
                .filter(({ href }) => isLinkActive(pathname, href))
                .sort((a, b) => b.href.length - a.href.length)[0],
        [pathname],
    );

    const activeSection = activeLink?.label || "แดชบอร์ด";

    useEffect(() => {
        setSidebarOpen(false);
    }, [pathname]);

    return (
        <div className="relative min-h-screen overflow-hidden bg-ink-900">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.06),transparent_50%)]" />

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
                        "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-ink-950/95 backdrop-blur-xl transition-transform duration-300 ease-out lg:static lg:translate-x-0",
                        sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    )}
                >
                    {/* Logo */}
                    <div className="flex items-center justify-between px-4 py-4">
                        <Link href="/admin" className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-gold" />
                            <div>
                                <span className="text-sm font-semibold tracking-tight text-ink-100">
                                    MangaLab<span className="text-gold">TH</span>
                                </span>
                                <p className="text-[10px] uppercase tracking-[0.18em] text-ink-500">Control Center</p>
                            </div>
                            <span className="ml-1 rounded-xs bg-gold/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold">
                                Admin
                            </span>
                        </Link>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="rounded-sm p-1 text-ink-400 hover:text-ink-100 lg:hidden"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="px-3 pb-2 pt-3">
                        <div className="rounded-md bg-ink-900 px-3 py-2.5">
                            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                                <Sparkles className="h-3.5 w-3.5" />
                                โหมดผู้ดูแลระบบ
                            </p>
                            <p className="mt-1.5 text-xs leading-relaxed text-ink-400">
                                จัดการมังงะ ตอน รูปภาพ และผู้ใช้งานได้ในหน้าเดียว
                            </p>
                        </div>
                    </div>

                    {/* Nav */}
                    <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-3 pt-1">
                        {SIDEBAR_SECTIONS.map((section, sectionIdx) => (
                            <div key={section.title ?? `section-${sectionIdx}`} className="space-y-0.5">
                                {section.title && (
                                    <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-ink-500">
                                        {section.title}
                                    </p>
                                )}
                                {section.items.map(({ href, label, icon: Icon }) => {
                                    const isActive = activeLink?.href === href;
                                    return (
                                        <Link
                                            key={href}
                                            href={href}
                                            onClick={() => setSidebarOpen(false)}
                                            className={cn(
                                                "group relative flex items-center gap-2.5 rounded-sm px-3 py-2 text-sm transition-colors duration-200",
                                                isActive
                                                    ? "bg-ink-800 text-ink-100"
                                                    : "text-ink-400 hover:bg-ink-800/60 hover:text-ink-100"
                                            )}
                                        >
                                            {isActive && (
                                                <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-gold" />
                                            )}
                                            <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-gold" : "text-ink-400 group-hover:text-ink-200")} />
                                            <span className="flex-1">{label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        ))}
                    </nav>

                    {isPrimaryAdmin && adminToken && (
                        <ThemeSwitcher token={adminToken} isPrimaryAdmin={isPrimaryAdmin} />
                    )}
                    <div className="space-y-2 p-3">
                        <Link
                            href="/admin/manga?create=1"
                            className="inline-flex w-full items-center justify-center gap-1.5 rounded-sm bg-gold px-3 py-2 text-xs font-semibold text-ink-950 transition-colors duration-200 hover:bg-gold-light"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            เพิ่มเรื่องใหม่
                        </Link>
                        <Link
                            href="/"
                            className="flex items-center justify-center gap-1.5 rounded-sm bg-ink-900/60 px-3 py-2 text-xs text-ink-300 transition-colors duration-200 hover:bg-ink-900 hover:text-ink-100"
                        >
                            <Home className="h-3.5 w-3.5" />
                            กลับหน้าอ่าน
                        </Link>
                    </div>
                </aside>

                {/* Main */}
                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-30 bg-ink-900/85 backdrop-blur-xl">
                        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                            <div className="flex min-w-0 items-center gap-3">
                                <button
                                    onClick={() => setSidebarOpen(true)}
                                    className="rounded-sm bg-ink-800/60 p-1.5 text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-100 lg:hidden"
                                >
                                    <Menu className="h-5 w-5" />
                                </button>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-ink-100">{activeSection}</p>
                                    <p className="truncate text-[11px] uppercase tracking-[0.18em] text-ink-500">Admin workspace · MangaLabTH</p>
                                </div>
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

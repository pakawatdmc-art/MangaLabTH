"use client";

import { useEffect, useState } from "react";
import { useTheme, type ThemeType } from "./ThemeProvider";
import { Palette, Check, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES: { id: ThemeType; icon: string; label: string }[] = [
    { id: "default", icon: "🌙", label: "ปกติ" },
    { id: "newyear", icon: "🎆", label: "ปีใหม่" },
    { id: "valentine", icon: "💖", label: "วาเลนไทน์" },
    { id: "songkran", icon: "💦", label: "สงกรานต์" },
    { id: "mother", icon: "💙", label: "วันแม่" },
    { id: "halloween", icon: "🎃", label: "ฮาโลวีน" },
    { id: "loykrathong", icon: "🏮", label: "ลอยกระทง" },
    { id: "christmas", icon: "🎄", label: "คริสต์มาส" },
];

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface Props {
    token: string;
    isPrimaryAdmin: boolean;
}

export function ThemeSwitcher({ token, isPrimaryAdmin }: Props) {
    const { theme, setTheme, isLoading } = useTheme();
    const [saving, setSaving] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Auto-clear error after 4s so it doesn't linger forever.
    useEffect(() => {
        if (!errorMsg) return;
        const id = setTimeout(() => setErrorMsg(null), 4000);
        return () => clearTimeout(id);
    }, [errorMsg]);

    if (!isPrimaryAdmin) return null;

    const handleSelect = async (t: ThemeType) => {
        if (t === theme || saving) return;

        // Optimistic UI: เปลี่ยนธีมทันทีก่อนรอ API
        const previousTheme = theme;
        setTheme(t);
        setSaving(true);
        setErrorMsg(null);

        try {
            const res = await fetch(`${API}/settings/theme`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ theme: t }),
            });

            if (!res.ok) {
                setTheme(previousTheme);
                if (res.status === 401 || res.status === 403) {
                    setErrorMsg("เซสชันหมดอายุ กรุณารีเฟรชหน้าใหม่");
                } else {
                    setErrorMsg(`บันทึกธีมไม่สำเร็จ (${res.status})`);
                }
            }
        } catch {
            setTheme(previousTheme);
            setErrorMsg("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="border-t border-white/10 px-3 py-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <Palette className="h-3 w-3" />
                ธีมเทศกาล
                {(saving || isLoading) && <Loader2 className="ml-auto h-3 w-3 animate-spin text-gold" />}
            </p>
            {errorMsg && (
                <p className="mb-2 flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-300">
                    <AlertCircle className="h-3 w-3 flex-shrink-0" />
                    <span>{errorMsg}</span>
                </p>
            )}
            <div className="flex flex-wrap gap-1.5">
                {THEMES.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => handleSelect(t.id)}
                        disabled={saving || isLoading}
                        className={cn(
                            "flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] transition",
                            theme === t.id
                                ? "border-gold/50 bg-gold/15 text-gold"
                                : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white",
                            (saving || isLoading) && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                        {theme === t.id && <Check className="h-3 w-3" />}
                    </button>
                ))}
            </div>
        </div>
    );
}


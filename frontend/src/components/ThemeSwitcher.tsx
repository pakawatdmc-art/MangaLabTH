"use client";

import { useState } from "react";
import { useTheme, type ThemeType } from "./ThemeProvider";
import { Palette, Check, Loader2 } from "lucide-react";
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
    const { theme, setTheme } = useTheme();
    const [saving, setSaving] = useState(false);

    if (!isPrimaryAdmin) return null;

    const handleSelect = async (t: ThemeType) => {
        if (t === theme || saving) return;

        setSaving(true);
        try {
            const res = await fetch(`${API}/settings/theme`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ theme: t }),
            });

            if (res.ok) {
                setTheme(t);
            }
        } catch {
            /* fail silently */
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="border-t border-white/10 px-3 py-3">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <Palette className="h-3 w-3" />
                ธีมเทศกาล
                {saving && <Loader2 className="ml-auto h-3 w-3 animate-spin text-gold" />}
            </p>
            <div className="flex flex-wrap gap-1.5">
                {THEMES.map((t) => (
                    <button
                        key={t.id}
                        onClick={() => handleSelect(t.id)}
                        disabled={saving}
                        className={cn(
                            "flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] transition",
                            theme === t.id
                                ? "border-gold/50 bg-gold/15 text-gold"
                                : "border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
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

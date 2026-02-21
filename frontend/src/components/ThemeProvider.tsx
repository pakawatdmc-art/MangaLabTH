"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemeType =
    | "default"
    | "newyear"
    | "valentine"
    | "songkran"
    | "mother"
    | "halloween"
    | "loykrathong"
    | "christmas";

interface ThemeCtx {
    theme: ThemeType;
    setTheme: (t: ThemeType) => void;
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeCtx>({
    theme: "default",
    setTheme: () => { },
    isLoading: true,
});

export function useTheme() {
    return useContext(ThemeContext);
}

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeType>("default");
    const [isLoading, setIsLoading] = useState(true);

    // ── Fetch theme from backend (client-side only) ──
    useEffect(() => {
        const controller = new AbortController();

        fetch(`${API}/settings/theme`, { signal: controller.signal })
            .then((r) => r.json())
            .then((data) => {
                if (data?.theme && data.theme !== "default") {
                    setThemeState(data.theme as ThemeType);
                }
            })
            .catch(() => {
                /* API down → stay on default */
            })
            .finally(() => setIsLoading(false));

        return () => controller.abort();
    }, []);

    // ── Apply CSS class to body (client-side only) ──
    useEffect(() => {
        const body = document.body;
        // Remove old theme classes
        body.className = body.className.replace(/\btheme-\w+/g, "");
        if (theme !== "default") {
            body.classList.add(`theme-${theme}`);
        }
    }, [theme]);

    const setTheme = (newTheme: ThemeType) => {
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, isLoading }}>
            {children}
        </ThemeContext.Provider>
    );
}

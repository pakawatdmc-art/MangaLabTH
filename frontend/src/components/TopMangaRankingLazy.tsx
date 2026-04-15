"use client";

import dynamic from "next/dynamic";

const TopMangaRanking = dynamic(() => import("@/components/TopMangaRanking"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-xl bg-[#1A1A1A] ring-1 ring-white/10">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold border-t-transparent" />
    </div>
  ),
});

export default function TopMangaRankingLazy() {
  return <TopMangaRanking />;
}

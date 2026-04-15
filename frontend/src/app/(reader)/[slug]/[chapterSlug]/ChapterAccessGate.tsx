"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { ArrowLeft, Clock, Coins, Loader2, Lock, LogIn, Sparkles } from "lucide-react";
import { getMe, unlockChapter } from "@/lib/api";
import { trackUnlockChapter, trackInsufficientCoins } from "@/lib/analytics";
import { formatChapterNumber, parseUTCDate } from "@/lib/utils";

interface Props {
  chapterId: string;
  chapterNumber: number;
  chapterTitle: string;
  coinPrice: number;
  requiresLogin: boolean;
  manga: { title: string; slug: string };
  unlocksAt?: string | null;
}

export default function ChapterAccessGate({
  chapterId,
  chapterNumber,
  chapterTitle,
  coinPrice,
  requiresLogin,
  manga,
  unlocksAt,
}: Props) {
  const router = useRouter();
  const { getToken, isSignedIn } = useAuth();
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [countdownText, setCountdownText] = useState<string | null>(null);

  useEffect(() => {
    if (unlocksAt) {
      const target = parseUTCDate(unlocksAt).getTime();
      let intv: ReturnType<typeof setInterval>;
      const updateCountdown = () => {
        const now = new Date().getTime();
        const diffMs = target - now;
        if (diffMs > 0) {
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          if (diffDays > 0) {
            setCountdownText(`อ่านฟรีได้ในอีก ${diffDays} วัน ${diffHours} ชั่วโมง ${diffMins} นาที`);
          } else if (diffHours > 0) {
            setCountdownText(`อ่านฟรีได้ในอีก ${diffHours} ชั่วโมง ${diffMins} นาที`);
          } else {
            setCountdownText(`อ่านฟรีได้ในอีก ${diffMins} นาที`);
          }
        } else {
          setCountdownText("ถึงเวลาอ่านฟรีแล้ว! กำลังโหลดข้อมูล...");
          clearInterval(intv);
          setTimeout(() => {
            router.refresh();
          }, 1500);
        }
      };
      updateCountdown();
      intv = setInterval(updateCountdown, 1000);
      return () => clearInterval(intv);
    }
  }, [unlocksAt, router]);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const me = await getMe(token);
          setBalance(me.coin_balance);
        }
      } catch (e) { console.error('[MangaLabTH]', e); }
    })();
  }, [getToken]);

  const signInHref = useMemo(
    () => `/sign-in?redirect_url=${encodeURIComponent(`/${manga.slug}/ตอนที่-${chapterNumber}`)}`,
    [chapterNumber, manga.slug]
  );

  const handleUnlock = async () => {
    setError(null);
    try {
      setUnlocking(true);
      const token = await getToken();
      if (!token) {
        router.push(signInHref);
        return;
      }
      await unlockChapter(chapterId, token);
      trackUnlockChapter(manga.slug, chapterId, coinPrice);

      // Update local balance
      setBalance(prev => prev !== null ? prev - coinPrice : null);

      // Notify Navbar to update balance
      window.dispatchEvent(new Event("balance-update"));

      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "ไม่สามารถปลดล็อกตอนได้";
      if (msg.includes("402") || msg.toLowerCase().includes("insufficient")) {
        trackInsufficientCoins(manga.slug, chapterId, coinPrice);
        setError("ยอดเหรียญของคุณไม่พอสำหรับปลดล็อกตอนนี้ครับ");
      } else if (msg.includes("401") || msg.toLowerCase().includes("login")) {
        setError("กรุณาเข้าสู่ระบบใหม่อีกครั้งครับ");
      } else {
        setError(msg);
      }
    } finally {
      setUnlocking(false);
    }
  };

  const mustLoginFirst = requiresLogin || !isSignedIn;

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-background px-4 py-8 sm:px-6 sm:py-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(212,168,67,0.16),transparent_60%)]" />

      <div className="relative mx-auto w-full max-w-lg">
        <Link
          href={`/manga/${manga.slug}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไป {manga.title}
        </Link>

        <section className="rounded-3xl border border-white/10 bg-surface-100/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold">
            <Sparkles className="h-3.5 w-3.5" />
            Premium Chapter
          </div>

          <h1 className="text-2xl font-bold leading-tight text-white">
            ตอนที่ {formatChapterNumber(chapterNumber)}
          </h1>
          <p className="mt-1 text-sm text-gray-300">{chapterTitle || "ตอนพิเศษ"}</p>

          <div className="mt-5 rounded-2xl border border-gold/25 bg-gold/10 p-4">
            <p className="flex items-center gap-2 text-sm font-medium text-gold">
              <Lock className="h-4 w-4" />
              ตอนนี้ติดเหรียญ
            </p>
            <p className="mt-1 text-sm text-gray-200">
              ปลดล็อกเพื่ออ่านเต็มตอนในราคา
              <span className="ml-1 font-semibold text-gold">{coinPrice} เหรียญ</span>
            </p>
            {balance !== null && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-300">
                <Coins className="h-3.5 w-3.5 text-gold" />
                เหรียญคงเหลือ:
                <span className={`font-semibold ${balance >= coinPrice ? "text-green-400" : "text-red-400"}`}>
                  {balance} เหรียญ
                </span>
                {balance < coinPrice && (
                  <span className="text-xs text-red-400">(ไม่เพียงพอ)</span>
                )}
              </p>
            )}
            
            {unlocksAt && parseUTCDate(unlocksAt) > new Date() && (
              <div className="mt-3 flex flex-col gap-2 rounded-xl bg-black/20 p-3 outline outline-1 outline-white/5">
                 <div className="flex items-center gap-2 text-sm text-gray-300">
                   <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/5">
                     <Clock className="h-3 w-3" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-xs text-gray-500">กำหนดการปลดล็อกฟรี:</span>
                      <span className="font-semibold text-white/90">
                         {parseUTCDate(unlocksAt).toLocaleDateString("th-TH", { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Bangkok' })} เวลา {parseUTCDate(unlocksAt).toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Bangkok' })} น.
                      </span>
                   </div>
                 </div>
                 {countdownText && (
                   <div className="mt-1 flex items-center gap-1.5 px-8 text-xs text-gold/80">
                      <Sparkles className="h-3 w-3" />
                      {countdownText}
                   </div>
                 )}
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
            {mustLoginFirst ? (
              <Link
                href={signInHref}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold px-4 text-sm font-semibold text-black transition hover:bg-gold-light"
              >
                <LogIn className="h-4 w-4" />
                เข้าสู่ระบบเพื่ออ่านตอนนี้
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleUnlock}
                disabled={unlocking}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-gold px-4 text-sm font-semibold text-black transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-60"
              >
                {unlocking ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    กำลังปลดล็อก...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    ปลดล็อก {coinPrice} เหรียญ
                  </>
                )}
              </button>
            )}

            <Link
              href="/coins"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gold/30 bg-surface-200/80 px-4 text-sm font-medium text-gold transition hover:bg-surface-50"
            >
              <Coins className="h-4 w-4" />
              ไปหน้าเติมเหรียญ
            </Link>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-gray-500">
            เว็บไซต์เปิดให้อ่านได้ฟรีทุกคน และจะขอให้ล็อกอินเฉพาะตอนที่ติดเหรียญเท่านั้น
          </p>
        </section>
      </div>
    </div>
  );
}

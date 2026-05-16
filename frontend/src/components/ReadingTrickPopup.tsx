"use client";

import { useState, useEffect } from "react";
import { X, Lightbulb } from "lucide-react";
import { ScaleUp } from "@/components/MotionWrappers";

export default function ReadingTrickPopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if the user has already seen the popup in this browser (acts per-device/IP equivalent)
    const hasSeen = localStorage.getItem("mangalab_trick_seen");
    if (!hasSeen) {
      // Delay showing it by 3 seconds so it doesn't pop up immediately on load
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem("mangalab_trick_seen", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] max-w-sm w-[calc(100vw-2rem)]">
      <ScaleUp delay={0}>
        <div className="relative overflow-hidden rounded-md bg-ink-900/95 backdrop-blur-xl p-5 pl-14 shadow-2xl shadow-black/40">
          {/* Subtle gold accent bar */}
          <span className="absolute left-0 top-0 h-full w-[3px] bg-gold/70" />

          {/* Icon Decoration */}
          <div className="absolute left-5 top-5 text-gold">
            <Lightbulb className="h-5 w-5" />
          </div>

          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute right-3 top-3 text-ink-400 hover:text-ink-100 transition-colors bg-ink-800 hover:bg-ink-700 rounded-full p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold/80 mb-1">
            Tip
          </p>
          <h3 className="text-ink-100 font-semibold text-sm mb-1.5 pr-6">
            ทริคการอ่าน
          </h3>
          <p className="text-xs text-ink-300 leading-relaxed pr-2">
            คุณอาจจะไปหาอ่านตอนเก่าๆ จากที่อื่นเพื่อปูเนื้อเรื่อง แต่ถ้าเป็น <strong className="text-ink-100">&quot;ตอนล่าสุด&quot;</strong> ต้องมาที่ MangaLabTH เท่านั้น เพราะเราอัปเดตตอนใหม่ล่าสุดไวที่สุด
          </p>
        </div>
      </ScaleUp>
    </div>
  );
}

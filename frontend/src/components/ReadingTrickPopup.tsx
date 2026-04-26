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
        <div className="relative overflow-hidden rounded-2xl bg-surface-200/95 shadow-2xl ring-1 ring-gold/30 backdrop-blur-xl p-5 pl-14">
          {/* Icon Decoration */}
          <div className="absolute left-4 top-5 text-gold">
            <Lightbulb className="h-6 w-6 animate-pulse" />
          </div>
          
          {/* Close Button */}
          <button 
            onClick={handleClose}
            className="absolute right-3 top-3 text-gray-400 hover:text-white transition bg-white/5 hover:bg-white/10 rounded-full p-1"
          >
            <X className="h-4 w-4" />
          </button>

          <h3 className="text-white font-bold text-base mb-1.5 pr-6">
            💡 ทริคการอ่าน
          </h3>
          <p className="text-sm text-gray-300 leading-relaxed pr-2">
            คุณอาจจะไปหาอ่านตอนเก่าๆ จากที่อื่นเพื่อปูเนื้อเรื่อง แต่ถ้าเป็น <strong>"ตอนล่าสุด"</strong> ต้องมาที่ MangaLabTH เท่านั้น! เพราะเราอัปเดตตอนใหม่ล่าสุดไวที่สุด ทันใจแน่นอน 🚀
          </p>
        </div>
      </ScaleUp>
    </div>
  );
}

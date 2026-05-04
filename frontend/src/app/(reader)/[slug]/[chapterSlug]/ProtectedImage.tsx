"use client";

import { useEffect, useRef, useState } from "react";

interface ProtectedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  eager?: boolean;
}

/**
 * ProtectedImage — Anti-scraping image component
 * 
 * แทนที่จะโชว์ URL จริงของ R2 ในแท็ก <img> ตรงๆ
 * เราจะใช้ fetch() โหลดรูปมาก่อน แล้วสร้าง blob: URL ชั่วคราว
 * 
 * ผลลัพธ์:
 * - Extension ดูดรูปจะเห็นแค่ blob:http://... ซึ่งใช้ซ้ำไม่ได้
 * - URL จริงของ R2 ไม่ปรากฏใน DOM เลย
 * - ไม่กระทบ UX (ไม่ใช้ Canvas, ไม่กิน CPU เพิ่ม)
 */
export default function ProtectedImage({
  src,
  alt,
  width,
  height,
  eager = false,
}: ProtectedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(eager);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Lazy loading via IntersectionObserver (load when image is near viewport)
  useEffect(() => {
    if (eager) {
      setIsVisible(true);
      return;
    }

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "2000px" } // เริ่มโหลดล่วงหน้า 2000px ก่อนถึงจอ (ให้เร็วขึ้น)
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [eager]);

  // Fetch image and create blob URL
  useEffect(() => {
    if (!isVisible) return;

    let cancelled = false;

    async function loadImage() {
      try {
        const res = await fetch(src);
        if (cancelled) return;

        const blob = await res.blob();
        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      } catch (err) {
        // Fallback: ถ้า fetch ไม่สำเร็จ (CORS ฯลฯ) ก็ใช้ URL ตรงเลย
        if (!cancelled) {
          console.warn("[ProtectedImage] Blob fallback for:", src, err);
          setBlobUrl(src);
        }
      }
    }

    loadImage();

    return () => {
      cancelled = true;
      if (blobUrlRef.current && blobUrlRef.current !== src) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [isVisible, src]);

  // Calculate aspect ratio for placeholder sizing
  const aspectRatio = height / width;

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {blobUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={blobUrl}
          alt={alt}
          className={`w-full h-auto block transition-opacity duration-150 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          draggable={false}
          onLoad={() => setIsLoaded(true)}
          onContextMenu={(e) => e.preventDefault()}
        />
      ) : (
        // Skeleton placeholder ขณะโหลด
        <div
          className="w-full animate-pulse bg-surface-200/50"
          style={{ paddingBottom: `${aspectRatio * 100}%` }}
        />
      )}
    </div>
  );
}

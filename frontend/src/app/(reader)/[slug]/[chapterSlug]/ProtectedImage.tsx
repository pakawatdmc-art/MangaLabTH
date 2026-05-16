"use client";

import { useEffect, useRef, useState } from "react";

interface ProtectedImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  eager?: boolean;
  /** 1-based page number for display + ordering priority */
  pageNumber?: number;
}

/**
 * Global sequential fetch queue — guarantees top-down loading order
 * even when multiple ProtectedImage components mount at once.
 *
 * Rules:
 *  - Page 1 always BYPASSES the queue → starts immediately with no waiting.
 *  - Pages 2..N go through a concurrency-limited queue (default 2 in parallel),
 *    sorted ascending by page number so earlier pages always start first.
 */
const MAX_CONCURRENT = 2;
let activeFetches = 0;
const queue: { priority: number; run: () => void }[] = [];

function pumpQueue() {
  while (activeFetches < MAX_CONCURRENT && queue.length > 0) {
    queue.sort((a, b) => a.priority - b.priority);
    const next = queue.shift()!;
    activeFetches++;
    next.run();
  }
}

function enqueueFetch(priority: number, runner: () => Promise<void>): () => void {
  let cancelled = false;

  // Page 1 (priority 1) always bypasses the queue — starts immediately.
  // This guarantees the very first image begins downloading the moment the
  // component mounts, regardless of how many other pages are also queued.
  if (priority <= 1) {
    (async () => {
      try {
        await runner();
      } catch {
        /* runner handles its own errors */
      }
    })();
    return () => {
      cancelled = true;
    };
  }

  const job = {
    priority,
    run: async () => {
      if (cancelled) {
        activeFetches--;
        pumpQueue();
        return;
      }
      try {
        await runner();
      } finally {
        activeFetches--;
        pumpQueue();
      }
    },
  };
  queue.push(job);
  pumpQueue();
  return () => {
    cancelled = true;
    const idx = queue.indexOf(job);
    if (idx >= 0) queue.splice(idx, 1);
  };
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
  pageNumber,
}: ProtectedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(eager);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
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

  // Fetch image and create blob URL — routed through the global queue
  // so that smaller page numbers (top of chapter) always start first.
  useEffect(() => {
    if (!isVisible) return;

    let cancelled = false;

    const runner = async () => {
      try {
        // HTTP priority hint: high for pages 1–3 (top-of-chapter),
        // auto for the rest — lets the browser/CDN prioritise bandwidth.
        const fetchPriority: RequestPriority =
          pageNumber !== undefined && pageNumber <= 3 ? "high" : "auto";
        const res = await fetch(src, { priority: fetchPriority } as RequestInit & { priority: RequestPriority });
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const blob = await res.blob();
        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
      } catch (err) {
        if (!cancelled) {
          console.warn("[ProtectedImage] Blob fallback for:", src, err);
          // Fallback: use direct URL so the image still renders even if
          // CORS or fetch fails. Won't be blob-protected but at least usable.
          setBlobUrl(src);
        }
      }
    };

    const cancelFromQueue = enqueueFetch(pageNumber ?? 999, runner);

    return () => {
      cancelled = true;
      cancelFromQueue();
      if (blobUrlRef.current && blobUrlRef.current !== src) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [isVisible, src, pageNumber]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-ink-900"
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {blobUrl && !hasError ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={blobUrl}
          alt={alt}
          className={`w-full h-auto block transition-opacity duration-300 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          draggable={false}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          onContextMenu={(e) => e.preventDefault()}
        />
      ) : null}

      {/* Skeleton overlay — covers the area until the <img> has fully painted */}
      {(!blobUrl || !isLoaded) && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-900">
          {/* Shimmer gradient sweep */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-y-0 -left-1/2 w-1/2 animate-[shimmer_1.8s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-ink-800/40 to-transparent" />
          </div>

          {/* Centered status */}
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-700 border-t-gold" aria-hidden="true" />
            <span className="text-[11px] font-medium tracking-wide text-ink-400">
              {pageNumber ? <>กำลังโหลดหน้า <span className="text-ink-200">{pageNumber}</span></> : "กำลังโหลด…"}
            </span>
          </div>
        </div>
      )}

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-900 text-center px-4">
          <span className="text-2xl text-ink-600">!</span>
          <p className="mt-2 text-sm text-ink-300">โหลดหน้านี้ไม่สำเร็จ</p>
          <button
            type="button"
            onClick={() => { setHasError(false); setBlobUrl(null); setIsLoaded(false); }}
            className="mt-2 rounded-xs bg-ink-800 px-3 py-1 text-xs text-ink-200 transition-colors hover:bg-ink-700"
          >
            ลองอีกครั้ง
          </button>
        </div>
      )}
    </div>
  );
}

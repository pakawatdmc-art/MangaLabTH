"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  CloudUpload,
  ImagePlus,
  ListOrdered,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";
import type { Manga, Chapter } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  getMangaList,
  getChaptersForManga,
  getPresignedUploadUrls,
  addPages,
  replacePages,
} from "@/lib/api";

interface FileItem {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  publicUrl?: string;
}

export default function AdminUploadPage() {
  const { getToken } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [files, setFiles] = useState<FileItem[]>([]);
  const filesRef = useRef<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Manga / Chapter selectors
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedMangaId, setSelectedMangaId] = useState("");
  const [selectedChapterId, setSelectedChapterId] = useState("");
  const [loadingMangas, setLoadingMangas] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [initialChapterId, setInitialChapterId] = useState("");

  const selectedManga = mangas.find((m) => m.id === selectedMangaId) || null;
  const selectedChapter = chapters.find((ch) => ch.id === selectedChapterId) || null;
  const isReplaceMode = (selectedChapter?.page_count || 0) > 0;
  const canUpload = Boolean(selectedChapterId) && files.length > 0 && !uploading;

  useEffect(() => {
    filesRef.current = files;
  }, [files]);

  useEffect(() => {
    return () => {
      filesRef.current.forEach((f) => URL.revokeObjectURL(f.preview));
    };
  }, []);

  useEffect(() => {
    const mangaId = searchParams.get("mangaId") || "";
    const chapterId = searchParams.get("chapterId") || "";
    if (mangaId) setSelectedMangaId(mangaId);
    if (chapterId) setInitialChapterId(chapterId);
    // only initialize once from URL
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch manga list on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await getMangaList({ per_page: 100 });
        setMangas(res.items);
      } catch {
        setError("โหลดรายการมังงะล้มเหลว");
      } finally {
        setLoadingMangas(false);
      }
    })();
  }, []);

  // Fetch chapters when manga changes
  useEffect(() => {
    if (!selectedMangaId) {
      setChapters([]);
      setSelectedChapterId("");
      return;
    }
    setLoadingChapters(true);
    setSelectedChapterId("");
    (async () => {
      try {
        const data = await getChaptersForManga(selectedMangaId);
        setChapters(data);
        if (initialChapterId && data.some((ch) => ch.id === initialChapterId)) {
          setSelectedChapterId(initialChapterId);
          setInitialChapterId("");
        }
      } catch {
        setError("โหลดรายการตอนล้มเหลว");
      } finally {
        setLoadingChapters(false);
      }
    })();
  }, [selectedMangaId, initialChapterId]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles)
      .filter((f) => f.type.startsWith("image/"))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
      );
    const items: FileItem[] = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: "pending" as const,
    }));
    setFiles((prev) => [...prev, ...items]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const removed = prev[index];
      URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const moveFile = (fromIndex: number, direction: -1 | 1) => {
    setFiles((prev) => {
      const toIndex = fromIndex + direction;
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const clearAll = () => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setSuccess("");
    setError("");
  };

  const resetUploadState = () => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setUploadProgress({ done: 0, total: 0 });
    setSelectedChapterId("");
    setError("");
    setSuccess("");
  };

  // ── Upload all files ──────────────────────────
  const handleUploadAll = async () => {
    if (!selectedChapterId) {
      setError("กรุณาเลือกมังงะและตอนก่อนอัปโหลด");
      return;
    }
    if (files.length === 0) {
      setError("กรุณาเลือกไฟล์ก่อนอัปโหลด");
      return;
    }

    setUploading(true);
    setError("");
    setSuccess("");
    setUploadProgress({ done: 0, total: files.length });

    try {
      const token = await getToken();
      if (!token) return;

      // 1) Get presigned URLs for all files
      const fileInfos = files.map((item, idx) => {
        const ext = item.file.name.split(".").pop() || "webp";
        const key = `chapters/${selectedChapterId}/${String(idx + 1).padStart(3, "0")}.${ext}`;
        return { key, content_type: item.file.type || "image/webp" };
      });

      const presigned = await getPresignedUploadUrls(fileInfos, token);

      // 2) Upload each file to R2 via presigned PUT
      const updatedFiles = [...files];
      for (let i = 0; i < files.length; i++) {
        updatedFiles[i] = { ...updatedFiles[i], status: "uploading" };
        setFiles([...updatedFiles]);

        try {
          const res = await fetch(presigned[i].upload_url, {
            method: "PUT",
            body: files[i].file,
            headers: { "Content-Type": files[i].file.type || "image/webp" },
          });

          if (!res.ok) throw new Error(`Upload failed: ${res.status}`);

          updatedFiles[i] = {
            ...updatedFiles[i],
            status: "done",
            publicUrl: presigned[i].public_url,
          };
        } catch {
          updatedFiles[i] = { ...updatedFiles[i], status: "error" };
        }

        setFiles([...updatedFiles]);
        setUploadProgress({ done: i + 1, total: files.length });
      }

      // 3) Register pages in DB
      const successFiles = updatedFiles.filter(
        (f) => f.status === "done" && f.publicUrl
      );

      if (successFiles.length > 0) {
        // Get image dimensions
        const pagesData = await Promise.all(
          successFiles.map(async (f, idx) => {
            const dims = await getImageDimensions(f.preview);
            return {
              number: idx + 1,
              image_url: f.publicUrl!,
              width: dims.width,
              height: dims.height,
            };
          })
        );

        const replacingExistingPages = (selectedChapter?.page_count || 0) > 0;
        if (replacingExistingPages) {
          await replacePages(selectedChapterId, pagesData, token);
          setSuccess(
            `บันทึกสำเร็จและแทนที่รูปเดิม ${successFiles.length} หน้า! กำลังรีเฟรชหน้า...`
          );
        } else {
          await addPages(selectedChapterId, pagesData, token);
          setSuccess(`บันทึกสำเร็จ ${successFiles.length} หน้า! กำลังรีเฟรชหน้า...`);
        }
      }

      const failedCount = updatedFiles.filter(
        (f) => f.status === "error"
      ).length;
      if (failedCount > 0) {
        setError(`อัปโหลดล้มเหลว ${failedCount} ไฟล์`);
      }

      if (selectedMangaId) {
        try {
          const latestChapters = await getChaptersForManga(selectedMangaId);
          setChapters(latestChapters);
        } catch {
          // ignore refresh failure, primary upload already completed
        }
      }

      // Auto reset + refresh only when everything was uploaded and saved successfully
      if (successFiles.length > 0 && failedCount === 0) {
        setTimeout(() => {
          resetUploadState();
          router.refresh();
        }, 1000);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปโหลด"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#171b2a_0%,#11141f_48%,#101c1c_100%)] p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.2),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_42%)]" />
        <div className="relative">
          <h1 className="text-2xl font-bold text-white">
            <Upload className="mr-2 inline-block h-6 w-6 text-gold" />
            อัปโหลดรูปภาพตอน
          </h1>
          <p className="mt-1 text-sm text-gray-300">
            โฟลว์ใหม่: เลือกตอน → ลากไฟล์ → ตรวจลำดับ → บันทึกครั้งเดียว
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gold">Step 1</p>
              <p className="mt-1 text-xs text-gray-300">เลือกมังงะและตอนที่ต้องการจัดการ</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gold">Step 2</p>
              <p className="mt-1 text-xs text-gray-300">ลากภาพเข้ามาหรือเลือกหลายไฟล์พร้อมกัน</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gold">Step 3</p>
              <p className="mt-1 text-xs text-gray-300">เรียงลำดับแล้วบันทึกขึ้น Cloudflare R2</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-surface-100/80 p-4 ring-1 ring-white/5 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-white">ขั้นตอนที่ 1: เลือกมังงะและตอน</h2>
            <p className="text-xs text-gray-500">ระบบจะผูกไฟล์ภาพเข้ากับตอนที่เลือกโดยอัตโนมัติ</p>
          </div>
          {selectedChapter && (
            <span className="rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-[11px] font-medium text-gold">
              {isReplaceMode ? "โหมดแทนที่รูปเดิม" : "โหมดเพิ่มรูปใหม่"}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-gray-400">มังงะ *</label>
            {loadingMangas ? (
              <div className="flex h-10 items-center">
                <Loader2 className="h-4 w-4 animate-spin text-gold" />
              </div>
            ) : (
              <select
                value={selectedMangaId}
                onChange={(e) => setSelectedMangaId(e.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
              >
                <option value="">เลือกมังงะ...</option>
                {mangas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">ตอน *</label>
            {loadingChapters ? (
              <div className="flex h-10 items-center">
                <Loader2 className="h-4 w-4 animate-spin text-gold" />
              </div>
            ) : (
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                disabled={!selectedMangaId}
                className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none disabled:opacity-50"
              >
                <option value="">เลือกตอน...</option>
                {chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    ตอนที่ {ch.number}
                    {ch.title ? ` — ${ch.title}` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {selectedManga && selectedChapter && (
          <div className="mt-3 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-300">
            กำลังจัดการ <span className="font-semibold text-white">{selectedManga.title}</span> · ตอนที่
            <span className="font-semibold text-white"> {selectedChapter.number}</span>
            {selectedChapter.title ? ` — ${selectedChapter.title}` : ""}
            {isReplaceMode ? ` (มีรูปเดิม ${selectedChapter.page_count} หน้า)` : ""}
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300">
          <AlertCircle className="mr-1.5 inline-block h-4 w-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <CheckCircle className="mr-1.5 inline-block h-4 w-4" />
          {success}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-surface-100/80 p-4 ring-1 ring-white/5 sm:p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-white">ขั้นตอนที่ 2: เพิ่มไฟล์ภาพ</h2>
          <p className="text-xs text-gray-500">รองรับ JPG, PNG, WebP และเรียงไฟล์ตามชื่อให้ทันที</p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition",
            isDragging
              ? "border-gold bg-gold/10"
              : "border-white/15 bg-surface-200/60 hover:border-gold/35"
          )}
        >
          <CloudUpload className={cn("mb-3 h-10 w-10", isDragging ? "text-gold" : "text-gray-500")} />
          <p className="text-sm text-gray-300">ลากไฟล์ภาพมาวางที่นี่</p>
          <p className="my-2 text-xs text-gray-500">หรือ</p>
          <label
            htmlFor="chapter-pages-input"
            className="cursor-pointer rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm font-medium text-gold transition hover:border-gold hover:bg-gold/20"
          >
            เลือกไฟล์จากเครื่อง
          </label>
          <input
            id="chapter-pages-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
          <p className="mt-3 text-xs text-gray-500">สามารถเลือกไฟล์เพิ่มหลายรอบได้ ระบบจะรวมให้ในชุดเดียว</p>
        </div>
      </section>

      {files.length > 0 && (
        <section className="rounded-2xl border border-white/10 bg-surface-100/80 p-4 ring-1 ring-white/5 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-white">ขั้นตอนที่ 3: ตรวจลำดับก่อนบันทึก</p>
              <p className="text-xs text-gray-500">
                <ImagePlus className="mr-1 inline-block h-3.5 w-3.5" />
                ทั้งหมด {files.length} ไฟล์
                {uploading && (
                  <span className="ml-1 text-gold">
                    ({uploadProgress.done}/{uploadProgress.total})
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={clearAll}
                disabled={uploading}
                className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-300 transition hover:border-white/25 hover:text-white disabled:opacity-50"
              >
                ล้างทั้งหมด
              </button>
              <button
                onClick={handleUploadAll}
                disabled={!canUpload}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    กำลังอัปโหลด...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    บันทึกทั้งหมด
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
            {files.map((item, idx) => (
              <div
                key={`${item.file.name}-${idx}`}
                className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-200 ring-1 ring-white/10"
              >
                <Image
                  src={item.preview}
                  alt={`Page ${idx + 1}`}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 12vw, (min-width: 768px) 18vw, 45vw"
                  className="object-cover"
                />

                <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                  {idx + 1}
                </span>

                {item.status === "pending" && (
                  <div className="absolute left-1.5 right-1.5 top-7 flex items-center justify-between gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                    <div className="flex gap-1">
                      <button
                        onClick={() => moveFile(idx, -1)}
                        disabled={uploading || idx === 0}
                        className="rounded bg-black/70 p-1 text-white disabled:opacity-40"
                        aria-label="เลื่อนขึ้น"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => moveFile(idx, 1)}
                        disabled={uploading || idx === files.length - 1}
                        className="rounded bg-black/70 p-1 text-white disabled:opacity-40"
                        aria-label="เลื่อนลง"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      disabled={uploading}
                      className="rounded bg-red-500/85 p-1 text-white disabled:opacity-40"
                      aria-label="ลบรูป"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {item.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/65">
                    <Loader2 className="h-5 w-5 animate-spin text-gold" />
                  </div>
                )}
                {item.status === "done" && (
                  <div className="absolute right-1.5 top-1.5">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  </div>
                )}
                {item.status === "error" && (
                  <div className="absolute right-1.5 top-1.5">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
                  <p className="truncate text-[10px] text-gray-200">{item.file.name}</p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-gray-500">
            <ListOrdered className="mr-1 inline-block h-3.5 w-3.5" />
            สามารถกดลูกศรขึ้น/ลงเพื่อปรับลำดับหน้าได้ก่อนบันทึก
          </p>
        </section>
      )}
    </div>
  );
}

// Helper: get image dimensions from a blob URL
function getImageDimensions(
  src: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = src;
  });
}

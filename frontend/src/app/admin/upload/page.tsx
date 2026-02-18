"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";
import {
  CheckCircle,
  CloudUpload,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
  AlertCircle,
} from "lucide-react";
import type { Manga, Chapter } from "@/lib/types";
import {
  getMangaList,
  getChaptersForManga,
  getPresignedUploadUrls,
  addPages,
} from "@/lib/api";

interface FileItem {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
  publicUrl?: string;
}

export default function AdminUploadPage() {
  const { getToken } = useAuth();
  const [files, setFiles] = useState<FileItem[]>([]);
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
      } catch {
        setError("โหลดรายการตอนล้มเหลว");
      } finally {
        setLoadingChapters(false);
      }
    })();
  }, [selectedMangaId]);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const imageFiles = Array.from(newFiles).filter((f) =>
      f.type.startsWith("image/")
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

  const clearAll = () => {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setSuccess("");
    setError("");
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

        await addPages(selectedChapterId, pagesData, token);
        setSuccess(
          `อัปโหลดสำเร็จ ${successFiles.length} หน้า!`
        );
      }

      const failedCount = updatedFiles.filter(
        (f) => f.status === "error"
      ).length;
      if (failedCount > 0) {
        setError(`อัปโหลดล้มเหลว ${failedCount} ไฟล์`);
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
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">
          <Upload className="mr-2 inline-block h-6 w-6 text-gold" />
          อัปโหลดรูปภาพ
        </h1>
        <p className="text-sm text-gray-500">
          อัปโหลดภาพหน้ามังงะแบบ Batch ไปยัง Cloudflare R2
        </p>
      </div>

      {/* Select manga & chapter */}
      <div className="mb-6 grid grid-cols-1 gap-3 rounded-xl bg-surface-100 p-4 ring-1 ring-white/5 sm:grid-cols-2">
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
                  ตอนที่ {ch.number}{ch.title ? ` — ${ch.title}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <div className="mb-4 rounded-xl bg-red-500/10 p-4 text-sm text-red-400 ring-1 ring-red-500/20">
          <AlertCircle className="mr-1.5 inline-block h-4 w-4" />
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-400 ring-1 ring-emerald-500/20">
          <CheckCircle className="mr-1.5 inline-block h-4 w-4" />
          {success}
        </div>
      )}

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition ${isDragging
            ? "border-gold bg-gold/5"
            : "border-white/10 bg-surface-100/50 hover:border-gold/30"
          }`}
      >
        <CloudUpload
          className={`mb-3 h-10 w-10 ${isDragging ? "text-gold" : "text-gray-600"}`}
        />
        <p className="mb-1 text-sm text-gray-300">
          ลากไฟล์ภาพมาวางที่นี่ หรือ
        </p>
        <label className="cursor-pointer text-sm font-medium text-gold underline-offset-2 hover:underline">
          เลือกไฟล์
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addFiles(e.target.files)}
          />
        </label>
        <p className="mt-2 text-xs text-gray-600">
          รองรับ JPG, PNG, WebP — ไฟล์จะเรียงตามลำดับชื่อ
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-gray-400">
              <ImagePlus className="mr-1 inline-block h-4 w-4" />
              {files.length} ไฟล์
              {uploading && (
                <span className="ml-2 text-gold">
                  ({uploadProgress.done}/{uploadProgress.total})
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={clearAll}
                disabled={uploading}
                className="rounded-lg bg-surface-200 px-3 py-1.5 text-xs text-gray-400 transition hover:text-white disabled:opacity-50"
              >
                ล้างทั้งหมด
              </button>
              <button
                onClick={handleUploadAll}
                disabled={uploading || !selectedChapterId}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-gold-light disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    กำลังอัปโหลด...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    อัปโหลดทั้งหมด
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
            {files.map((item, idx) => (
              <div
                key={idx}
                className="group relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-200 ring-1 ring-white/5"
              >
                <img
                  src={item.preview}
                  alt={`Page ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
                {item.status === "pending" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => removeFile(idx)}
                      className="rounded-full bg-red-500/80 p-1.5 text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                  {idx + 1}
                </span>
                {item.status === "uploading" && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <Loader2 className="h-5 w-5 animate-spin text-gold" />
                  </div>
                )}
                {item.status === "done" && (
                  <div className="absolute right-1 top-1">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  </div>
                )}
                {item.status === "error" && (
                  <div className="absolute right-1 top-1">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
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

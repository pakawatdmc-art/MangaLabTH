"use client";

import { useState, useCallback } from "react";
import {
  CheckCircle,
  CloudUpload,
  ImagePlus,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

interface FileItem {
  file: File;
  preview: string;
  status: "pending" | "uploading" | "done" | "error";
}

export default function AdminUploadPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);

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

      {/* Select chapter */}
      <div className="mb-6 grid grid-cols-1 gap-3 rounded-xl bg-surface-100 p-4 ring-1 ring-white/5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-gray-400">มังงะ *</label>
          <select className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none">
            <option value="">เลือกมังงะ...</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-400">ตอน *</label>
          <select className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none">
            <option value="">เลือกตอน...</option>
          </select>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`mb-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition ${
          isDragging
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
            </p>
            <div className="flex gap-2">
              <button
                onClick={clearAll}
                className="rounded-lg bg-surface-200 px-3 py-1.5 text-xs text-gray-400 transition hover:text-white"
              >
                ล้างทั้งหมด
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-1.5 text-xs font-semibold text-black transition hover:bg-gold-light">
                <Upload className="h-3.5 w-3.5" />
                อัปโหลดทั้งหมด
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
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => removeFile(idx)}
                    className="rounded-full bg-red-500/80 p-1.5 text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
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
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

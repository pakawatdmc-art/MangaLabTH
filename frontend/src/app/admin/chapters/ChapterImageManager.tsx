"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
    X,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import type { Chapter, Manga } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getChapter, uploadChapterPage, replacePages } from "@/lib/api";

interface FileItem {
    id: string; // Unique ID for tracking mapping
    file?: File; // Only for new uploads
    preview: string; // Blob URL or absolute URL for existing
    status: "existing" | "pending" | "uploading" | "done" | "error";
    publicUrl?: string; // Valid when done or existing
    originalWidth?: number;
    originalHeight?: number;
}

export function ChapterImageManager({
    manga,
    chapter,
    isOpen,
    onClose,
    onSuccess,
}: {
    manga: Manga;
    chapter: Chapter;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const { getToken } = useAuth();
    const [files, setFiles] = useState<FileItem[]>([]);
    const filesRef = useRef<FileItem[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [loadingInitial, setLoadingInitial] = useState(false);

    // Upload state
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const canUpload = files.length > 0 && !uploading;

    useEffect(() => {
        filesRef.current = files;
    }, [files]);

    useEffect(() => {
        return () => {
            filesRef.current.forEach((f) => {
                if (f.file) URL.revokeObjectURL(f.preview);
            });
        };
    }, []);

    // Fetch existing pages when opened
    useEffect(() => {
        if (!isOpen || !chapter) return;

        setLoadingInitial(true);
        setFiles([]);
        setError("");
        setSuccessMsg("");

        getToken().then((currentToken) => {
            if (!currentToken) {
                setError("เซสชันหมดอายุ กรุณาโหลดหน้าเว็บใหม่");
                setLoadingInitial(false);
                return;
            }
            return getChapter(chapter.id, currentToken)
                .then((detail) => {
                    if (detail.pages && detail.pages.length > 0) {
                        const loadedFiles: FileItem[] = detail.pages.map((p) => ({
                            id: p.id || String(p.number),
                            preview: p.image_url,
                            status: "existing",
                            publicUrl: p.image_url,
                            originalWidth: p.width,
                            originalHeight: p.height,
                        }));
                        setFiles(loadedFiles);
                    }
                })
                .catch((err) => {
                    setError("ไม่สามารถโหลดภาพเดิมได้: " + err.message);
                })
                .finally(() => {
                    setLoadingInitial(false);
                });
        });
    }, [isOpen, chapter, getToken]);

    const addFiles = useCallback((newFiles: FileList | File[]) => {
        const imageFiles = Array.from(newFiles)
            .filter((f) => f.type.startsWith("image/"))
            .sort((a, b) =>
                a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
            );
        const items: FileItem[] = imageFiles.map((file) => ({
            id: Math.random().toString(36).substring(7),
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
            if (removed.file) {
                URL.revokeObjectURL(removed.preview);
            }
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
        if (!confirm("คุณต้องการลบภาพทั้งหมดออกจากรายการนี้หรือไม่?")) return;
        files.forEach((f) => {
            if (f.file) URL.revokeObjectURL(f.preview);
        });
        setFiles([]);
        setSuccessMsg("");
        setError("");
    };

    // Helper: get image dimensions
    const getImageDimensions = (src: string): Promise<{ width: number; height: number }> => {
        return new Promise((resolve) => {
            const img = new window.Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = () => resolve({ width: 0, height: 0 });
            img.src = src;
        });
    };

    const handleUploadAndSave = async () => {
        if (!chapter) return;
        if (files.length === 0) {
            setError("กรุณาเลือกไฟล์อย่างน้อย 1 ภาพก่อนบันทึก");
            return;
        }

        setUploading(true);
        setError("");
        setSuccessMsg("");

        try {
            // 1. Filter out only the "pending" files that needs upload
            const pendingUploads = files.filter(f => f.status === "pending" || f.status === "error");
            setUploadProgress({ done: 0, total: pendingUploads.length });

            const currentToken = await getToken();
            if (!currentToken) {
                throw new Error("เซสชันหมดอายุ กรุณาโหลดหน้าเว็บเพื่อเข้าสู่ระบบใหม่");
            }

            const updatedFiles = [...files];

            if (pendingUploads.length > 0) {
                const CONCURRENCY_LIMIT = 5;
                for (let i = 0; i < pendingUploads.length; i += CONCURRENCY_LIMIT) {
                    const batch = pendingUploads.slice(i, i + CONCURRENCY_LIMIT);

                    // Mark as uploading
                    batch.forEach(pendingItem => {
                        const globalIdx = updatedFiles.findIndex(f => f.id === pendingItem.id);
                        updatedFiles[globalIdx] = { ...updatedFiles[globalIdx], status: "uploading" };
                    });
                    setFiles([...updatedFiles]);

                    // Upload in parallel via new backend proxy endpoint (auto-converts to WebP)
                    await Promise.all(batch.map(async (pendingItem) => {
                        const globalIdx = updatedFiles.findIndex(f => f.id === pendingItem.id);
                        const pageNumber = globalIdx + 1;

                        const ext = pendingItem.file!.name.split(".").pop() || "webp";
                        const chNum = Number.isInteger(chapter.number) ? String(chapter.number) : chapter.number.toFixed(1);
                        const key = `manga/${manga.slug}/chapters/${chNum}/page-${String(pageNumber).padStart(3, "0")}.${ext}`;

                        try {
                            const res = await uploadChapterPage(pendingItem.file!, key, currentToken);

                            updatedFiles[globalIdx] = {
                                ...updatedFiles[globalIdx],
                                status: "done",
                                publicUrl: res.public_url,
                            };
                        } catch {
                            updatedFiles[globalIdx] = { ...updatedFiles[globalIdx], status: "error" };
                        }
                    }));

                    setFiles([...updatedFiles]);
                    setUploadProgress({ done: Math.min(i + CONCURRENCY_LIMIT, pendingUploads.length), total: pendingUploads.length });
                }
            }

            const anyErrors = updatedFiles.some(f => f.status === "error");
            if (anyErrors) {
                throw new Error("มีบางไฟล์อัปโหลดไม่สำเร็จ กรุณาลองใหม่เฉพาะไฟล์ที่เกิดข้อผิดพลาด");
            }

            // 2. Prepare Final Pages Array in exact order
            const finalPagesData = await Promise.all(
                updatedFiles.map(async (f, idx) => {
                    let w = f.originalWidth || 0;
                    let h = f.originalHeight || 0;
                    if (!w || !h) {
                        const dims = await getImageDimensions(f.preview);
                        w = dims.width;
                        h = dims.height;
                    }
                    return {
                        number: idx + 1,
                        image_url: f.publicUrl!, // Either from "done" or from "existing"
                        width: w,
                        height: h,
                    };
                })
            );

            // 3. Call replacePages API
            await replacePages(chapter.id, finalPagesData, currentToken);

            setSuccessMsg(`บันทึกทั้ง ${finalPagesData.length} หน้าสำเร็จ!`);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-100 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/10 bg-surface-200/50 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <ImagePlus className="h-5 w-5 text-gold" />
                            จัดการรูปภาพตอน — ตอนที่ {chapter.number} {chapter.title ? `(${chapter.title})` : ""}
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">{manga.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={uploading}
                        className="rounded-full bg-white/5 p-2 text-gray-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {error && (
                        <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-300 flex items-center">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="mb-4 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-300 flex items-center">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            {successMsg}
                        </div>
                    )}

                    {loadingInitial ? (
                        <div className="flex h-40 items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-gold" />
                        </div>
                    ) : (
                        <>
                            {/* Dropzone */}
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setIsDragging(true);
                                }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                className={cn(
                                    "mb-6 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition",
                                    isDragging
                                        ? "border-gold bg-gold/10"
                                        : "border-white/15 bg-surface-200/40 hover:border-gold/35"
                                )}
                            >
                                <CloudUpload className={cn("mb-3 h-8 w-8", isDragging ? "text-gold" : "text-gray-500")} />
                                <p className="text-sm text-gray-300">ลากไฟล์ภาพเพิ่มที่นี่ หรือ</p>
                                <label
                                    htmlFor="manager-upload-input"
                                    className="mt-2 cursor-pointer rounded-lg border border-gold/40 bg-gold/10 px-4 py-1.5 text-sm font-medium text-gold transition hover:border-gold hover:bg-gold/20"
                                >
                                    เลือกไฟล์จากเครื่อง
                                </label>
                                <input
                                    id="manager-upload-input"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => e.target.files && addFiles(e.target.files)}
                                />
                            </div>

                            {/* Toolbar */}
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                                <p className="text-sm text-gray-300 flex items-center">
                                    <ListOrdered className="mr-2 h-4 w-4 text-gold" />
                                    ภาพทั้งหมด {files.length} หน้า
                                    {uploading && uploadProgress.total > 0 && (
                                        <span className="ml-2 text-xs text-gold">
                                            (กำลังอัปโหลด {uploadProgress.done}/{uploadProgress.total})
                                        </span>
                                    )}
                                </p>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={clearAll}
                                        disabled={uploading || files.length === 0}
                                        className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                                    >
                                        ลบภาพทั้งหมด
                                    </button>
                                </div>
                            </div>

                            {/* Grid */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                                {files.length === 0 ? (
                                    <div className="col-span-full py-8 text-center text-sm text-gray-600">
                                        ยังไม่มีรูปภาพสำหรับตอนนี้
                                    </div>
                                ) : (
                                    files.map((item, idx) => (
                                        <div
                                            key={item.id}
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

                                            <span className="absolute left-1.5 top-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm">
                                                {idx + 1}
                                            </span>

                                            {!uploading && (
                                                <div className="absolute left-1.5 right-1.5 top-7 flex items-center justify-between gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => moveFile(idx, -1)}
                                                            disabled={idx === 0}
                                                            className="rounded bg-black/80 p-1 text-white hover:bg-black disabled:opacity-40"
                                                            title="เลื่อนขึ้น"
                                                        >
                                                            <ChevronUp className="h-3 w-3" />
                                                        </button>
                                                        <button
                                                            onClick={() => moveFile(idx, 1)}
                                                            disabled={idx === files.length - 1}
                                                            className="rounded bg-black/80 p-1 text-white hover:bg-black disabled:opacity-40"
                                                            title="เลื่อนลง"
                                                        >
                                                            <ChevronDown className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => removeFile(idx)}
                                                        className="rounded bg-red-500/90 p-1 text-white hover:bg-red-500"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            )}

                                            {/* Status Indicators */}
                                            {item.status === "uploading" && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/65 backdrop-blur-sm">
                                                    <Loader2 className="h-5 w-5 animate-spin text-gold" />
                                                </div>
                                            )}
                                            {item.status === "existing" && (
                                                <div className="absolute right-1.5 top-1.5 rounded bg-emerald-500/20 px-1 py-0.5 text-[8px] text-emerald-400">
                                                    ภาพเดิม
                                                </div>
                                            )}
                                            {item.status === "done" && (
                                                <div className="absolute right-1.5 top-1.5">
                                                    <CheckCircle className="h-4 w-4 text-emerald-400 drop-shadow-md" />
                                                </div>
                                            )}
                                            {item.status === "error" && (
                                                <div className="absolute right-1.5 top-1.5">
                                                    <AlertCircle className="h-4 w-4 text-red-400 drop-shadow-md" />
                                                </div>
                                            )}

                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-2 pb-1.5 pt-4">
                                                <p className="truncate text-[9px] text-gray-300">
                                                    {item.file ? item.file.name : `หน้า ${idx + 1} (เดิม)`}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-surface-200/30 px-6 py-4">
                    <button
                        onClick={onClose}
                        disabled={uploading}
                        className="rounded-xl px-4 py-2 text-sm text-gray-400 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleUploadAndSave}
                        disabled={!canUpload || loadingInitial}
                        className="inline-flex items-center gap-2 rounded-xl bg-gold px-6 py-2 text-sm font-semibold text-black shadow-lg shadow-gold/20 transition hover:bg-gold-light disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <Upload className="h-4 w-4" />
                                บันทึกการจัดเรียง
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

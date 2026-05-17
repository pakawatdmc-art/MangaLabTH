"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    rectSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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
import { getChapter, uploadChapterPage, replacePages, cleanupOrphanedFiles } from "@/lib/api";

interface FileItem {
    id: string; // Unique ID for tracking mapping
    file?: File; // Only for new uploads
    preview: string; // Blob URL or absolute URL for existing
    status: "existing" | "pending" | "uploading" | "done" | "error";
    publicUrl?: string; // Valid when done or existing
    r2Key?: string; // R2 storage key (for cleanup of orphaned files)
    originalWidth?: number;
    originalHeight?: number;
}

interface SortableImageCardProps {
    item: FileItem;
    idx: number;
    uploading: boolean;
    totalFiles: number;
    moveFile: (fromIndex: number, direction: -1 | 1) => void;
    removeFile: (index: number) => void;
}

function SortableImageCard({ item, idx, uploading, totalFiles, moveFile, removeFile }: SortableImageCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id, disabled: uploading });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : "auto",
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "group relative aspect-[2/3] overflow-hidden rounded-lg bg-ink-800 ring-1 ring-ink-700 transition-all shadow-sm",
                isDragging ? "ring-gold cursor-grabbing shadow-lg scale-105" : "cursor-grab hover:ring-gold/50 hover:shadow-md"
            )}
        >
            <Image
                src={item.preview}
                alt={`Page ${idx + 1}`}
                fill
                unoptimized
                sizes="(min-width: 1024px) 12vw, (min-width: 768px) 18vw, 45vw"
                className="object-cover pointer-events-none"
            />

            <span className="absolute left-1.5 top-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm pointer-events-none z-10">
                {idx + 1}
            </span>

            {!uploading && (
                <div 
                    className="absolute left-1.5 right-1.5 top-7 flex items-center justify-between gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 z-20"
                    onPointerDown={(e) => e.stopPropagation()}
                >
                    <div className="flex gap-1" onPointerDown={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => moveFile(idx, -1)}
                            disabled={idx === 0}
                            className="rounded bg-black/80 p-1 text-white hover:bg-black disabled:opacity-40"
                            title="เลื่อนขึ้น"
                        >
                            <ChevronUp className="h-3 w-3 pointer-events-none" />
                        </button>
                        <button
                            type="button"
                            onClick={() => moveFile(idx, 1)}
                            disabled={idx === totalFiles - 1}
                            className="rounded bg-black/80 p-1 text-white hover:bg-black disabled:opacity-40"
                            title="เลื่อนลง"
                        >
                            <ChevronDown className="h-3 w-3 pointer-events-none" />
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="rounded bg-red-500/90 p-1 text-white hover:bg-red-500"
                        title="ลบ"
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <Trash2 className="h-3 w-3 pointer-events-none" />
                    </button>
                </div>
            )}

            {item.status === "uploading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink-950/60 backdrop-blur-sm z-30">
                    <Loader2 className="h-5 w-5 animate-spin text-gold" />
                </div>
            )}
            {item.status === "existing" && (
                <div className="absolute right-1.5 top-1.5 rounded bg-emerald-500/10 px-1 py-0.5 text-[8px] font-medium text-emerald-500 z-10 pointer-events-none">
                    ภาพเดิม
                </div>
            )}
            {item.status === "done" && (
                <div className="absolute right-1.5 top-1.5 z-10 pointer-events-none bg-ink-950 rounded-full">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                </div>
            )}
            {item.status === "error" && (
                <div className="absolute right-1.5 top-1.5 pointer-events-none z-10 bg-ink-950 rounded-full">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
            )}

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950 to-transparent px-2 pb-1.5 pt-4 pointer-events-none z-10">
                <p className="truncate text-[9px] text-ink-300">
                    {item.file ? item.file.name : `หน้า ${idx + 1} (เดิม)`}
                </p>
            </div>
        </div>
    );
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
    const hadExistingPages = useRef(false);
    const savedSuccessfully = useRef(false);
    const [isDragging, setIsDragging] = useState(false);
    const [loadingInitial, setLoadingInitial] = useState(false);
    
    // Sortable sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setFiles((items) => {
                const oldIndex = items.findIndex((i) => i.id === active.id);
                const newIndex = items.findIndex((i) => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    // Upload state
    const [uploading, setUploading] = useState(false);
    const uploadingRef = useRef(false);
    const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 });
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const canUpload = !uploading && (files.length > 0 || hadExistingPages.current);

    useEffect(() => {
        filesRef.current = files;
    }, [files]);

    useEffect(() => {
        return () => {
            // Revoke all blob URLs on unmount to prevent memory leaks
            filesRef.current.forEach((f) => {
                if (f.file && f.preview.startsWith("blob:")) URL.revokeObjectURL(f.preview);
            });
        };
    }, []);

    // Fetch existing pages when opened; clean up blob URLs when closed
    useEffect(() => {
        if (!isOpen || !chapter) {
            // Revoke blob URLs when modal closes
            filesRef.current.forEach((f) => {
                if (f.file && f.preview.startsWith("blob:")) URL.revokeObjectURL(f.preview);
            });
            // Cleanup orphaned R2 files if save was not completed
            if (!savedSuccessfully.current) {
                const orphanedKeys = filesRef.current
                    .filter(f => f.status === "done" && f.r2Key)
                    .map(f => f.r2Key!);
                if (orphanedKeys.length > 0) {
                    getToken().then(token => {
                        if (token) {
                            cleanupOrphanedFiles(orphanedKeys, token).catch(err => {
                                console.error("[ChapterImageManager] Orphan cleanup failed:", err);
                            });
                        }
                    });
                }
            }
            return;
        }

        setLoadingInitial(true);
        setFiles([]);
        hadExistingPages.current = false;
        savedSuccessfully.current = false;
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
                        hadExistingPages.current = true;
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
            id: crypto.randomUUID(),
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
            if (!removed) return prev;
            if (removed.file && removed.preview.startsWith("blob:")) {
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
            if (!confirm("คุณต้องการลบภาพทั้งหมดของตอนนี้ออกจากระบบหรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้")) {
                return;
            }
        }
        
        // Prevent double click race conditions
        if (uploadingRef.current) return;
        uploadingRef.current = true;

        setUploading(true);
        setError("");
        setSuccessMsg("");

        let updatedFiles = [...files];

        try {
            // 1. Filter out only the "pending" files that needs upload
            const pendingUploads = files.filter(f => f.status === "pending" || f.status === "error");
            setUploadProgress({ done: 0, total: pendingUploads.length });

            // Pre-validate token before starting
            const initialToken = await getToken();
            if (!initialToken) {
                throw new Error("เซสชันหมดอายุ กรุณาโหลดหน้าเว็บเพื่อเข้าสู่ระบบใหม่");
            }

            if (pendingUploads.length > 0) {
                const CONCURRENCY_LIMIT = 5;
                for (let i = 0; i < pendingUploads.length; i += CONCURRENCY_LIMIT) {
                    // Refresh token for every batch to prevent JWT expiry during long uploads
                    const batchToken = await getToken();
                    if (!batchToken) {
                        throw new Error("เซสชันหมดอายุระหว่างอัปโหลด กรุณาโหลดหน้าเว็บใหม่");
                    }

                    const batch = pendingUploads.slice(i, i + CONCURRENCY_LIMIT);

                    // Mark as uploading
                    batch.forEach(pendingItem => {
                        const globalIdx = updatedFiles.findIndex(f => f.id === pendingItem.id);
                        updatedFiles[globalIdx] = { ...updatedFiles[globalIdx], status: "uploading" };
                    });
                    setFiles([...updatedFiles]);

                    // Upload in parallel via new backend proxy endpoint (auto-converts to WebP)
                    // BUG #1 fix: Use UUID-based keys instead of index-based to prevent
                    // collision when drag-reordering + retrying failed uploads
                    await Promise.all(batch.map(async (pendingItem) => {
                        const globalIdx = updatedFiles.findIndex(f => f.id === pendingItem.id);

                        const chNum = Number.isInteger(chapter.number) ? String(chapter.number) : chapter.number.toFixed(1);
                        const uniqueId = crypto.randomUUID().slice(0, 8);
                        const key = `manga/${manga.slug}/chapters/${chNum}/${uniqueId}.webp`;

                        try {
                            const res = await uploadChapterPage(pendingItem.file!, key, batchToken);

                            updatedFiles[globalIdx] = {
                                ...updatedFiles[globalIdx],
                                status: "done",
                                publicUrl: res.public_url,
                                r2Key: res.key,
                                originalWidth: res.width,
                                originalHeight: res.height,
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

            // 3. Call replacePages API (refresh token in case uploads took a long time)
            const finalToken = await getToken();
            if (!finalToken) {
                throw new Error("เซสชันหมดอายุ กรุณาโหลดหน้าเว็บใหม่");
            }
            await replacePages(chapter.id, finalPagesData, finalToken);
            savedSuccessfully.current = true;

            setSuccessMsg(`บันทึกทั้ง ${finalPagesData.length} หน้าสำเร็จ!`);
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 1500);

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก");
        } finally {
            setUploading(false);
            uploadingRef.current = false;
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm">
            <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-ink-700/50 bg-ink-800 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-ink-700/50 bg-ink-950 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-ink-50 flex items-center gap-2">
                            <ImagePlus className="h-5 w-5 text-gold-dark" />
                            จัดการรูปภาพตอน — ตอนที่ {chapter.number} {chapter.title ? `(${chapter.title})` : ""}
                        </h2>
                        <p className="text-xs text-ink-500 mt-1 font-medium">{manga.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={uploading}
                        className="rounded-full bg-ink-800 border border-ink-700/50 p-2 text-ink-400 shadow-sm transition hover:bg-ink-800 hover:text-ink-50 disabled:opacity-50"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-5">
                    {error && (
                        <div className="mb-4 rounded-xl border border-red-900/50 bg-red-900/20 p-4 text-sm text-red-400 flex items-center">
                            <AlertCircle className="mr-2 h-4 w-4" />
                            {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-500 flex items-center">
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
                                        ? "border-gold bg-amber-500/10"
                                        : "border-ink-700 bg-ink-950 hover:border-gold/30 hover:bg-ink-800"
                                )}
                            >
                                <CloudUpload className={cn("mb-3 h-8 w-8", isDragging ? "text-gold" : "text-ink-500")} />
                                <p className="text-sm text-ink-400">ลากไฟล์ภาพเพิ่มที่นี่ หรือ</p>
                                <label
                                    htmlFor="manager-upload-input"
                                    className="mt-2 cursor-pointer rounded-lg border border-amber-500/30 bg-ink-800 px-4 py-1.5 text-sm font-medium text-amber-500 shadow-sm transition hover:border-amber-500 hover:bg-ink-800"
                                >
                                    เลือกไฟล์จากเครื่อง
                                </label>
                                <input
                                    id="manager-upload-input"
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files) addFiles(e.target.files);
                                        e.target.value = "";
                                    }}
                                />
                            </div>

                            {/* Toolbar */}
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-ink-800 pb-3">
                                <p className="text-sm text-ink-50 flex items-center font-medium">
                                    <ListOrdered className="mr-2 h-4 w-4 text-gold-dark" />
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
                                        className="rounded-lg border border-ink-700/50 bg-ink-950 px-3 py-1.5 text-xs font-medium text-ink-400 shadow-sm transition hover:bg-red-900/20 hover:text-red-400 hover:border-red-900/50 disabled:opacity-50"
                                    >
                                        ลบภาพทั้งหมด
                                    </button>
                                </div>
                            </div>

                            {/* Grid */}
                            <DndContext 
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                                    <SortableContext 
                                        items={files.map((f) => f.id)}
                                        strategy={rectSortingStrategy}
                                    >
                                        {files.length === 0 ? (
                                            <div className="col-span-full py-8 text-center text-sm text-ink-500">
                                                ยังไม่มีรูปภาพสำหรับตอนนี้
                                            </div>
                                        ) : (
                                            files.map((item, idx) => (
                                                <SortableImageCard
                                                    key={item.id}
                                                    item={item}
                                                    idx={idx}
                                                    uploading={uploading}
                                                    totalFiles={files.length}
                                                    moveFile={moveFile}
                                                    removeFile={removeFile}
                                                />
                                            ))
                                        )}
                                    </SortableContext>
                                </div>
                            </DndContext>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 border-t border-ink-700/50 bg-ink-950 px-6 py-4">
                    <button
                        onClick={onClose}
                        disabled={uploading}
                        className="rounded-xl border border-ink-700/50 bg-ink-800 px-4 py-2 text-sm font-medium text-ink-300 shadow-sm transition hover:bg-ink-800 hover:text-ink-50 disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleUploadAndSave}
                        disabled={!canUpload || loadingInitial}
                        className="inline-flex items-center gap-2 rounded-xl bg-gold-dark px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
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

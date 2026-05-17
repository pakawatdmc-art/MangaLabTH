"use client";

import { cn, slugify } from "@/lib/utils";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import { Eye, EyeOff, Edit2, BookOpen, Loader2, Plus, Trash2, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/types";
import type { Manga, MangaCategory, MangaStatus } from "@/lib/types";
import { getMangaList, createManga, updateManga, deleteManga } from "@/lib/api";
import { uploadCoverImage } from "@/lib/api";

export default function AdminMangaPage() {
  const { getToken } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingManga, setEditingManga] = useState<Manga | null>(null);
  const [saving, setSaving] = useState(false);

  // New state for file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  // Search, filter & pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Derived: filtered & paginated manga list
  const filteredMangas = [...mangas].reverse().filter((m) => {
    const matchSearch = !searchQuery || m.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = !filterCategory || m.category === filterCategory;
    const matchStatus = !filterStatus || m.status === filterStatus;
    return matchSearch && matchCategory && matchStatus;
  });
  const totalPages = Math.max(1, Math.ceil(filteredMangas.length / ITEMS_PER_PAGE));
  const paginatedMangas = filteredMangas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Open form automatically when sidebar "เพิ่มเรื่องใหม่" button is clicked.
  // Strip the query param so a refresh doesn't keep re-opening the form.
  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setShowForm(true);
      router.replace(pathname, { scroll: false });
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [searchParams, router, pathname]);

  const fetchMangas = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await getMangaList({ per_page: 100 }, token || undefined);
      setMangas(res.items);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลมังงะล้มเหลว");
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  // Reset form when opening/closing
  useEffect(() => {
    if (!showForm) {
      setSelectedFile(null);
      setPreviewUrl("");
      setEditingManga(null);
    }
  }, [showForm]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    fetchMangas();
  }, [fetchMangas]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);

    try {
      const token = await getToken();
      if (!token) return;

      let coverUrl = (form.get("cover_url") as string) || "";

      // Upload image if selected
      if (selectedFile) {
        coverUrl = await uploadCoverImage(selectedFile, token);
      }

      const title = (form.get("title") as string).trim();
      const slug = slugify(title);

      const data: Partial<Manga> = {
        title,
        slug,
        author: (form.get("author") as string) || "",
        artist: (form.get("artist") as string) || "",
        category: (form.get("category") as string) as MangaCategory || "action",
        sub_category: (form.get("sub_category") as string) as MangaCategory || "action",
        status: (form.get("status") as string) as MangaStatus || "ongoing",
        description: (form.get("description") as string) || "",
        is_visible: form.get("is_visible") === "on",
      };

      if (coverUrl) {
        data.cover_url = coverUrl;
      }

      if (editingManga) {
        await updateManga(editingManga.id, data, token);
      } else {
        await createManga(data as Manga, token);
      }
      setShowForm(false);
      await fetchMangas();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "บันทึกข้อมูลมังงะล้มเหลว");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (manga: Manga) => {
    setEditingManga(manga);
    setPreviewUrl(manga.cover_url);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleVisibility = async (manga: Manga) => {
    try {
      const token = await getToken();
      if (!token) return;
      await updateManga(manga.id, { is_visible: !manga.is_visible }, token);
      await fetchMangas();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "เปลี่ยนสถานะการมองเห็นล้มเหลว");
    }
  };



  const handleDelete = async (manga: Manga) => {
    if (!confirm(`ลบมังงะ "${manga.title}"?`)) return;
    try {
      const token = await getToken();
      if (!token) return;
      await deleteManga(manga.id, token);
      await fetchMangas();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ลบมังงะล้มเหลว");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold-dark" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      <section className="relative overflow-hidden rounded-xl border border-ink-700/50 bg-ink-800 p-5 sm:p-6 shadow-sm">
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ink-50">
              <BookOpen className="mr-2 inline-block h-6 w-6 text-gold-dark" />
              จัดการมังงะ
            </h1>
            <p className="mt-1 text-sm text-ink-400">
              เพิ่ม ลบ และดูรายการมังงะทั้งหมดในระบบ — {mangas.length} เรื่อง
            </p>
          </div>
          <button
            onClick={() => {
              setError("");
              setShowForm(!showForm);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-gold-dark px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
          >
            <Plus className="h-4 w-4" />
            {showForm ? "ปิดฟอร์ม" : "เพิ่มมังงะ"}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Create/Edit form */}
      {showForm && (
        <div className="mb-6 rounded-xl bg-ink-900 p-5 border border-ink-800 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-ink-50">
            {editingManga ? `แก้ไขมังงะ: ${editingManga.title}` : "เพิ่มมังงะใหม่"}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-300">ชื่อเรื่อง *</label>
              <input
                type="text"
                name="title"
                required
                defaultValue={editingManga?.title || ""}
                className="h-10 w-full rounded-lg border border-ink-700/50 bg-ink-950 px-3 text-sm text-ink-50 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
                placeholder="ชื่อมังงะ"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-300">ผู้แต่ง</label>
              <input
                type="text"
                name="author"
                defaultValue={editingManga?.author || ""}
                className="h-10 w-full rounded-lg border border-ink-700/50 bg-ink-950 px-3 text-sm text-ink-50 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-300">ผู้วาด</label>
              <input
                type="text"
                name="artist"
                defaultValue={editingManga?.artist || ""}
                className="h-10 w-full rounded-lg border border-ink-700/50 bg-ink-950 px-3 text-sm text-ink-50 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-300">หมวดหมู่</label>
              <select
                name="category"
                defaultValue={editingManga?.category || "action"}
                className="h-10 w-full rounded-lg border border-ink-700/50 bg-ink-950 px-3 text-sm text-ink-50 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
              >
                {(Object.entries(CATEGORY_LABELS) as [MangaCategory, string][]).map(
                  ([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-300">หมวดหมู่ย่อย</label>
              <select
                name="sub_category"
                defaultValue={editingManga?.sub_category || "action"}
                className="h-10 w-full rounded-lg border border-ink-700/50 bg-ink-950 px-3 text-sm text-ink-50 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
              >
                {(Object.entries(CATEGORY_LABELS) as [MangaCategory, string][]).map(
                  ([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-300">สถานะ</label>
              <select
                name="status"
                defaultValue={editingManga?.status || "ongoing"}
                className="h-10 w-full rounded-lg border border-ink-700/50 bg-ink-950 px-3 text-sm text-ink-50 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
              >
                {(Object.entries(STATUS_LABELS) as [MangaStatus, string][]).map(
                  ([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  )
                )}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-ink-300">เรื่องย่อ</label>
              <textarea
                name="description"
                defaultValue={editingManga?.description || ""}
                className="w-full rounded-lg border border-ink-700/50 bg-ink-950 px-3 py-2 text-sm text-ink-50 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2 flex items-center gap-2">
              <input
                type="checkbox"
                name="is_visible"
                id="is_visible"
                defaultChecked={editingManga ? editingManga.is_visible : true}
                className="h-4 w-4 rounded border-ink-700/50 bg-ink-950 text-gold focus:ring-gold"
              />
              <label htmlFor="is_visible" className="text-sm text-ink-300">แสดงให้ผู้อ่านเห็น (เปิดการใช้งานสาธารณะ)</label>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-ink-300">รูปภาพปก (R2)</label>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  {previewUrl ? (
                    <div className="relative aspect-[2/3] w-32 rounded overflow-hidden border border-ink-800 mb-2">
                      <Image
                        src={previewUrl}
                        alt="Preview"
                        fill
                        unoptimized
                        sizes="128px"
                        className="object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (previewUrl.startsWith("blob:")) {
                            URL.revokeObjectURL(previewUrl);
                          }
                          setSelectedFile(null);
                          setPreviewUrl("");
                        }}
                        className="absolute top-1 right-1 bg-ink-900 p-1 rounded-full text-red-400 shadow-sm hover:bg-red-900/50 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : null}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="w-full bg-ink-950 border border-ink-800 rounded px-3 py-2 text-sm text-ink-300 focus:outline-none focus:border-gold focus:ring-1 focus:ring-gold file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-ink-800 file:text-ink-200 hover:file:bg-ink-700"
                  />
                  <p className="text-[10px] text-ink-400 mt-1">
                    รองรับ JPG, PNG, WebP (จะถูกอัปโหลดไปยัง Cloudflare R2 อัตโนมัติ)
                  </p>
                </div>
              </div>
              <input type="hidden" name="cover_url" value={previewUrl.startsWith("blob:") ? "" : previewUrl} />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-gold-dark px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-ink-700/50 bg-ink-950 px-4 py-2 text-sm font-medium text-ink-300 shadow-sm transition hover:bg-ink-800 hover:text-ink-50"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="ค้นหาชื่อเรื่อง..."
            className="h-10 w-full rounded-lg border border-ink-700/50 bg-ink-800 pl-9 pr-3 text-sm text-ink-50 shadow-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 rounded-lg border border-ink-700/50 bg-ink-800 px-3 text-sm text-ink-300 shadow-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
          >
            <option value="">ทุกหมวดหมู่</option>
            {(Object.entries(CATEGORY_LABELS) as [MangaCategory, string][]).map(
              ([v, l]) => (
                <option key={v} value={v}>{l}</option>
              )
            )}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="h-10 rounded-lg border border-ink-700/50 bg-ink-800 px-3 text-sm text-ink-300 shadow-sm focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20"
          >
            <option value="">ทุกสถานะ</option>
            {(Object.entries(STATUS_LABELS) as [MangaStatus, string][]).map(
              ([v, l]) => (
                <option key={v} value={v}>{l}</option>
              )
            )}
          </select>
          <span className="rounded-full bg-ink-800 px-3 py-1.5 text-xs font-medium text-ink-300 whitespace-nowrap">
            {filteredMangas.length} เรื่อง
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl bg-ink-800 border border-ink-700/50 shadow-sm">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-ink-700/50 bg-ink-950 text-left text-xs text-ink-400 font-medium">
              <th className="w-12 px-4 py-3 text-center whitespace-nowrap">#</th>
              <th className="px-4 py-3">ปก</th>
              <th className="px-4 py-3">ชื่อเรื่อง</th>
              <th className="px-4 py-3">หมวดหมู่</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3 text-center">ตอน</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800/50">
            {paginatedMangas.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-ink-400">
                  {searchQuery || filterCategory || filterStatus
                    ? "ไม่พบมังงะที่ตรงกับตัวกรอง"
                    : "ยังไม่มีมังงะ — กดปุ่ม \"เพิ่มมังงะ\" เพื่อเริ่มต้น"}
                </td>
              </tr>
            ) : (
              paginatedMangas.map((m, index) => (
                <tr key={m.id} className="hover:bg-ink-800/50 transition-colors">
                  <td className="px-4 py-2 text-center font-medium text-ink-500 text-xs">
                    {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                  </td>
                  <td className="px-4 py-2">
                    <div className="h-12 w-8 overflow-hidden rounded bg-ink-800 border border-ink-700">
                      {m.cover_url && (
                        <Image
                          src={m.cover_url}
                          alt={`ปก ${m.title}`}
                          width={32}
                          height={48}
                          unoptimized
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 font-medium text-ink-50 max-w-xs">
                    <p className="truncate">{m.title}</p>
                  </td>
                  <td className="px-4 py-2 text-ink-300">
                    <div className="flex flex-col">
                      <span className="text-xs">{CATEGORY_LABELS[m.category]}</span>
                      <span className="text-xs text-ink-500">
                        {CATEGORY_LABELS[m.sub_category] || "-"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-ink-300 text-xs">
                    {STATUS_LABELS[m.status]}
                  </td>
                  <td className="px-4 py-2 text-center text-ink-400">{m.chapter_count ?? 0}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => handleToggleVisibility(m)}
                        title={m.is_visible ? "ซ่อน" : "แสดง"}
                        className={cn(
                          "rounded p-1.5 transition",
                          m.is_visible ? "text-gold hover:bg-gold/10" : "text-ink-500 hover:text-ink-200 hover:bg-ink-800"
                        )}
                      >
                        {m.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => handleEdit(m)}
                        title="แก้ไข"
                        className="rounded p-1.5 text-ink-400 transition hover:bg-ink-800 hover:text-ink-200"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(m)}
                        title="ลบ"
                        className="rounded p-1.5 text-ink-400 transition hover:bg-red-900/30 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-ink-800 px-4 py-3">
            <p className="text-xs text-ink-400">
              แสดง {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredMangas.length)} จาก {filteredMangas.length} เรื่อง
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-800 text-ink-300 transition hover:bg-ink-800 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((p, idx, arr) => (
                  <span key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && (
                      <span className="px-1 text-ink-600">…</span>
                    )}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition",
                        p === currentPage
                          ? "bg-gold/10 text-gold border border-gold/20"
                          : "border border-ink-800 text-ink-300 hover:bg-ink-800"
                      )}
                    >
                      {p}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-ink-800 text-ink-300 transition hover:bg-ink-800 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

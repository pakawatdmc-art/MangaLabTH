"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Image from "next/image";
import { BookOpen, Loader2, Plus, Trash2 } from "lucide-react";
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/types";
import type { Manga, MangaCategory, MangaStatus } from "@/lib/types";
import { getMangaList, createManga, deleteManga } from "@/lib/api";
import { uploadCoverImage } from "@/lib/api";

export default function AdminMangaPage() {
  const { getToken } = useAuth();
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // New state for file upload
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  const fetchMangas = async () => {
    try {
      const res = await getMangaList({ per_page: 100 });
      setMangas(res.items);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลมังงะล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  // Reset form when opening/closing
  useEffect(() => {
    if (!showForm) {
      setSelectedFile(null);
      setPreviewUrl("");
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
  }, []);

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

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
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

      const data = {
        title: form.get("title") as string,
        slug: form.get("slug") as string,
        author: (form.get("author") as string) || "",
        artist: (form.get("artist") as string) || "",
        category: (form.get("category") as string) as MangaCategory || "action",
        status: (form.get("status") as string) as MangaStatus || "ongoing",
        description: (form.get("description") as string) || "",
        cover_url: coverUrl,
      };

      await createManga(data, token);
      setShowForm(false);
      await fetchMangas();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "สร้างมังงะล้มเหลว");
    } finally {
      setSaving(false);
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
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#1a1f31_0%,#131929_50%,#111826_100%)] p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.18),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.14),transparent_45%)]" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">
              <BookOpen className="mr-2 inline-block h-6 w-6 text-gold" />
              จัดการมังงะ
            </h1>
            <p className="mt-1 text-sm text-gray-300">
              เพิ่ม ลบ และดูรายการมังงะทั้งหมดในระบบ — {mangas.length} เรื่อง
            </p>
          </div>
          <button
            onClick={() => {
              setError("");
              setShowForm(!showForm);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-gold-light"
          >
            <Plus className="h-4 w-4" />
            {showForm ? "ปิดฟอร์ม" : "เพิ่มมังงะ"}
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="mb-6 rounded-xl bg-surface-100 p-5 ring-1 ring-white/10">
          <h3 className="mb-4 text-sm font-semibold text-white">เพิ่มมังงะใหม่</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">ชื่อเรื่อง *</label>
              <input
                type="text"
                name="title"
                required
                className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
                placeholder="ชื่อมังงะ"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Slug *</label>
              <input
                type="text"
                name="slug"
                required
                className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
                placeholder="my-manga-slug"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">ผู้แต่ง</label>
              <input
                type="text"
                name="author"
                className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">ผู้วาด</label>
              <input
                type="text"
                name="artist"
                className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">หมวดหมู่</label>
              <select
                name="category"
                className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
              >
                {(Object.entries(CATEGORY_LABELS) as [MangaCategory, string][]).map(
                  ([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  )
                )}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">สถานะ</label>
              <select
                name="status"
                className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
              >
                {(Object.entries(STATUS_LABELS) as [MangaStatus, string][]).map(
                  ([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  )
                )}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-400">เรื่องย่อ</label>
              <textarea
                name="description"
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-surface-200 px-3 py-2 text-sm text-white focus:border-gold/60 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-gray-400">รูปภาพปก (R2)</label>
              <div className="flex gap-4 items-start">
                <div className="flex-1">
                  {previewUrl ? (
                    <div className="relative aspect-[2/3] w-32 rounded overflow-hidden border border-white/10 mb-2">
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
                        className="absolute top-1 right-1 bg-black/50 p-1 rounded-full hover:bg-red-500/80 transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : null}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-gold file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-gold file:text-black hover:file:bg-gold/80"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
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
                className="rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-gold-light disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg bg-surface-200 px-4 py-2 text-sm text-gray-300 transition hover:bg-surface-50"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl bg-surface-100 ring-1 ring-white/5">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs text-gray-500">
              <th className="px-4 py-3">ปก</th>
              <th className="px-4 py-3">ชื่อเรื่อง</th>
              <th className="px-4 py-3">หมวดหมู่</th>
              <th className="px-4 py-3">สถานะ</th>
              <th className="px-4 py-3">ตอน</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {mangas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-600">
                  ยังไม่มีมังงะ — กดปุ่ม &quot;เพิ่มมังงะ&quot; เพื่อเริ่มต้น
                </td>
              </tr>
            ) : (
              mangas.map((m) => (
                <tr key={m.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-2">
                    <div className="h-12 w-8 overflow-hidden rounded bg-surface-200">
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
                  <td className="px-4 py-2 font-medium text-white">{m.title}</td>
                  <td className="px-4 py-2 text-gray-400">
                    {CATEGORY_LABELS[m.category]}
                  </td>
                  <td className="px-4 py-2 text-gray-400">
                    {STATUS_LABELS[m.status]}
                  </td>
                  <td className="px-4 py-2 text-gray-400">{m.chapter_count ?? 0}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleDelete(m)}
                      className="rounded p-1 text-gray-500 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ImagePlus, Loader2, Pencil, Plus, Sparkles, Trash2, Layers } from "lucide-react";
import type { Chapter, Manga } from "@/lib/types";
import { formatChapterNumber } from "@/lib/utils";
import {
  listAllChapters,
  getMangaList,
  createChapter,
  deleteChapter,
  updateChapter,
} from "@/lib/api";
import { ChapterImageManager } from "./ChapterImageManager";
import Image from "next/image";

export default function AdminChaptersPage() {
  const { getToken } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [selectedMangaId, setSelectedMangaId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [updating, setUpdating] = useState(false);
  const [managingChapter, setManagingChapter] = useState<Chapter | null>(null);

  const selectedManga = mangas.find((m) => m.id === selectedMangaId) || null;
  const filteredChapters = selectedMangaId
    ? chapters
      .filter((ch) => ch.manga_id === selectedMangaId)
      .sort((a, b) => b.number - a.number)
    : [];
  const freeCount = filteredChapters.filter((ch) => ch.is_free).length;
  const paidCount = Math.max(filteredChapters.length - freeCount, 0);

  const fetchData = async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const [chapterData, mangaData] = await Promise.all([
        listAllChapters(token),
        getMangaList({ per_page: 100 }),
      ]);
      setChapters(chapterData);
      setMangas(mangaData.items);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลตอนล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingChapter) return;

    const form = new FormData(e.currentTarget);
    const data = {
      number: Number(form.get("number")),
      title: ((form.get("title") as string) || "").trim(),
      coin_price: Number(form.get("coin_price") || 0),
      is_free: form.has("is_free"),
    };

    setUpdating(true);
    try {
      const token = await getToken();
      if (!token) return;
      await updateChapter(editingChapter.id, data, token);
      setEditingChapter(null);
      setError("");
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "แก้ไขตอนล้มเหลว");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMangaId) {
      setError("กรุณาเลือกมังงะก่อนเพิ่มตอน");
      return;
    }
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const data = {
      number: Number(form.get("number")),
      title: (form.get("title") as string) || "",
      coin_price: Number(form.get("coin_price") || 0),
      is_free: form.has("is_free"),
    };
    try {
      const token = await getToken();
      if (!token) return;
      await createChapter(selectedMangaId, data, token);
      setShowForm(false);
      setError("");
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "สร้างตอนล้มเหลว");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ch: Chapter) => {
    if (!confirm(`ลบตอนที่ ${ch.number}?`)) return;
    try {
      const token = await getToken();
      if (!token) return;
      await deleteChapter(ch.id, token);
      setError("");
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "ลบตอนล้มเหลว");
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
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#1b2130_0%,#151c2d_52%,#10151f_100%)] p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,168,67,0.18),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.14),transparent_46%)]" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-white">
              <Layers className="mr-2 inline-block h-6 w-6 text-gold" />
              ระบบจัดการตอน
            </h1>
            <p className="text-sm text-gray-300">
              มีทั้งหมด {chapters.length} ตอนในระบบ
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1.5 text-xs text-gold">
              <Sparkles className="h-3.5 w-3.5" />
              จัดการชื่อ ราคา และรูปภาพจบในที่เดียว
            </div>
          </div>

          <div className="w-full shrink-0 rounded-xl border border-white/5 bg-black/40 p-5 backdrop-blur-sm sm:w-[340px]">
            <label className="mb-3 block text-sm font-medium tracking-wide text-gray-300">
              เลือกเรื่องที่ต้องการจัดการ
            </label>
            <select
              value={selectedMangaId}
              onChange={(e) => {
                setSelectedMangaId(e.target.value);
                setShowForm(false);
                setError("");
              }}
              className="h-11 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:ring-1 focus:ring-gold/60 focus:outline-none transition"
            >
              <option value="">-- กรุณาเลือกมังงะ --</option>
              {mangas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
            {selectedManga ? (
              <div className="mt-3 flex items-start gap-3 rounded-lg border border-white/5 bg-white/5 p-2.5">
                <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-surface-300 shadow-sm">
                  <Image
                    src={selectedManga.cover_url || "/placeholder.png"}
                    alt={selectedManga.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-xs font-medium text-white line-clamp-1" title={selectedManga.title}>
                    {selectedManga.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-400">กำลังจัดการตอนของเรื่องนี้</p>
                </div>
              </div>
            ) : (
              <p className="mt-2.5 text-[11px] text-gray-500">
                กรุณาเลือกมังงะก่อนที่จะสามารถเพิ่มตอนใหม่ได้
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Stats and Add Button (Only show when selected) */}
      {selectedMangaId ? (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/5 bg-surface-100/50 p-4 ring-1 ring-white/5 transition hover:bg-surface-200/50">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">ตอนทั้งหมดของเรื่องนี้</p>
            <p className="mt-1.5 text-2xl font-semibold text-white">{filteredChapters.length}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-surface-100/50 p-4 ring-1 ring-white/5 transition hover:bg-surface-200/50">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">ตอนฟรี</p>
            <p className="mt-1.5 text-2xl font-semibold text-emerald-300">{freeCount}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-surface-100/50 p-4 ring-1 ring-white/5 transition hover:bg-surface-200/50">
            <p className="text-[11px] uppercase tracking-wide text-gray-500">ตอนเสียเหรียญ</p>
            <p className="mt-1.5 text-2xl font-semibold text-gold">{paidCount}</p>
          </div>
          <div className="flex h-full items-center justify-center">
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex h-full w-full items-center justify-center gap-2 rounded-2xl bg-gold px-4 py-3 text-sm font-semibold text-black shadow-lg shadow-gold/20 transition hover:bg-gold-light"
            >
              <Plus className="h-5 w-5" />
              {showForm ? "ยกเลิกการเพิ่ม" : "เพิ่มตอนใหม่"}
            </button>
          </div>
        </section>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-surface-100/30 p-8 text-center ring-1 ring-white/5">
          <p className="text-sm text-gray-400">กรุณาเลือกมังงะจากเมนูด้านบน เพื่อเรียกดูข้อมูลทั้งหมด</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {editingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-6 backdrop-blur-sm sm:px-6">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#161616] ring-1 ring-white/5 shadow-2xl overflow-hidden">
            <div className="border-b border-white/5 bg-white/[0.02] px-6 py-5">
              <h3 className="text-lg font-bold text-white flex flex-col gap-1">
                <span>แก้ไขตอนที่ {formatChapterNumber(editingChapter.number)}</span>
                <span className="text-xs font-normal text-gold/80 bg-gold/10 w-fit px-2 py-0.5 rounded-full border border-gold/20">
                  {selectedManga?.title || "ไม่ได้เลือกเรื่อง"}
                </span>
              </h3>
            </div>

            <form onSubmit={handleUpdate} className="p-6">
              <div className="grid grid-cols-1 gap-5">
                {/* Row 1: Number & Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">ตอนที่ <span className="text-red-400">*</span></label>
                    <input
                      type="number"
                      name="number"
                      step="0.5"
                      min="0"
                      required
                      defaultValue={editingChapter.number}
                      className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 text-sm text-white transition-colors focus:border-gold/60 focus:bg-black/60 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">ราคา (เหรียญ)</label>
                    <input
                      type="number"
                      name="coin_price"
                      min="0"
                      defaultValue={editingChapter.coin_price || 0}
                      className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 text-sm text-white transition-colors focus:border-gold/60 focus:bg-black/60 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 2: Title */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-400">ชื่อตอน <span className="text-gray-500 font-normal">(ไม่บังคับ)</span></label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={editingChapter.title || ""}
                    placeholder="เช่น: บทเริ่มต้น, ศึกตัดสิน"
                    className="h-11 w-full rounded-xl border border-white/10 bg-black/40 px-3.5 text-sm text-white transition-colors focus:border-gold/60 focus:bg-black/60 focus:outline-none placeholder:text-white/20"
                  />
                </div>

                {/* Row 3: Is Free */}
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04] mt-1">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      name="is_free"
                      defaultChecked={editingChapter.is_free}
                      className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-white/20 bg-black/50 checked:border-gold checked:bg-gold transition-all"
                    />
                    <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 text-black opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">เปิดให้อ่านฟรี</span>
                    <span className="text-xs text-gray-500">ผู้ใช้ไม่ต้องใช้เหรียญเพื่ออ่านตอนนี้</span>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="mt-8 flex items-center justify-end gap-3 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setEditingChapter(null)}
                  className="h-10 rounded-xl px-5 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="h-10 rounded-xl bg-gold px-6 text-sm font-semibold text-black transition-all hover:bg-gold-light disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(212,168,67,0.3)] hover:shadow-[0_0_20px_rgba(212,168,67,0.5)]"
                >
                  {updating ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForm && (
        <section className="rounded-2xl border border-white/10 bg-surface-100/80 p-5 ring-1 ring-white/5">
          <h3 className="mb-4 text-sm font-semibold text-white">
            เพิ่มตอนใหม่ {selectedManga ? `— ${selectedManga.title}` : ""}
          </h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">ตอนที่ *</label>
              <input
                type="number"
                name="number"
                step="0.5"
                min="0"
                required
                className="h-10 w-full rounded-xl border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
                placeholder="1"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">ชื่อตอน</label>
              <input
                type="text"
                name="title"
                className="h-10 w-full rounded-xl border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
                placeholder="ชื่อตอน (ไม่บังคับ)"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">ราคา (เหรียญ)</label>
              <input
                type="number"
                name="coin_price"
                min="0"
                defaultValue={0}
                className="h-10 w-full rounded-xl border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-300">
                <input type="checkbox" name="is_free" defaultChecked className="rounded" />
                ตอนฟรี
              </label>
            </div>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-gold-light disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-white/10 bg-surface-200 px-4 py-2 text-sm text-gray-300 transition hover:border-white/20 hover:bg-surface-50"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-surface-100/80 ring-1 ring-white/5">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs text-gray-500">
              <th className="px-4 py-3">ตอนที่</th>
              <th className="px-4 py-3">ชื่อตอน</th>
              <th className="px-4 py-3">ราคา</th>
              <th className="px-4 py-3">หน้า</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {!selectedMangaId ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-600">
                  กรุณาเลือกมังงะก่อน เพื่อดูและจัดการตอน
                </td>
              </tr>
            ) : filteredChapters.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-600">
                  เรื่องนี้ยังไม่มีตอน — กดปุ่ม “เพิ่มตอน” เพื่อเริ่มต้น
                </td>
              </tr>
            ) : (
              filteredChapters.map((ch) => (
                <tr key={ch.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-4 py-2.5 font-medium text-white">
                    {formatChapterNumber(ch.number)}
                  </td>
                  <td className="px-4 py-2.5 text-gray-300">{ch.title || "—"}</td>
                  <td className="px-4 py-2.5">
                    {ch.is_free ? (
                      <span className="text-emerald-400">ฟรี</span>
                    ) : (
                      <span className="text-gold">{ch.coin_price ?? 0} เหรียญ</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{ch.page_count ?? 0}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => setEditingChapter(ch)}
                      className="mr-2 rounded-md border border-white/10 bg-surface-200 px-2.5 py-1 text-xs text-gray-300 transition hover:border-white/20 hover:text-white"
                    >
                      <Pencil className="mr-1 inline-block h-3 w-3" />
                      แก้ไข
                    </button>
                    <button
                      onClick={() => setManagingChapter(ch)}
                      className="mr-2 rounded-md border border-gold/20 bg-gold/10 px-2.5 py-1 text-xs text-gold transition hover:bg-gold/20"
                    >
                      <ImagePlus className="mr-1 inline-block h-3 w-3" />
                      จัดการภาพ
                    </button>
                    <button
                      onClick={() => handleDelete(ch)}
                      className="rounded-md p-1.5 text-gray-500 transition hover:bg-red-500/10 hover:text-red-300"
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

      {managingChapter && selectedManga && (
        <ChapterImageManager
          manga={selectedManga}
          chapter={managingChapter}
          isOpen={true}
          onClose={() => setManagingChapter(null)}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}

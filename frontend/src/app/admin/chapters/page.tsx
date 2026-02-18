"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Edit, Layers, Loader2, Plus, Trash2 } from "lucide-react";
import type { Chapter, Manga } from "@/lib/types";
import { formatChapterNumber } from "@/lib/utils";
import { listAllChapters, getMangaList, createChapter, deleteChapter } from "@/lib/api";

export default function AdminChaptersPage() {
  const { getToken } = useAuth();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [mangaMap, setMangaMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

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
      const map: Record<string, string> = {};
      mangaData.items.forEach((m) => { map[m.id] = m.title; });
      setMangaMap(map);
      setError("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลตอนล้มเหลว");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const mangaId = form.get("manga_id") as string;
    const data = {
      number: Number(form.get("number")),
      title: (form.get("title") as string) || "",
      coin_price: Number(form.get("coin_price") || 0),
      is_free: form.has("is_free"),
    };
    try {
      const token = await getToken();
      if (!token) return;
      await createChapter(mangaId, data, token);
      setShowForm(false);
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "สร้างตอนล้มเหลว");
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
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "ลบตอนล้มเหลว");
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
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">จัดการตอน</h1>
          <p className="text-sm text-gray-500">
            เพิ่ม แก้ไข หรือลบตอนของมังงะ — {chapters.length} ตอน
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-semibold text-black transition hover:bg-gold-light"
        >
          <Plus className="h-4 w-4" />
          เพิ่มตอน
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-6 rounded-xl bg-surface-100 p-5 ring-1 ring-white/10">
          <h3 className="mb-4 text-sm font-semibold text-white">เพิ่มตอนใหม่</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-gray-400">มังงะ *</label>
              <select
                name="manga_id"
                required
                className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
              >
                <option value="">เลือกมังงะ...</option>
                {mangas.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">ตอนที่ *</label>
              <input
                type="number"
                name="number"
                step="0.5"
                min="0"
                required
                className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
                placeholder="1"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">ชื่อตอน</label>
              <input
                type="text"
                name="title"
                className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
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
                className="h-10 w-full rounded-lg border border-white/10 bg-surface-200 px-3 text-sm text-white focus:border-gold/60 focus:outline-none"
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
        <table className="w-full min-w-[500px] text-sm">
          <thead>
            <tr className="border-b border-white/5 text-left text-xs text-gray-500">
              <th className="px-4 py-3">มังงะ</th>
              <th className="px-4 py-3">ตอนที่</th>
              <th className="px-4 py-3">ชื่อตอน</th>
              <th className="px-4 py-3">ราคา</th>
              <th className="px-4 py-3">หน้า</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {chapters.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-600">
                  ยังไม่มีตอน — สร้างมังงะก่อน แล้วเพิ่มตอนได้ที่นี่
                </td>
              </tr>
            ) : (
              chapters.map((ch) => (
                <tr key={ch.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-2 text-gray-400">{mangaMap[ch.manga_id] || ch.manga_id}</td>
                  <td className="px-4 py-2 font-medium text-white">
                    {formatChapterNumber(ch.number)}
                  </td>
                  <td className="px-4 py-2 text-gray-400">{ch.title || "—"}</td>
                  <td className="px-4 py-2">
                    {ch.is_free ? (
                      <span className="text-emerald-400">ฟรี</span>
                    ) : (
                      <span className="text-gold">{ch.coin_price} เหรียญ</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-gray-400">{ch.page_count ?? 0}</td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleDelete(ch)}
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

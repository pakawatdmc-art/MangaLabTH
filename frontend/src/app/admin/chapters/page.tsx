"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { ImagePlus, Loader2, Pencil, Plus, Sparkles, Trash2, Layers, Clock } from "lucide-react";
import type { Chapter, Manga } from "@/lib/types";
import { formatChapterNumber, parseUTCDate, thaiDatetimeToUTC } from "@/lib/utils";
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
  const [createIsFree, setCreateIsFree] = useState(false);
  const [createCoinPrice, setCreateCoinPrice] = useState(2);
  const [editIsFree, setEditIsFree] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const selectedManga = mangas.find((m) => m.id === selectedMangaId) || null;
  const filteredChapters = selectedMangaId
    ? chapters
      .filter((ch) => ch.manga_id === selectedMangaId)
      .sort((a, b) => b.number - a.number)
    : [];
  const freeCount = filteredChapters.filter((ch) => ch.is_free).length;
  const paidCount = Math.max(filteredChapters.length - freeCount, 0);

  const nextChapterNumber = filteredChapters.length > 0
    ? Math.max(...filteredChapters.map((ch) => ch.number)) + 1
    : 1;

  let defaultUnlocksAt = "";
  const latestChapterWithUnlock = filteredChapters.find(ch => ch.unlocks_at);
  if (latestChapterWithUnlock && latestChapterWithUnlock.unlocks_at) {
      const d = parseUTCDate(latestChapterWithUnlock.unlocks_at);
      // บวก 7 วัน
      d.setDate(d.getDate() + 7);
      // แปลงเป็นเวลาไทย (UTC+7) สำหรับ datetime-local input
      const thaiDate = new Date(d.getTime() + 7 * 60 * 60 * 1000);
      defaultUnlocksAt = thaiDate.toISOString().slice(0, 16);
  }


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
    const unlocksAtStr = form.get("unlocks_at") as string;
    const isFree = form.has("is_free");
    
    // Safely parse date and enforce business rule: only paid chapters have unlock timers
    let unlocksAt = null;
    if (!isFree && unlocksAtStr) {
      try {
        unlocksAt = thaiDatetimeToUTC(unlocksAtStr);
      } catch (err) {
        console.error("Invalid date", err);
      }
    }

    const data = {
      number: Number(form.get("number")),
      title: ((form.get("title") as string) || "").trim(),
      coin_price: Number(form.get("coin_price") || 0),
      is_free: isFree,
      unlocks_at: unlocksAt,
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

  // Refresh countdown every 60 seconds
  useEffect(() => {
    const intv = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(intv);
  }, []);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedMangaId) {
      setError("กรุณาเลือกมังงะก่อนเพิ่มตอน");
      return;
    }
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const unlocksAtStr = form.get("unlocks_at") as string;
    const isFree = form.has("is_free");

    // Safely parse date and enforce business rule
    let unlocksAt = null;
    if (!isFree && unlocksAtStr) {
      try {
        unlocksAt = thaiDatetimeToUTC(unlocksAtStr);
      } catch (err) {
        console.error("Invalid date", err);
      }
    }

    const data = {
      number: Number(form.get("number")),
      title: (form.get("title") as string) || "",
      coin_price: Number(form.get("coin_price") || 0),
      is_free: isFree,
      unlocks_at: unlocksAt,
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
        <Loader2 className="h-8 w-8 animate-spin text-gold-dark" />
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-10">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-xl border border-ink-700/50 bg-ink-800 p-5 sm:p-6 shadow-sm">
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-ink-50">
              <Layers className="mr-2 inline-block h-6 w-6 text-gold-dark" />
              ระบบจัดการตอน
            </h1>
            <p className="text-sm text-ink-400">
              มีทั้งหมด {chapters.length} ตอนในระบบ
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-gold-dark/30 bg-gold-dark/10 px-3 py-1.5 text-xs text-gold font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              จัดการชื่อ ราคา และรูปภาพจบในที่เดียว
            </div>
          </div>

          <div className="w-full shrink-0 rounded-xl border border-ink-700/50 bg-ink-950 p-5 sm:w-[340px]">
            <label className="mb-3 block text-sm font-medium tracking-wide text-ink-300">
              เลือกเรื่องที่ต้องการจัดการ
            </label>
            <select
              value={selectedMangaId}
              onChange={(e) => {
                setSelectedMangaId(e.target.value);
                setShowForm(false);
                setError("");
              }}
              className="h-11 w-full rounded-lg border border-ink-700/50 bg-ink-800 px-3 text-sm text-ink-50 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none transition shadow-sm"
            >
              <option value="">-- กรุณาเลือกมังงะ --</option>
              {[...mangas].reverse().map((m, index) => (
                <option key={m.id} value={m.id}>
                  {index + 1}. {m.title}
                </option>
              ))}
            </select>
            {selectedManga ? (
              <div className="mt-3 flex items-start gap-3 rounded-lg border border-ink-700/50 bg-ink-800 p-2.5 shadow-sm">
                <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded bg-ink-800 border border-ink-700 shadow-sm">
                  <Image
                    src={selectedManga.cover_url || "/placeholder.webp"}
                    alt={selectedManga.title}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <p className="text-xs font-medium text-ink-50 line-clamp-1" title={selectedManga.title}>
                    {selectedManga.title}
                  </p>
                  <p className="mt-0.5 text-[10px] text-ink-400">กำลังจัดการตอนของเรื่องนี้</p>
                </div>
              </div>
            ) : (
              <p className="mt-2.5 text-[11px] text-ink-500">
                กรุณาเลือกมังงะก่อนที่จะสามารถเพิ่มตอนใหม่ได้
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Stats and Add Button (Only show when selected) */}
      {selectedMangaId ? (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-ink-700/50 bg-ink-800 p-4 shadow-sm transition hover:shadow-md">
            <p className="text-[11px] uppercase tracking-wide text-ink-400">ตอนทั้งหมดของเรื่องนี้</p>
            <p className="mt-1.5 text-2xl font-semibold text-ink-50">{filteredChapters.length}</p>
          </div>
          <div className="rounded-xl border border-ink-700/50 bg-ink-800 p-4 shadow-sm transition hover:shadow-md">
            <p className="text-[11px] uppercase tracking-wide text-ink-400">ตอนฟรี</p>
            <p className="mt-1.5 text-2xl font-semibold text-emerald-500">{freeCount}</p>
          </div>
          <div className="rounded-xl border border-ink-700/50 bg-ink-800 p-4 shadow-sm transition hover:shadow-md">
            <p className="text-[11px] uppercase tracking-wide text-ink-400">ตอนเสียเหรียญ</p>
            <p className="mt-1.5 text-2xl font-semibold text-amber-500">{paidCount}</p>
          </div>
          <div className="flex h-full items-center justify-center">
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex h-full w-full items-center justify-center gap-2 rounded-xl bg-gold-dark px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
            >
              <Plus className="h-5 w-5" />
              {showForm ? "ยกเลิกการเพิ่ม" : "เพิ่มตอนใหม่"}
            </button>
          </div>
        </section>
      ) : (
        <div className="rounded-xl border border-ink-700/50 bg-ink-950 p-8 text-center">
          <p className="text-sm text-ink-400">กรุณาเลือกมังงะจากเมนูด้านบน เพื่อเรียกดูข้อมูลทั้งหมด</p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {editingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-md sm:px-6">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-ink-700/50 bg-ink-800 shadow-xl">

            <div className="relative border-b border-ink-800 bg-transparent px-6 py-5">
              <h3 className="flex flex-col gap-1.5 text-lg font-bold tracking-tight text-ink-50">
                <span className="flex items-center gap-2">
                  <Pencil className="h-5 w-5 text-gold-dark" />
                  แก้ไขตอนที่ {formatChapterNumber(editingChapter.number)}
                </span>
                <span className="w-fit rounded-full border border-gold-dark/30 bg-gold-dark/10 px-2.5 py-0.5 text-[11px] font-medium text-gold">
                  กำลังจัดการ: {selectedManga?.title || "ไม่ได้เลือกเรื่อง"}
                </span>
              </h3>
            </div>

            <form onSubmit={handleUpdate} className="relative p-6">
              <div className="grid grid-cols-1 gap-5">
                {/* Row 1: Number & Price */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium tracking-wide text-ink-300">ตอนที่ <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      name="number"
                      step="0.5"
                      min="0"
                      required
                      defaultValue={editingChapter.number}
                      className="h-11 w-full rounded-xl border border-ink-700/50 bg-ink-950 px-3.5 text-sm font-medium text-ink-50 transition focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium tracking-wide text-ink-300">ราคา <span className="text-ink-500">(เหรียญ)</span></label>
                    <input
                      type="number"
                      name="coin_price"
                      min="0"
                      defaultValue={editingChapter.coin_price || 0}
                      className="h-11 w-full rounded-xl border border-ink-700/50 bg-ink-950 px-3.5 text-sm font-medium text-ink-50 transition focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
                    />
                  </div>
                </div>

                {/* Row 2: Title */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium tracking-wide text-ink-300">ชื่อตอน <span className="font-normal text-ink-500">(ไม่บังคับ)</span></label>
                  <input
                    type="text"
                    name="title"
                    defaultValue={editingChapter.title || ""}
                    placeholder="เช่น: บทเริ่มต้น, ศึกตัดสิน"
                    className="h-11 w-full rounded-xl border border-ink-700/50 bg-ink-950 px-3.5 text-sm text-ink-50 transition placeholder:text-ink-600 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
                  />
                </div>

                {/* Row 3: Is Free */}
                <div className="mt-2 rounded-xl border border-ink-700/50 bg-ink-950 p-4 transition-colors">
                  <label className="flex cursor-pointer items-center gap-3">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        name="is_free"
                        checked={editIsFree}
                        onChange={(e) => setEditIsFree(e.target.checked)}
                        className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-ink-700 bg-ink-900 transition-all checked:border-gold-dark checked:bg-gold-dark"
                      />
                      <svg className="pointer-events-none absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-ink-50">เปิดให้อ่านฟรี</span>
                      <span className="text-xs text-ink-400">ผู้อ่านไม่ต้องใช้เหรียญเพื่ออ่านตอนนี้</span>
                    </div>
                  </label>

                  {!editIsFree && (
                    <div className="mt-4 border-t border-ink-800 pt-4">
                      <label className="mb-2 block text-xs font-medium tracking-wide text-ink-300">
                        ตั้งเวลาเปิดให้อ่านฟรีอัตโนมัติ <span className="font-normal text-ink-500">(ถ้ามี)</span>
                      </label>
                      <input
                        type="datetime-local"
                        name="unlocks_at"
                        defaultValue={
                           editingChapter.unlocks_at
                            ? (() => {
                                const d = parseUTCDate(editingChapter.unlocks_at);
                                // แปลงเป็นเวลาไทย (UTC+7) สำหรับ datetime-local input
                                const thaiDate = new Date(d.getTime() + 7 * 60 * 60 * 1000);
                                return thaiDate.toISOString().slice(0, 16);
                              })()
                            : ""
                        }
                        className="h-11 w-full rounded-xl border border-ink-700/50 bg-ink-800 px-3.5 text-sm font-medium text-ink-50 transition focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none [&::-webkit-calendar-picker-indicator]:bg-transparent [&::-webkit-calendar-picker-indicator]:p-1 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-8 flex items-center justify-end gap-3 pt-6 border-t border-ink-800">
                <button
                  type="button"
                  onClick={() => setEditingChapter(null)}
                  className="h-10 rounded-xl px-5 text-sm font-medium text-ink-300 transition hover:bg-ink-800 hover:text-ink-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="h-10 rounded-xl bg-gold-dark px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updating ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showForm && (
        <section className="rounded-xl border border-ink-700/50 bg-ink-800 p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-ink-50">
            เพิ่มตอนใหม่ {selectedManga ? `— ${selectedManga.title}` : ""}
          </h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-300">ตอนที่ *</label>
              <input
                type="number"
                key={`manga-${selectedMangaId}-next-${nextChapterNumber}`}
                name="number"
                step="0.5"
                min="0"
                required
                defaultValue={nextChapterNumber}
                className="h-10 w-full rounded-xl border border-ink-700/50 bg-ink-950 px-3 text-sm text-ink-50 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
                placeholder="1"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-300">ชื่อตอน</label>
              <input
                type="text"
                name="title"
                className="h-10 w-full rounded-xl border border-ink-700/50 bg-ink-950 px-3 text-sm text-ink-50 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none"
                placeholder="ชื่อตอน (ไม่บังคับ)"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-300">ราคา (เหรียญ)</label>
              <input
                type="number"
                name="coin_price"
                min="0"
                value={createIsFree ? 0 : createCoinPrice}
                onChange={(e) => setCreateCoinPrice(Number(e.target.value))}
                disabled={createIsFree}
                className="h-10 w-full rounded-xl border border-ink-700/50 bg-ink-950 px-3 text-sm text-ink-50 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none disabled:opacity-50 disabled:bg-ink-800 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-ink-300">
                <input
                  type="checkbox"
                  name="is_free"
                  checked={createIsFree}
                  onChange={(e) => setCreateIsFree(e.target.checked)}
                  className="rounded border-ink-700 bg-ink-950 text-gold focus:ring-gold"
                />
                ตอนฟรี
              </label>
            </div>
            
            {!createIsFree && (
              <div className="col-span-1 sm:col-span-3 border-t border-ink-800 pt-3">
                 <label className="mb-2 block text-xs font-medium text-ink-300">ตั้งเวลาเปิดให้อ่านฟรีอัตโนมัติ (ไม่บังคับ)</label>
                 <input
                   type="datetime-local"
                   key={`unlock-${selectedMangaId}-${defaultUnlocksAt}`}
                   name="unlocks_at"
                   defaultValue={defaultUnlocksAt}
                   className="h-10 w-full sm:w-1/3 rounded-xl border border-ink-700/50 bg-ink-950 px-3 text-sm text-ink-50 focus:border-gold focus:ring-1 focus:ring-gold focus:outline-none [&::-webkit-calendar-picker-indicator]:bg-transparent [&::-webkit-calendar-picker-indicator]:p-1 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                 />
              </div>
            )}
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-gold-dark px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-600 shadow-sm disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-ink-700/50 bg-ink-950 px-4 py-2 text-sm font-medium text-ink-300 shadow-sm transition hover:bg-ink-800"
              >
                ยกเลิก
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="overflow-x-auto rounded-xl border border-ink-700/50 bg-ink-800 shadow-sm">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-ink-700/50 bg-ink-950 text-left text-xs text-ink-400 font-medium">
              <th className="px-4 py-3">ตอนที่</th>
              <th className="px-4 py-3">ชื่อตอน</th>
              <th className="px-4 py-3">ราคา</th>
              <th className="px-4 py-3">หน้า</th>
              <th className="px-4 py-3">อัปเดตเมื่อ</th>
              <th className="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-800/50">
            {!selectedMangaId ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ink-500">
                  กรุณาเลือกมังงะก่อน เพื่อดูและจัดการตอน
                </td>
              </tr>
            ) : filteredChapters.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-ink-500">
                  เรื่องนี้ยังไม่มีตอน — กดปุ่ม “เพิ่มตอน” เพื่อเริ่มต้น
                </td>
              </tr>
            ) : (
              filteredChapters.map((ch) => {
                let unlockText = null;
                if (!ch.is_free && ch.unlocks_at) {
                    const unlocksAt = parseUTCDate(ch.unlocks_at);
                    if (unlocksAt > now) {
                        const diffMs = unlocksAt.getTime() - now.getTime();
                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                        
                        if (diffDays > 0) {
                            unlockText = `อ่านฟรีในอีก ${diffDays} วัน ${diffHours} ชั่วโมง ${diffMins} นาที`;
                        } else if (diffHours > 0) {
                            unlockText = `อ่านฟรีในอีก ${diffHours} ชั่วโมง ${diffMins} นาที`;
                        } else {
                            unlockText = `อ่านฟรีในอีก ${diffMins} นาที`;
                        }
                    } else {
                        unlockText = `ฟรีแล้ว (รีเฟรชอัปเดต)`;
                    }
                }

                return (
                <tr key={ch.id} className="hover:bg-ink-800/50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-ink-50">
                    {formatChapterNumber(ch.number)}
                  </td>
                  <td className="px-4 py-2.5 text-ink-300">{ch.title || "—"}</td>
                  <td className="px-4 py-2.5">
                    {ch.is_free ? (
                      <span className="text-emerald-500 font-medium">ฟรี</span>
                    ) : (
                      <span className="text-gold-dark font-medium">{ch.coin_price ?? 0} เหรียญ</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-ink-400">{ch.page_count ?? 0}</td>
                  <td className="px-4 py-2.5 text-xs text-ink-400">
                    {ch.published_at
                      ? parseUTCDate(ch.published_at).toLocaleDateString("th-TH", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Bangkok",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    {unlockText && (
                        <span 
                            title={`ปลดล็อกให้อ่านฟรีวันที่ ${parseUTCDate(ch.unlocks_at!).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}`}
                            className="mr-3 inline-flex items-center gap-1 rounded-full bg-gold-dark/10 px-2 py-0.5 text-[11px] text-gold border border-gold-dark/30"
                        >
                            <Clock className="h-3 w-3" />
                            {unlockText}
                        </span>
                    )}
                    <button
                      onClick={() => {
                        setEditingChapter(ch);
                        setEditIsFree(ch.is_free);
                      }}
                      className="mr-2 rounded-md border border-ink-700 bg-ink-800 px-2.5 py-1 text-xs text-ink-300 transition hover:bg-ink-700 hover:text-ink-50"
                    >
                      <Pencil className="mr-1 inline-block h-3 w-3" />
                      แก้ไข
                    </button>
                    <button
                      onClick={() => setManagingChapter(ch)}
                      className="mr-2 rounded-md border border-gold-dark/40 bg-gold-dark/10 px-2.5 py-1 text-xs text-gold transition hover:bg-gold-dark/20"
                    >
                      <ImagePlus className="mr-1 inline-block h-3 w-3" />
                      จัดการภาพ
                    </button>
                    <button
                      onClick={() => handleDelete(ch)}
                      className="rounded-md p-1.5 text-ink-500 transition hover:bg-red-900/30 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              )
            })
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

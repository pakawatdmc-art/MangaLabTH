import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("th-TH").format(n);
}

/**
 * แปลง datetime string จาก Backend (UTC naive เช่น "2026-04-15T10:00:00")
 * → Date object ที่ถูกต้อง โดยปลอดภัยจาก double-Z
 */
export function parseUTCDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  // ถ้ามี timezone info อยู่แล้ว (Z, +00:00, etc.) → ใช้ตรงๆ
  if (dateStr.endsWith("Z") || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  // Backend ส่ง naive UTC → append "Z" เพื่อบอก browser ว่าเป็น UTC
  return new Date(dateStr + "Z");
}

export function formatDate(dateStr: string): string {
  return parseUTCDate(dateStr).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
}

export function formatDateTime(dateStr: string): string {
  return parseUTCDate(dateStr).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Bangkok",
  });
}

export function formatChapterNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * แปลง datetime-local input (ซึ่ง Admin ใส่เป็นเวลาไทย UTC+7 เสมอ) → UTC ISO string
 * ใช้แทน new Date(localStr).toISOString() ที่พึ่ง browser timezone
 *
 * ตัวอย่าง: "2026-04-15T17:00" (5โมงเย็นไทย) → "2026-04-15T10:00:00.000Z" (UTC)
 */
export function thaiDatetimeToUTC(localStr: string): string {
  // Append +07:00 เพื่อบอก JavaScript ว่า input นี้คือเวลาไทย (UTC+7)
  const thaiIso = localStr + ":00+07:00";
  return new Date(thaiIso).toISOString();
}

/**
 * สร้าง URL slug ที่เหมาะสำหรับ SEO — รองรับภาษาไทย + อังกฤษ
 *
 * Google รองรับ Thai characters ใน URL ได้เต็มรูปแบบ
 * และแสดงผลใน SERPs เป็นภาษาไทยอ่านง่าย (ไม่ encode เป็น %xx)
 *
 * ตัวอย่าง:
 *   "Solo Leveling ตอนที่ 1"  → "solo-leveling-ตอนที่-1"
 *   "วัน พีซ — ภาค Wano!!"  → "วัน-พีซ-ภาค-wano"
 *   "  ดาบ  พิฆาต อสูร  "   → "ดาบ-พิฆาต-อสูร"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    // อนุญาตเฉพาะ: a-z, 0-9, อักขระไทย (U+0E00–U+0E7F), ช่องว่าง, ขีด
    .replace(/[^a-z0-9\u0E00-\u0E7F\s-]/g, "")
    // แปลงช่องว่าง/underscore เป็น hyphen
    .replace(/[\s_]+/g, "-")
    // รวม hyphen ซ้อนให้เหลือตัวเดียว
    .replace(/-{2,}/g, "-")
    // ตัด hyphen หัว-ท้าย
    .replace(/^-+|-+$/g, "");
}


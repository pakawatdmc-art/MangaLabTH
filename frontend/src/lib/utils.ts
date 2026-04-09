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

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


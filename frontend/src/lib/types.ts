/* ── Shared TypeScript types mirroring backend schemas ── */

// Enums
export type MangaCategory =
  | "action" | "romance" | "comedy" | "drama" | "fantasy"
  | "horror" | "slice_of_life" | "isekai" | "school" | "sci_fi" | "other";

export type MangaStatus = "ongoing" | "completed" | "hiatus" | "dropped";
export type UserRole = "reader" | "admin";
export type TransactionType = "coin_purchase" | "chapter_unlock" | "admin_grant" | "refund";

// Label maps (Thai)
export const CATEGORY_LABELS: Record<MangaCategory, string> = {
  action: "แอ็คชั่น",
  romance: "โรแมนซ์",
  comedy: "คอมเมดี้",
  drama: "ดราม่า",
  fantasy: "แฟนตาซี",
  horror: "สยองขวัญ",
  slice_of_life: "ชีวิตประจำวัน",
  isekai: "อิเซไก",
  school: "โรงเรียน",
  sci_fi: "ไซไฟ",
  other: "อื่นๆ",
};

export const STATUS_LABELS: Record<MangaStatus, string> = {
  ongoing: "กำลังอัปเดต",
  completed: "จบแล้ว",
  hiatus: "พักชั่วคราว",
  dropped: "หยุดอัปเดต",
};

// Models
export interface User {
  id: string;
  clerk_id: string;
  email: string;
  display_name: string;
  avatar_url: string;
  role: UserRole;
  coin_balance: number;
  created_at: string;
}

export interface Manga {
  id: string;
  title: string;
  slug: string;
  description: string;
  author: string;
  artist: string;
  category: MangaCategory;
  status: MangaStatus;
  cover_url: string;
  is_featured: boolean;
  total_views: number;
  chapter_count?: number;
  created_at: string;
}

export interface Chapter {
  id: string;
  manga_id: string;
  number: number;
  title: string;
  coin_price: number;
  is_free: boolean;
  total_views: number;
  published_at: string;
  page_count?: number;
}

export interface Page {
  id: string;
  number: number;
  image_url: string;
  width: number;
  height: number;
}

export interface ChapterDetail extends Chapter {
  pages: Page[];
}

export interface MangaDetail extends Manga {
  chapters: Chapter[];
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  balance_after: number;
  chapter_id?: string;
  stripe_payment_intent_id?: string;
  note: string;
  created_at: string;
}

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  price_thb: number;
  stripe_price_id: string;
  is_active: boolean;
  sort_order: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

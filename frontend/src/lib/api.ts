/* ── API client for FastAPI backend ── */

import type {
  Manga,
  MangaDetail,
  MangaCategory,
  MangaStatus,
  Chapter,
  ChapterDetail,
  PaginatedResponse,
  User,
  Transaction,
  CoinPackage,
} from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

async function fetcher<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const { token, ...init } = options || {};
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API}${path}`, { ...init, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `API error ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Manga ───────────────────────────────────────

export async function getMangaList(params?: {
  page?: number;
  per_page?: number;
  category?: MangaCategory;
  status?: MangaStatus;
  q?: string;
  sort?: string;
}) {
  const sp = new URLSearchParams();
  if (params?.page) sp.set("page", String(params.page));
  if (params?.per_page) sp.set("per_page", String(params.per_page));
  if (params?.category) sp.set("category", params.category);
  if (params?.status) sp.set("status", params.status);
  if (params?.q) sp.set("q", params.q);
  if (params?.sort) sp.set("sort", params.sort);
  const qs = sp.toString();
  return fetcher<PaginatedResponse<Manga>>(`/manga${qs ? `?${qs}` : ""}`);
}

export async function getManga(id: string) {
  return fetcher<MangaDetail>(`/manga/${id}`);
}

export async function getMangaBySlug(slug: string) {
  return fetcher<MangaDetail>(`/manga/slug/${slug}`);
}

// ── Chapters ────────────────────────────────────

export async function getChapters(mangaId: string) {
  return fetcher<Chapter[]>(`/chapters/manga/${mangaId}`);
}

export async function getChapter(chapterId: string) {
  return fetcher<ChapterDetail>(`/chapters/${chapterId}`);
}

// ── User ────────────────────────────────────────

export async function getMe(token: string) {
  return fetcher<User>("/users/me", { token });
}

// ── Transactions ────────────────────────────────

export async function unlockChapter(chapterId: string, token: string) {
  return fetcher<{ success: boolean; new_balance: number; transaction_id: string }>(
    "/transactions/unlock",
    { method: "POST", body: JSON.stringify({ chapter_id: chapterId }), token }
  );
}

export async function getMyTransactions(token: string, limit = 50) {
  return fetcher<Transaction[]>(`/transactions/me?limit=${limit}`, { token });
}

// ── Admin ───────────────────────────────────────

export async function createManga(data: Partial<Manga>, token: string) {
  return fetcher<Manga>("/manga", { method: "POST", body: JSON.stringify(data), token });
}

export async function updateManga(id: string, data: Partial<Manga>, token: string) {
  return fetcher<Manga>(`/manga/${id}`, { method: "PATCH", body: JSON.stringify(data), token });
}

export async function deleteManga(id: string, token: string) {
  return fetcher<void>(`/manga/${id}`, { method: "DELETE", token });
}

export async function createChapter(
  mangaId: string,
  data: { number: number; title?: string; coin_price?: number; is_free?: boolean },
  token: string
) {
  return fetcher<Chapter>(`/chapters/manga/${mangaId}`, {
    method: "POST",
    body: JSON.stringify(data),
    token,
  });
}

export async function deleteChapter(id: string, token: string) {
  return fetcher<void>(`/chapters/${id}`, { method: "DELETE", token });
}

export async function addPages(
  chapterId: string,
  pages: { number: number; image_url: string; width: number; height: number }[],
  token: string
) {
  return fetcher(`/chapters/${chapterId}/pages`, {
    method: "POST",
    body: JSON.stringify(pages),
    token,
  });
}

export async function adminGrantCoins(
  userId: string,
  amount: number,
  note: string,
  token: string
) {
  return fetcher<Transaction>("/transactions/admin/grant", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, amount, note }),
    token,
  });
}

export async function listUsers(token: string) {
  return fetcher<User[]>("/users", { token });
}
